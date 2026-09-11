import { Category, type CategoryDocument, type ICategory } from "../models/Category.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/AppError.js";
import type {
  CreateCategoryInput,
  ReorderCategoriesInput,
  UpdateCategoryInput,
} from "../validators/categoryValidators.js";

export async function listPublicCategories(): Promise<CategoryDocument[]> {
  return Category.find({ isActive: true }).sort({ order: 1, name: 1 });
}

export async function listAllCategories(includeInactive: boolean): Promise<CategoryDocument[]> {
  const filter = includeInactive ? {} : { isActive: true };
  return Category.find(filter).sort({ order: 1, name: 1 });
}

export async function getCategoryById(id: string): Promise<CategoryDocument> {
  const category = await Category.findById(id);
  if (!category) throw new NotFoundError("Categoría no encontrada");
  return category;
}

export async function getPublicCategoryBySlug(slug: string): Promise<CategoryDocument> {
  const category = await Category.findOne({ slug, isActive: true });
  if (!category) throw new NotFoundError("Categoría no encontrada");
  return category;
}

async function assertParentExists(parentId: string): Promise<void> {
  const exists = await Category.exists({ _id: parentId });
  if (!exists) throw new NotFoundError("Categoría padre no encontrada");
}

/** Recorre hacia la raíz desde `newParentId`: si encuentra `categoryId`, hay un ciclo. */
async function assertNoCycle(categoryId: string, newParentId: string): Promise<void> {
  if (categoryId === newParentId) {
    throw new BadRequestError("Una categoría no puede ser su propia categoría padre");
  }

  let currentId: string | null = newParentId;
  while (currentId) {
    const current: Pick<ICategory, "parent"> | null = await Category.findById(currentId)
      .select("parent")
      .lean();
    if (!current?.parent) break;
    if (current.parent.toString() === categoryId) {
      throw new BadRequestError("La categoría padre no puede ser una subcategoría de sí misma");
    }
    currentId = current.parent.toString();
  }
}

export async function createCategory(input: CreateCategoryInput): Promise<CategoryDocument> {
  if (input.parent) {
    await assertParentExists(input.parent);
  }
  return Category.create(input);
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryDocument> {
  const category = await getCategoryById(id);

  if (input.parent !== undefined && input.parent !== null) {
    await assertParentExists(input.parent);
    await assertNoCycle(id, input.parent);
  }

  Object.assign(category, input);
  await category.save();
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await getCategoryById(id);

  const hasChildren = await Category.exists({ parent: category._id });
  if (hasChildren) {
    throw new ConflictError("No se puede eliminar una categoría que tiene subcategorías");
  }

  await category.deleteOne();
}

export async function reorderCategories(input: ReorderCategoriesInput): Promise<void> {
  await Category.bulkWrite(
    input.items.map(({ id, order }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order } } },
    })),
  );
}

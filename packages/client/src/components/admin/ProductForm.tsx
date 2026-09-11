import { useState, type FormEvent } from "react";
import { ProductImagesEditor } from "@/components/admin/ProductImagesEditor";
import { ProductVariantsEditor } from "@/components/admin/ProductVariantsEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useAdminCategories } from "@/hooks/admin/useAdminCategories";
import { ApiError } from "@/lib/apiClient";
import type { ProductInput } from "@/lib/adminProductsApi";

interface ProductFormProps {
  initialValue?: Partial<ProductInput>;
  onSubmit: (input: ProductInput) => Promise<void>;
  submitLabel?: string;
}

function toValues(initial?: Partial<ProductInput>): ProductInput {
  return {
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "",
    brand: initial?.brand ?? "",
    tags: initial?.tags ?? [],
    isActive: initial?.isActive ?? true,
    isFeatured: initial?.isFeatured ?? false,
    images: initial?.images ?? [],
    variants: initial?.variants ?? [
      { sku: "", attributeName: "", attributeValue: "", price: 0, costPrice: 0, stock: 0, lowStockThreshold: 0 },
    ],
  };
}

export function ProductForm({ initialValue, onSubmit, submitLabel = "Guardar producto" }: ProductFormProps) {
  const { categories } = useAdminCategories();
  const [values, setValues] = useState<ProductInput>(() => toValues(initialValue));
  const [tagsText, setTagsText] = useState(() => (initialValue?.tags ?? []).join(", "));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await onSubmit({ ...values, tags, slug: values.slug || undefined });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar el producto");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" required value={values.name} onChange={(e) => set("name", e.target.value)} />
        <Input
          label="Slug (opcional)"
          hint="Se genera automáticamente a partir del nombre si lo dejás vacío"
          value={values.slug}
          onChange={(e) => set("slug", e.target.value)}
        />
      </div>

      <Textarea
        label="Descripción"
        value={values.description}
        onChange={(e) => set("description", e.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Categoría"
          required
          value={values.category}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="">Seleccionar…</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Input label="Marca (opcional)" value={values.brand} onChange={(e) => set("brand", e.target.value)} />
      </div>

      <Input
        label="Tags (separados por coma)"
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
      />

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="size-4 rounded border-border accent-accent"
          />
          Producto activo (visible en la tienda)
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={values.isFeatured}
            onChange={(e) => set("isFeatured", e.target.checked)}
            className="size-4 rounded border-border accent-accent"
          />
          Destacado
        </label>
      </div>

      <ProductImagesEditor images={values.images} onChange={(images) => set("images", images)} />
      <ProductVariantsEditor variants={values.variants} onChange={(variants) => set("variants", variants)} />

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      <div>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

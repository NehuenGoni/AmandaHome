import type { Category } from "@amanda/shared";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ApiError } from "@/lib/apiClient";
import type { CategoryInput } from "@/lib/adminCategoriesApi";

interface CategoryFormProps {
  categories: Category[];
  initialValue?: Category;
  onSubmit: (input: CategoryInput) => Promise<void>;
  onCancel: () => void;
}

export function CategoryForm({ categories, initialValue, onSubmit, onCancel }: CategoryFormProps) {
  const [values, setValues] = useState<CategoryInput>({
    name: initialValue?.name ?? "",
    slug: initialValue?.slug ?? "",
    description: initialValue?.description ?? "",
    image: initialValue?.image ?? "",
    parent: initialValue?.parent ?? null,
    isActive: initialValue?.isActive ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CategoryInput>(key: K, value: CategoryInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...values,
        slug: values.slug || undefined,
        image: values.image || undefined,
        parent: values.parent || null,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la categoría");
    } finally {
      setIsSubmitting(false);
    }
  }

  const parentOptions = categories.filter((c) => c._id !== initialValue?._id);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Nombre" required value={values.name} onChange={(e) => set("name", e.target.value)} />
      <Input
        label="Slug (opcional)"
        hint="Se genera automáticamente a partir del nombre si lo dejás vacío"
        value={values.slug}
        onChange={(e) => set("slug", e.target.value)}
      />
      <Textarea
        label="Descripción (opcional)"
        value={values.description}
        onChange={(e) => set("description", e.target.value)}
      />
      <Input
        label="URL de imagen (opcional)"
        value={values.image}
        onChange={(e) => set("image", e.target.value)}
      />
      <Select
        label="Categoría padre (opcional)"
        value={values.parent ?? ""}
        onChange={(e) => set("parent", e.target.value || null)}
      >
        <option value="">Ninguna</option>
        {parentOptions.map((category) => (
          <option key={category._id} value={category._id}>
            {category.name}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          className="size-4 rounded border-border accent-accent"
        />
        Categoría activa (visible en la tienda)
      </label>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Guardar categoría
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

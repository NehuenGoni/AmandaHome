import type { Category } from "@amanda/shared";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Spinner } from "@/components/ui/Spinner";
import { useAdminCategories } from "@/hooks/admin/useAdminCategories";
import { ApiError } from "@/lib/apiClient";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
  type CategoryInput,
} from "@/lib/adminCategoriesApi";

export default function AdminCategories() {
  const { categories, isLoading, error, reload } = useAdminCategories();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const sorted = [...categories].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  async function handleSubmit(input: CategoryInput) {
    if (editing && editing !== "new") {
      await updateCategory(editing._id, input);
    } else {
      await createCategory({ ...input, order: sorted.length });
    }
    setEditing(null);
    reload();
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteCategory(pendingDelete._id);
      setPendingDelete(null);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No pudimos eliminar la categoría");
    } finally {
      setIsDeleting(false);
    }
  }

  async function move(category: Category, direction: -1 | 1) {
    const index = sorted.findIndex((c) => c._id === category._id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const target = sorted[targetIndex] as Category;
    setActionError(null);
    try {
      await reorderCategories([
        { id: category._id, order: targetIndex },
        { id: target._id, order: index },
      ]);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "No pudimos reordenar las categorías");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-text">Categorías</h1>
        {editing === null && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Nueva categoría
          </Button>
        )}
      </div>

      <AnimatePresence>
        {editing !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <Card>
              <p className="mb-4 font-display text-lg text-text">
                {editing === "new" ? "Nueva categoría" : `Editar "${editing.name}"`}
              </p>
              <CategoryForm
                categories={categories}
                initialValue={editing === "new" ? undefined : editing}
                onSubmit={handleSubmit}
                onCancel={() => setEditing(null)}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {(error || actionError) && <InlineMessage tone="error">{error ?? actionError}</InlineMessage>}

      {isLoading ? (
        <Spinner />
      ) : sorted.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {sorted.map((category, index) => (
            <div key={category._id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(category, -1)}
                    aria-label="Subir"
                    className="flex size-5 items-center justify-center text-text-muted hover:text-text disabled:opacity-30"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === sorted.length - 1}
                    onClick={() => move(category, 1)}
                    aria-label="Bajar"
                    className="flex size-5 items-center justify-center text-text-muted hover:text-text disabled:opacity-30"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{category.name}</p>
                  {category.parent && <p className="text-xs text-text-muted">Subcategoría</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!category.isActive && <Badge tone="neutral">Inactiva</Badge>}
                <button
                  type="button"
                  onClick={() => setEditing(category)}
                  aria-label={`Editar ${category.name}`}
                  className="flex size-8 items-center justify-center rounded-full text-text hover:bg-surface-alt"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(category)}
                  aria-label={`Eliminar ${category.name}`}
                  className="flex size-8 items-center justify-center rounded-full text-accent2-deep hover:bg-surface-alt"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Tags} title="No hay categorías" description="Creá la primera para organizar tu catálogo." />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`¿Eliminar "${pendingDelete?.name}"?`}
        description="Esta acción no se puede deshacer. No se puede eliminar una categoría con subcategorías."
        confirmLabel="Eliminar"
        tone="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

import { formatMoney } from "@amanda/shared";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ProductVariantPicker, type VariantSelection } from "@/components/admin/ProductVariantPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Textarea } from "@/components/ui/Textarea";
import { ApiError } from "@/lib/apiClient";
import { createSupplierPurchase, type SupplierPurchaseItemInput } from "@/lib/supplierPurchasesApi";

interface ItemRow {
  selection: VariantSelection | null;
  quantity: number;
  unitCost: number;
}

function emptyRow(): ItemRow {
  return { selection: null, quantity: 1, unitCost: 0 };
}

export function SupplierPurchaseForm({ onCreated }: { onCreated: () => void }) {
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = rows.reduce((sum, row) => sum + row.quantity * row.unitCost, 0);

  function updateRow(index: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const items: SupplierPurchaseItemInput[] = [];
    for (const row of rows) {
      if (!row.selection) {
        setError("Completá todos los ítems de la compra");
        return;
      }
      items.push({
        productId: row.selection.product._id,
        variantSku: row.selection.variant.sku,
        quantity: row.quantity,
        unitCost: row.unitCost,
      });
    }
    if (items.length === 0) {
      setError("Agregá al menos un ítem");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createSupplierPurchase({ supplierName, items, notes: notes || undefined });
      setSupplierName("");
      setNotes("");
      setRows([emptyRow()]);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos registrar la compra");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input label="Proveedor" required value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text">Ítems</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => setRows((prev) => [...prev, emptyRow()])}>
            <Plus className="size-4" /> Agregar ítem
          </Button>
        </div>

        {rows.map((row, index) => (
          <Card key={index} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted">Ítem {index + 1}</p>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label="Quitar ítem"
                  className="flex size-8 items-center justify-center rounded-full text-accent2-deep hover:bg-surface-alt"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <ProductVariantPicker
              value={row.selection}
              onChange={(selection) => updateRow(index, { selection })}
              onClear={() => updateRow(index, { selection: null })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cantidad"
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) => updateRow(index, { quantity: Number(e.target.value) })}
              />
              <MoneyInput
                label="Costo unitario"
                value={row.unitCost}
                onChange={(cents) => updateRow(index, { unitCost: cents })}
              />
            </div>
          </Card>
        ))}
      </div>

      <Textarea label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <p className="text-sm font-medium text-text">Total: {formatMoney(total)}</p>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      <div>
        <Button type="submit" isLoading={isSubmitting}>
          Registrar compra
        </Button>
      </div>
    </form>
  );
}

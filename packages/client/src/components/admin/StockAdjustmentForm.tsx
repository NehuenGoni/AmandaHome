import { useState, type FormEvent } from "react";
import { ProductVariantPicker, type VariantSelection } from "@/components/admin/ProductVariantPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Textarea } from "@/components/ui/Textarea";
import { adjustStock } from "@/lib/inventoryApi";
import { ApiError } from "@/lib/apiClient";

export function StockAdjustmentForm({ onAdjusted }: { onAdjusted: () => void }) {
  const [selection, setSelection] = useState<VariantSelection | null>(null);
  const [quantityChange, setQuantityChange] = useState(0);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selection || quantityChange === 0) {
      setError("Elegí un producto y un ajuste distinto de 0");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await adjustStock({
        productId: selection.product._id,
        variantSku: selection.variant.sku,
        quantityChange,
        note: note || undefined,
      });
      setSelection(null);
      setQuantityChange(0);
      setNote("");
      setSuccess(true);
      onAdjusted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos ajustar el stock");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ProductVariantPicker value={selection} onChange={setSelection} onClear={() => setSelection(null)} />
      <Input
        label="Ajuste (positivo suma, negativo resta)"
        type="number"
        value={quantityChange}
        onChange={(e) => setQuantityChange(Number(e.target.value))}
      />
      <Textarea label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />

      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      {success && <InlineMessage tone="success">Stock ajustado correctamente.</InlineMessage>}

      <div>
        <Button type="submit" isLoading={isSubmitting}>
          Registrar ajuste
        </Button>
      </div>
    </form>
  );
}

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import type { ProductVariantInput } from "@/lib/adminProductsApi";

function emptyVariant(): ProductVariantInput {
  return {
    sku: "",
    attributeName: "",
    attributeValue: "",
    price: 0,
    costPrice: 0,
    stock: 0,
    lowStockThreshold: 0,
  };
}

interface ProductVariantsEditorProps {
  variants: ProductVariantInput[];
  onChange: (variants: ProductVariantInput[]) => void;
}

export function ProductVariantsEditor({ variants, onChange }: ProductVariantsEditorProps) {
  function update(index: number, patch: Partial<ProductVariantInput>) {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function remove(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...variants, emptyVariant()]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text">Variantes</p>
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus className="size-4" /> Agregar variante
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {variants.map((variant, index) => (
          <Card key={index} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted">Variante {index + 1}</p>
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="Quitar variante"
                  className="flex size-8 items-center justify-center rounded-full text-accent2-deep hover:bg-surface-alt"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="SKU"
                required
                value={variant.sku}
                onChange={(e) => update(index, { sku: e.target.value })}
              />
              <Input
                label="Atributo"
                placeholder="Color, Tamaño…"
                required
                value={variant.attributeName}
                onChange={(e) => update(index, { attributeName: e.target.value })}
              />
              <Input
                label="Valor del atributo"
                placeholder="Verde, Grande…"
                required
                value={variant.attributeValue}
                onChange={(e) => update(index, { attributeValue: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <MoneyInput
                label="Precio de venta"
                value={variant.price}
                onChange={(cents) => update(index, { price: cents })}
              />
              <MoneyInput
                label="Costo"
                value={variant.costPrice}
                onChange={(cents) => update(index, { costPrice: cents })}
              />
              <Input
                label="Stock"
                type="number"
                min={0}
                value={variant.stock}
                onChange={(e) => update(index, { stock: Number(e.target.value) })}
              />
              <Input
                label="Alerta de stock bajo"
                type="number"
                min={0}
                value={variant.lowStockThreshold}
                onChange={(e) => update(index, { lowStockThreshold: Number(e.target.value) })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Peso en gramos (opcional)"
                type="number"
                min={0}
                value={variant.weight ?? ""}
                onChange={(e) => update(index, { weight: e.target.value ? Number(e.target.value) : undefined })}
              />
              <Input
                label="Código de barras (opcional)"
                value={variant.barcode ?? ""}
                onChange={(e) => update(index, { barcode: e.target.value || undefined })}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

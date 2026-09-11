import { ImageOff, X } from "lucide-react";
import { Link } from "react-router-dom";
import { PriceTag } from "@/components/ui/PriceTag";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import type { CartItemView } from "@/types/cart";

interface CartItemRowProps {
  item: CartItemView;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  return (
    <div className="flex gap-4 border-b border-border py-4 last:border-0">
      <Link to={`/productos/${item.slug}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-alt">
        {item.image ? (
          <img src={item.image} alt={item.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-text-muted">
            <ImageOff className="size-5" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link to={`/productos/${item.slug}`} className="font-medium text-text hover:text-accent-deep">
              {item.name}
            </Link>
            <p className="text-xs text-text-muted">
              {item.attributeName}: {item.attributeValue}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar del carrito"
            className="flex size-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-accent2-deep"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <QuantityStepper value={item.quantity} max={item.availableStock} onChange={onUpdateQuantity} size="sm" />
          <PriceTag cents={item.subtotal} className="font-medium text-text" />
        </div>
      </div>
    </div>
  );
}

import type { Order } from "@amanda/shared";
import { formatMoney } from "@amanda/shared";
import { Card } from "@/components/ui/Card";
import { OrderStatusBadge } from "./OrderStatusBadge";

export function OrderSummaryCard({ order }: { order: Order }) {
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg text-text">Pedido #{order.orderNumber}</p>
          <p className="text-xs text-text-muted">
            {new Date(order.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex flex-col divide-y divide-border">
        {order.items.map((item) => (
          <div key={`${item.product}-${item.variantSku}`} className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              {item.image && (
                <img src={item.image} alt="" className="size-12 rounded-lg object-cover" />
              )}
              <div>
                <p className="text-sm font-medium text-text">{item.productName}</p>
                <p className="text-xs text-text-muted">
                  {item.attributeName}: {item.attributeValue} · x{item.quantity}
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-text">{formatMoney(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-text-muted">
          <span>Subtotal</span>
          <span>{formatMoney(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-text-muted">
          <span>Envío</span>
          <span>{order.shippingCost === 0 ? "Gratis" : formatMoney(order.shippingCost)}</span>
        </div>
        <div className="flex justify-between font-medium text-text">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </div>

      <div className="border-t border-border pt-4 text-sm">
        <p className="font-medium text-text">Dirección de envío</p>
        <p className="text-text-muted">
          {order.shippingAddress.street} {order.shippingAddress.number}, {order.shippingAddress.city},{" "}
          {order.shippingAddress.province} ({order.shippingAddress.postalCode})
        </p>
        {order.trackingNumber && (
          <p className="mt-2 text-text-muted">
            Seguimiento: <span className="font-medium text-text">{order.trackingNumber}</span>
          </p>
        )}
      </div>
    </Card>
  );
}

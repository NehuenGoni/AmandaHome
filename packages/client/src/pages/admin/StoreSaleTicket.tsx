import { formatMoney } from "@amanda/shared";
import { Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useStoreSale } from "@/hooks/admin/useStoreSale";
import { getShippingSettings } from "@/lib/shippingApi";
import { PAYMENT_METHOD_LABELS, formatDateTime } from "@/lib/storeSaleLabels";

/**
 * Ticket térmico de 80 mm. Vive fuera del AdminLayout para que al imprimir salga
 * solo el comprobante. Mientras no haya facturación con ARCA se rotula como no válido como factura.
 */
export default function StoreSaleTicket() {
  const { id } = useParams<{ id: string }>();
  const { sale, isLoading, error } = useStoreSale(id);
  const [store, setStore] = useState<{ address?: string; hours?: string }>({});
  const hasPrinted = useRef(false);

  useEffect(() => {
    getShippingSettings()
      .then(({ settings }) => setStore({ address: settings.pickup.address, hours: settings.pickup.hours }))
      .catch(() => {
        // Sin datos del local el ticket igual es válido: solo falta el encabezado de dirección.
      });
  }, []);

  useEffect(() => {
    if (!sale || hasPrinted.current) return;
    hasPrinted.current = true;
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, [sale]);

  if (isLoading) return <Spinner />;
  if (error || !sale) return <p className="p-6 text-sm text-text">{error ?? "Venta no encontrada"}</p>;

  const fiscal = sale.fiscalReceipt;

  return (
    <div className="min-h-screen bg-surface-alt py-6 print:bg-white print:py-0">
      <style>{"@page { size: 80mm auto; margin: 0; }"}</style>

      <div className="mx-auto mb-4 flex w-[80mm] justify-end print:hidden">
        <Button type="button" onClick={() => window.print()}>
          <Printer className="size-4" /> Imprimir
        </Button>
      </div>

      <article className="mx-auto w-[80mm] bg-white p-4 font-mono text-[12px] leading-snug text-black print:p-3">
        <header className="text-center">
          <p className="text-base font-bold">Amanda Home &amp; Deco</p>
          {store.address && <p>{store.address}</p>}
          {store.hours && <p>{store.hours}</p>}
        </header>

        <hr className="my-2 border-dashed border-black" />

        <p>Ticket #{sale.saleNumber}</p>
        <p>{formatDateTime(sale.createdAt)}</p>
        {sale.customer?.name && <p>Cliente: {sale.customer.name}</p>}

        <hr className="my-2 border-dashed border-black" />

        <ul className="flex flex-col gap-1.5">
          {sale.items.map((item) => (
            <li key={item.variantSku}>
              <p>
                {item.productName} ({item.attributeValue})
              </p>
              <p className="flex justify-between">
                <span>
                  {item.quantity} x {formatMoney(item.unitPrice)}
                </span>
                <span>{formatMoney(item.quantity * item.unitPrice)}</span>
              </p>
              {item.discount > 0 && (
                <p className="flex justify-between">
                  <span>Descuento</span>
                  <span>-{formatMoney(item.discount)}</span>
                </p>
              )}
            </li>
          ))}
        </ul>

        <hr className="my-2 border-dashed border-black" />

        {sale.discount && (
          <p className="flex justify-between">
            <span>Descuento{sale.discount.type === "percent" ? ` ${sale.discount.value}%` : ""}</span>
            <span>-{formatMoney(sale.discount.amount)}</span>
          </p>
        )}
        <p className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatMoney(sale.total)}</span>
        </p>
        <p className="flex justify-between">
          <span>Pago</span>
          <span>{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</span>
        </p>
        {sale.paymentMethod === "cash" && (
          <>
            <p className="flex justify-between">
              <span>Recibido</span>
              <span>{formatMoney(sale.cashReceived ?? 0)}</span>
            </p>
            <p className="flex justify-between">
              <span>Vuelto</span>
              <span>{formatMoney(sale.change ?? 0)}</span>
            </p>
          </>
        )}

        <hr className="my-2 border-dashed border-black" />

        {fiscal?.cae ? (
          <div className="text-center">
            <p>
              Comprobante {fiscal.type} {fiscal.pointOfSale}-{fiscal.number}
            </p>
            <p>CAE: {fiscal.cae}</p>
            {fiscal.caeExpiresAt && <p>Vto. CAE: {fiscal.caeExpiresAt}</p>}
          </div>
        ) : (
          <p className="text-center font-bold">Comprobante no válido como factura</p>
        )}

        <p className="mt-2 text-center">¡Gracias por tu compra!</p>
      </article>
    </div>
  );
}

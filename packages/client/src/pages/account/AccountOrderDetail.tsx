import { Paperclip, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { OrderSummaryCard } from "@/components/orders/OrderSummaryCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Spinner } from "@/components/ui/Spinner";
import { useMyOrder } from "@/hooks/useMyOrder";
import { ApiError } from "@/lib/apiClient";
import { uploadToCloudinary } from "@/lib/cloudinaryUpload";
import { attachReceipt, signReceiptUpload } from "@/lib/ordersApi";
import NotFound from "../NotFound";

export default function AccountOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { order, isLoading, error } = useMyOrder(id);
  const [localOrder, setLocalOrder] = useState(order);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const current = localOrder ?? order;

  async function handleFileChange(file: File | undefined) {
    if (!file || !id) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const signed = await signReceiptUpload(id);
      const url = await uploadToCloudinary(file, signed);
      const result = await attachReceipt(id, url);
      setLocalOrder(result.order);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "No pudimos subir el comprobante");
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) return <Spinner label="Buscando tu pedido…" />;
  if (error || !current) return <NotFound />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text">Pedido #{current.orderNumber}</h1>
      <OrderSummaryCard order={current} />

      <Card>
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-text-muted" />
          <h2 className="font-display text-lg text-text">Comprobante de pago</h2>
        </div>

        {current.receiptUrl ? (
          <a
            href={current.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-medium text-accent-deep hover:underline"
          >
            Ver comprobante adjunto
          </a>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-text-muted">
              Si pagaste por otro medio, podés adjuntar el comprobante acá.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
              isLoading={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" /> Subir comprobante
            </Button>
            {uploadError && <InlineMessage tone="error">{uploadError}</InlineMessage>}
          </div>
        )}
      </Card>
    </div>
  );
}

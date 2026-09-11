import { GripVertical, ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { ApiError } from "@/lib/apiClient";
import { signProductImageUpload, type ProductImageInput } from "@/lib/adminProductsApi";
import { uploadToCloudinary } from "@/lib/cloudinaryUpload";

interface ProductImagesEditorProps {
  images: ProductImageInput[];
  onChange: (images: ProductImageInput[]) => void;
}

export function ProductImagesEditor({ images, onChange }: ProductImagesEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploaded: ProductImageInput[] = [];
      for (const file of Array.from(files)) {
        const signed = await signProductImageUpload();
        const url = await uploadToCloudinary(file, signed);
        uploaded.push({ url, source: "cloudinary", order: images.length + uploaded.length });
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos subir la imagen");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index).map((img, i) => ({ ...img, order: i })));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target] as ProductImageInput, next[index] as ProductImageInput];
    onChange(next.map((img, i) => ({ ...img, order: i })));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-text">Imágenes</p>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-alt"
            >
              <img src={image.url} alt={image.alt ?? ""} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label="Quitar imagen"
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-primary/70 text-on-primary opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
              {images.length > 1 && (
                <div className="absolute bottom-1.5 left-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Mover a la izquierda"
                    className="flex size-6 items-center justify-center rounded-full bg-primary/70 text-on-primary disabled:opacity-30"
                  >
                    <GripVertical className="size-3.5 rotate-90" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-fit"
        isLoading={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus className="size-4" /> Agregar imágenes
      </Button>
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
    </div>
  );
}

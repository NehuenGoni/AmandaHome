import { AnimatePresence, motion } from "framer-motion";
import { Check, ImageOff, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Seo, truncateDescription } from "@/components/seo/Seo";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { PriceTag } from "@/components/ui/PriceTag";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { useCategories } from "@/hooks/useCategories";
import { useProduct } from "@/hooks/useProduct";
import { trackAddToCart, trackViewItem } from "@/lib/analytics";
import { cloudinaryUrl } from "@/lib/cloudinaryUrl";
import { buildProductJsonLd } from "@/lib/structuredData";
import NotFound from "./NotFound";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { product, isLoading, error } = useProduct(slug);
  const { addItem } = useCart();
  const { categories } = useCategories();

  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [confirmation, setConfirmation] = useState(false);

  const variant = useMemo(() => {
    if (!product) return null;
    return product.variants.find((v) => v.sku === selectedSku) ?? product.variants[0] ?? null;
  }, [product, selectedSku]);

  useEffect(() => {
    if (product) trackViewItem(product, product.variants[0] ?? null);
  }, [product]);

  if (isLoading) return <Spinner label="Cargando producto…" />;
  if (error || !product) return <NotFound />;

  const image = product.images[selectedImage];
  const category = categories.find((c) => c._id === product.category);

  async function handleAddToCart() {
    if (!product || !variant) return;
    await addItem({
      productId: product._id,
      variantSku: variant.sku,
      quantity,
      name: product.name,
      slug: product.slug,
      image: product.images[0]?.url,
      attributeName: variant.attributeName,
      attributeValue: variant.attributeValue,
      unitPrice: variant.price,
      availableStock: variant.stock,
    });
    trackAddToCart(product, variant, quantity);
    setConfirmation(true);
    setTimeout(() => setConfirmation(false), 2500);
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <Seo
        title={product.name}
        description={
          truncateDescription(product.description) ??
          `Comprá ${product.name} en Amanda Home & Deco. Envíos a todo el país y retiro en el local de Grand Bourg.`
        }
        path={`/productos/${product.slug}`}
        image={product.images[0] ? cloudinaryUrl(product.images[0].url, { width: 1200 }) : undefined}
        type="product"
        jsonLd={buildProductJsonLd(product, category)}
      />
      <div className="flex flex-col gap-3">
        <motion.div
          layoutId={`product-image-${product._id}`}
          className="aspect-square overflow-hidden rounded-2xl bg-surface-alt"
        >
          {image ? (
            <img
              src={cloudinaryUrl(image.url, { width: 1200 })}
              alt={image.alt ?? product.name}
              width={1200}
              height={1200}
              fetchPriority="high"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-text-muted">
              <ImageOff className="size-10" />
            </div>
          )}
        </motion.div>
        {product.images.length > 1 && (
          <div className="flex gap-2">
            {product.images.map((img, index) => (
              <button
                key={img.url + index}
                type="button"
                onClick={() => setSelectedImage(index)}
                className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                  index === selectedImage ? "border-accent" : "border-transparent"
                }`}
              >
                <img
                  src={cloudinaryUrl(img.url, { width: 160 })}
                  alt={img.alt ?? `${product.name} - vista ${index + 1}`}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-3xl text-text">{product.name}</h1>
          {product.brand && <p className="mt-1 text-sm text-text-muted">{product.brand}</p>}
        </div>

        {variant && (
          <p className="font-display text-2xl text-accent-deep">
            <PriceTag cents={variant.price} />
          </p>
        )}

        {product.description && <p className="text-sm leading-relaxed text-text-muted">{product.description}</p>}

        {product.variants.length > 1 && variant && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text">{variant.attributeName}</span>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.sku}
                  type="button"
                  onClick={() => {
                    setSelectedSku(v.sku);
                    setQuantity(1);
                  }}
                  disabled={v.stock <= 0}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    v.sku === variant.sku
                      ? "border-primary bg-primary text-on-primary"
                      : "border-border bg-surface text-text hover:bg-surface-alt"
                  }`}
                >
                  {v.attributeValue}
                </button>
              ))}
            </div>
          </div>
        )}

        {variant && (
          <div className="flex items-center gap-4">
            <QuantityStepper value={quantity} max={variant.stock} onChange={setQuantity} />
            <span className="text-sm text-text-muted">
              {variant.stock > 0 ? `${variant.stock} disponibles` : "Sin stock"}
            </span>
          </div>
        )}

        <Button size="lg" onClick={handleAddToCart} disabled={!variant || variant.stock <= 0} className="w-fit">
          <ShoppingBag className="size-4" /> Agregar al carrito
        </Button>

        <AnimatePresence>
          {confirmation && (
            <InlineMessage tone="success">
              <span className="inline-flex items-center gap-1">
                <Check className="size-4" /> Agregado al carrito
              </span>
            </InlineMessage>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

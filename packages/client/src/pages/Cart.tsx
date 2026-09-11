import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriceTag } from "@/components/ui/PriceTag";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

export default function Cart() {
  const { cart, updateQuantity, removeItem, isLoading } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isLoading && cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Tu carrito está vacío"
        description="Explorá el catálogo y encontrá algo lindo para tu casa."
        action={
          <Link to="/catalogo">
            <Button>Ver catálogo</Button>
          </Link>
        }
      />
    );
  }

  function handleCheckout() {
    if (isAuthenticated) navigate("/checkout");
    else navigate("/login", { state: { from: { pathname: "/checkout" } } });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-4 font-display text-2xl text-text">Tu carrito</h1>
        <AnimatePresence initial={false}>
          {cart.items.map((item) => (
            <motion.div
              key={`${item.productId}-${item.variantSku}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <CartItemRow
                item={item}
                onUpdateQuantity={(q) => updateQuantity(item.productId, item.variantSku, q)}
                onRemove={() => removeItem(item.productId, item.variantSku)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="h-fit rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-display text-lg text-text">Resumen</h2>
        <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
          <span>Subtotal</span>
          <PriceTag cents={cart.subtotal} className="font-medium text-text" />
        </div>
        <p className="mt-1 text-xs text-text-muted">El envío se calcula en el siguiente paso.</p>
        <Button size="lg" className="mt-5 w-full" onClick={handleCheckout}>
          Ir a pagar
        </Button>
      </div>
    </div>
  );
}

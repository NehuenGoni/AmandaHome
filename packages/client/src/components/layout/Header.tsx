import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, Package, ShoppingBag, User as UserIcon, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/", label: "Inicio", end: true },
  { to: "/catalogo", label: "Catálogo", end: false },
];

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  async function handleLogout() {
    setUserMenuOpen(false);
    await logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="font-display text-xl tracking-tight text-text">
          Amanda <span className="text-accent-deep">Home & Deco</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "text-sm font-medium transition-colors hover:text-accent-deep",
                  isActive ? "text-accent-deep" : "text-text",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Link
            to="/carrito"
            aria-label="Ver carrito"
            className="relative flex size-10 items-center justify-center rounded-full text-text transition-colors hover:bg-surface-alt"
          >
            <ShoppingBag className="size-5" />
            <AnimatePresence>
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-accent2 text-[10px] font-semibold text-on-accent2"
                >
                  {itemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <div className="relative hidden md:block">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex size-10 items-center justify-center rounded-full text-text transition-colors hover:bg-surface-alt"
                  aria-label="Menú de cuenta"
                >
                  <UserIcon className="size-5" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-40 cursor-default"
                        aria-hidden
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-border bg-surface p-2 shadow-lg"
                      >
                        <p className="truncate px-3 py-2 text-sm text-text-muted">{user?.email}</p>
                        <Link
                          to="/cuenta"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-text hover:bg-surface-alt"
                        >
                          <UserIcon className="size-4" /> Mi cuenta
                        </Link>
                        <Link
                          to="/cuenta/pedidos"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-text hover:bg-surface-alt"
                        >
                          <Package className="size-4" /> Mis pedidos
                        </Link>
                        {user?.role === "admin" && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-text hover:bg-surface-alt"
                          >
                            Panel de administración
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-accent2-deep hover:bg-surface-alt"
                        >
                          <LogOut className="size-4" /> Salir
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-strong"
              >
                Ingresar
              </Link>
            )}
          </div>

          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full text-text hover:bg-surface-alt md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border bg-bg md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-text hover:bg-surface-alt"
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link
                    to="/cuenta"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-text hover:bg-surface-alt"
                  >
                    Mi cuenta
                  </Link>
                  <Link
                    to="/cuenta/pedidos"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-text hover:bg-surface-alt"
                  >
                    Mis pedidos
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-accent2-deep hover:bg-surface-alt"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-text hover:bg-surface-alt"
                >
                  Ingresar
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

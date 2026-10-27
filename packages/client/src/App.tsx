import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RouteTracker } from "@/components/analytics/RouteTracker";
import { Seo } from "@/components/seo/Seo";
import { AccountLayout } from "@/components/layout/AccountLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PublicLayout } from "@/components/layout/PublicLayout";
import AcceptInvite from "@/pages/AcceptInvite";
import AccountAddresses from "@/pages/account/AccountAddresses";
import AccountOrderDetail from "@/pages/account/AccountOrderDetail";
import AccountOrders from "@/pages/account/AccountOrders";
import AccountProfile from "@/pages/account/AccountProfile";
import Cart from "@/pages/Cart";
import Catalog from "@/pages/Catalog";
import Checkout from "@/pages/Checkout";
import Arrepentimiento from "@/pages/Arrepentimiento";
import CambiosYDevoluciones from "@/pages/CambiosYDevoluciones";
import Contacto from "@/pages/Contacto";
import ForgotPassword from "@/pages/ForgotPassword";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import OrderConfirmation from "@/pages/OrderConfirmation";
import Privacidad from "@/pages/Privacidad";
import ProductDetail from "@/pages/ProductDetail";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import Terminos from "@/pages/Terminos";

// El panel de administración no lo ve el público: se carga aparte para no inflar el bundle de la tienda.
const AdminLayout = lazy(() => import("@/components/layout/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminAdmins = lazy(() => import("@/pages/admin/AdminAdmins"));
const AdminCashRegister = lazy(() => import("@/pages/admin/AdminCashRegister"));
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminInventory = lazy(() => import("@/pages/admin/AdminInventory"));
const AdminOrderDetail = lazy(() => import("@/pages/admin/AdminOrderDetail"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminPos = lazy(() => import("@/pages/admin/AdminPos"));
const AdminProductForm = lazy(() => import("@/pages/admin/AdminProductForm"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminShipping = lazy(() => import("@/pages/admin/AdminShipping"));
const AdminStoreSaleDetail = lazy(() => import("@/pages/admin/AdminStoreSaleDetail"));
const AdminStoreSales = lazy(() => import("@/pages/admin/AdminStoreSales"));
const AdminSupplierPurchases = lazy(() => import("@/pages/admin/AdminSupplierPurchases"));
const StoreSaleTicket = lazy(() => import("@/pages/admin/StoreSaleTicket"));

/** Páginas sin valor de búsqueda (cuenta, carrito, login…): Google no debe indexarlas. */
function Private({ children }: { children: ReactNode }) {
  return (
    <>
      <Seo noindex />
      {children}
    </>
  );
}

/** /catalogo?categoria=x quedó como URL vieja: redirige a /categoria/x, que sí es indexable. */
function LegacyCatalogRoute() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const categoria = params.get("categoria");
  if (!categoria) return <Catalog />;
  params.delete("categoria");
  const rest = params.toString();
  return <Navigate to={`/categoria/${categoria}${rest ? `?${rest}` : ""}`} replace />;
}

export default function App() {
  return (
    <>
      <RouteTracker />
      <Suspense fallback={null}>
        <Routes>
          <Route
            path="admin"
            element={
              <Private>
                <AdminLayout />
              </Private>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="productos" element={<AdminProducts />} />
            <Route path="productos/nuevo" element={<AdminProductForm />} />
            <Route path="productos/:id" element={<AdminProductForm />} />
            <Route path="categorias" element={<AdminCategories />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="pedidos/:id" element={<AdminOrderDetail />} />
            <Route path="inventario" element={<AdminInventory />} />
            <Route path="envios" element={<AdminShipping />} />
            <Route path="compras" element={<AdminSupplierPurchases />} />
            <Route path="caja" element={<AdminCashRegister />} />
            <Route path="ventas" element={<AdminPos />} />
            <Route path="ventas/historial" element={<AdminStoreSales />} />
            <Route path="ventas/:id" element={<AdminStoreSaleDetail />} />
            <Route path="administradores" element={<AdminAdmins />} />
          </Route>

          {/* Fuera del AdminLayout a propósito: al imprimir debe salir solo el ticket. */}
          <Route
            path="admin/ventas/:id/ticket"
            element={
              <Private>
                <ProtectedRoute role="admin">
                  <StoreSaleTicket />
                </ProtectedRoute>
              </Private>
            }
          />

          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="catalogo" element={<LegacyCatalogRoute />} />
            <Route path="categoria/:slug" element={<Catalog />} />
            <Route path="productos/:slug" element={<ProductDetail />} />
            <Route
              path="carrito"
              element={
                <Private>
                  <Cart />
                </Private>
              }
            />
            <Route
              path="checkout"
              element={
                <Private>
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                </Private>
              }
            />
            <Route
              path="order-confirmation/:id"
              element={
                <Private>
                  <ProtectedRoute>
                    <OrderConfirmation />
                  </ProtectedRoute>
                </Private>
              }
            />

            <Route
              path="login"
              element={
                <Private>
                  <Login />
                </Private>
              }
            />
            <Route
              path="registro"
              element={
                <Private>
                  <Register />
                </Private>
              }
            />
            <Route
              path="forgot-password"
              element={
                <Private>
                  <ForgotPassword />
                </Private>
              }
            />
            <Route
              path="reset-password"
              element={
                <Private>
                  <ResetPassword />
                </Private>
              }
            />
            <Route
              path="accept-invite"
              element={
                <Private>
                  <AcceptInvite />
                </Private>
              }
            />

            <Route
              path="cuenta"
              element={
                <Private>
                  <AccountLayout />
                </Private>
              }
            >
              <Route index element={<AccountProfile />} />
              <Route path="pedidos" element={<AccountOrders />} />
              <Route path="pedidos/:id" element={<AccountOrderDetail />} />
              <Route path="direcciones" element={<AccountAddresses />} />
            </Route>

            <Route path="terminos-y-condiciones" element={<Terminos />} />

            <Route path="cambios-y-devoluciones" element={<CambiosYDevoluciones />} />

            <Route path="politica-de-privacidad" element={<Privacidad />} />

            <Route path="contacto" element={<Contacto />} />

            <Route path="arrepentimiento" element={<Arrepentimiento />} />

            <Route
              path="*"
              element={
                <Private>
                  <NotFound />
                </Private>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

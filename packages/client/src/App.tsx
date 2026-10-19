import { Route, Routes } from "react-router-dom";
import { AccountLayout } from "@/components/layout/AccountLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PublicLayout } from "@/components/layout/PublicLayout";
import AcceptInvite from "@/pages/AcceptInvite";
import AccountAddresses from "@/pages/account/AccountAddresses";
import AccountOrderDetail from "@/pages/account/AccountOrderDetail";
import AccountOrders from "@/pages/account/AccountOrders";
import AccountProfile from "@/pages/account/AccountProfile";
import AdminAdmins from "@/pages/admin/AdminAdmins";
import AdminCashRegister from "@/pages/admin/AdminCashRegister";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminInventory from "@/pages/admin/AdminInventory";
import AdminOrderDetail from "@/pages/admin/AdminOrderDetail";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminPos from "@/pages/admin/AdminPos";
import AdminProductForm from "@/pages/admin/AdminProductForm";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminShipping from "@/pages/admin/AdminShipping";
import AdminStoreSaleDetail from "@/pages/admin/AdminStoreSaleDetail";
import AdminStoreSales from "@/pages/admin/AdminStoreSales";
import AdminSupplierPurchases from "@/pages/admin/AdminSupplierPurchases";
import StoreSaleTicket from "@/pages/admin/StoreSaleTicket";
import Cart from "@/pages/Cart";
import Catalog from "@/pages/Catalog";
import Checkout from "@/pages/Checkout";
import ForgotPassword from "@/pages/ForgotPassword";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import OrderConfirmation from "@/pages/OrderConfirmation";
import ProductDetail from "@/pages/ProductDetail";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";

export default function App() {
  return (
    <Routes>
      <Route path="admin" element={<AdminLayout />}>
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
          <ProtectedRoute role="admin">
            <StoreSaleTicket />
          </ProtectedRoute>
        }
      />

      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="catalogo" element={<Catalog />} />
        <Route path="productos/:slug" element={<ProductDetail />} />
        <Route path="carrito" element={<Cart />} />
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="order-confirmation/:id"
          element={
            <ProtectedRoute>
              <OrderConfirmation />
            </ProtectedRoute>
          }
        />

        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="accept-invite" element={<AcceptInvite />} />

        <Route path="cuenta" element={<AccountLayout />}>
          <Route index element={<AccountProfile />} />
          <Route path="pedidos" element={<AccountOrders />} />
          <Route path="pedidos/:id" element={<AccountOrderDetail />} />
          <Route path="direcciones" element={<AccountAddresses />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

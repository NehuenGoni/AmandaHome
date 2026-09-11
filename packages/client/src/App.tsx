import { Route, Routes } from "react-router-dom";
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

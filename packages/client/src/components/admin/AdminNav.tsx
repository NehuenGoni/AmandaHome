import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  Truck,
  UserCog,
  Warehouse,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/productos", label: "Productos", icon: Package, end: false },
  { to: "/admin/categorias", label: "Categorías", icon: Tags, end: false },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart, end: false },
  { to: "/admin/inventario", label: "Inventario", icon: Warehouse, end: false },
  { to: "/admin/compras", label: "Compras a proveedores", icon: Truck, end: false },
  { to: "/admin/administradores", label: "Administradores", icon: UserCog, end: false },
];

export function AdminNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:gap-1 sm:overflow-visible">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-on-primary" : "text-text hover:bg-surface-alt",
            )
          }
        >
          <link.icon className="size-4" />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

import {
  Landmark,
  LayoutDashboard,
  Package,
  PackageCheck,
  Receipt,
  ScanBarcode,
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
  { to: "/admin/ventas", label: "Punto de venta", icon: ScanBarcode, end: true },
  { to: "/admin/caja", label: "Caja", icon: Landmark, end: false },
  { to: "/admin/ventas/historial", label: "Ventas del local", icon: Receipt, end: false },
  { to: "/admin/productos", label: "Productos", icon: Package, end: false },
  { to: "/admin/categorias", label: "Categorías", icon: Tags, end: false },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart, end: false },
  { to: "/admin/inventario", label: "Inventario", icon: Warehouse, end: false },
  { to: "/admin/envios", label: "Envíos", icon: PackageCheck, end: false },
  { to: "/admin/compras", label: "Compras a proveedores", icon: Truck, end: false },
  { to: "/admin/administradores", label: "Administradores", icon: UserCog, end: false },
];

export function AdminNav() {
  return (
    <nav aria-label="Secciones del panel" className="flex gap-2 overflow-x-auto sm:flex-col sm:gap-1.5 sm:overflow-visible">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            cn(
              "flex min-h-13 shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-lg font-medium transition-colors",
              isActive ? "bg-primary text-on-primary" : "text-text hover:bg-surface-alt",
            )
          }
        >
          <link.icon className="size-6 shrink-0" />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

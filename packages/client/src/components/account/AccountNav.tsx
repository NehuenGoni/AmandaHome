import { MapPin, Package, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/cuenta", label: "Mis datos", icon: UserRound, end: true },
  { to: "/cuenta/pedidos", label: "Pedidos", icon: Package, end: false },
  { to: "/cuenta/direcciones", label: "Direcciones", icon: MapPin, end: false },
];

export function AccountNav() {
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

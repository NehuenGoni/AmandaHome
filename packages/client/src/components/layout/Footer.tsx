import { Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Logo className="h-10 w-auto shrink-0" />
          <div className="flex flex-col gap-1.5">
            <p className="max-w-[16rem] text-xs leading-relaxed text-text-muted">
              Textiles, cerámica y objetos que hacen de tu casa un lugar propio.
            </p>
            <div className="flex items-center gap-3 text-text-muted">
              <a
                href="https://www.instagram.com/homedecoamanda/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram de Amanda Home & Deco"
                className="inline-flex transition-colors hover:text-accent-deep"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="https://wa.me/5491137582353"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp de Amanda Home & Deco"
                className="inline-flex items-center gap-1.5 text-xs transition-colors hover:text-accent-deep"
              >
                <WhatsAppIcon className="size-4" />
                11 3758-2353
              </a>
            </div>
          </div>
        </div>
        <div className="flex gap-10 text-xs">
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-text">Tienda</span>
            <Link to="/catalogo" className="text-text-muted hover:text-accent-deep">
              Catálogo
            </Link>
            <Link to="/carrito" className="text-text-muted hover:text-accent-deep">
              Carrito
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-text">Cuenta</span>
            <Link to="/cuenta/pedidos" className="text-text-muted hover:text-accent-deep">
              Mis pedidos
            </Link>
            <Link to="/login" className="text-text-muted hover:text-accent-deep">
              Ingresar
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 text-center text-[11px] text-text-muted sm:px-6">
        © {new Date().getFullYear()} Amanda Home & Deco — Buenos Aires, Argentina
      </div>
    </footer>
  );
}

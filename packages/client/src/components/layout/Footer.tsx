import { BUSINESS } from "@amanda/shared";
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
                href={BUSINESS.instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram de Amanda Home & Deco"
                className="inline-flex transition-colors hover:text-accent-deep"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href={BUSINESS.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp de Amanda Home & Deco"
                className="inline-flex items-center gap-1.5 text-xs transition-colors hover:text-accent-deep"
              >
                <WhatsAppIcon className="size-4" />
                {BUSINESS.phone}
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-10 gap-y-6 text-xs">
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
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-text">Legales</span>
            <Link to="/terminos-y-condiciones" className="text-text-muted hover:text-accent-deep">
              Términos y condiciones
            </Link>
            <Link to="/cambios-y-devoluciones" className="text-text-muted hover:text-accent-deep">
              Cambios y devoluciones
            </Link>
            <Link to="/politica-de-privacidad" className="text-text-muted hover:text-accent-deep">
              Privacidad
            </Link>
            <Link to="/contacto" className="text-text-muted hover:text-accent-deep">
              Contacto
            </Link>
            <Link to="/arrepentimiento" className="font-medium text-accent-deep hover:underline">
              Botón de arrepentimiento
            </Link>
            <a
              href={BUSINESS.consumerDefenseUrl}
              target="_blank"
              rel="noreferrer"
              className="text-text-muted hover:text-accent-deep"
            >
              Defensa del Consumidor
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 text-center text-[11px] text-text-muted sm:px-6">
        © {new Date().getFullYear()} Amanda Home & Deco — Buenos Aires, Argentina
      </div>
    </footer>
  );
}

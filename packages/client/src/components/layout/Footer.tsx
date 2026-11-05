import { BUSINESS } from "@amanda/shared";
import { ChevronUp, Instagram } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { trackContactClick } from "@/lib/analytics";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { Logo } from "./Logo";

const linkClass = "text-text-muted transition-colors hover:text-accent-deep";
const titleClass = "text-base font-semibold text-text";

export function Footer() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      {/* Mobile: barra plegable. En desktop el botón no se muestra y el panel está siempre abierto. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left md:hidden"
      >
        <Logo className="h-7 w-auto shrink-0" />
        <span className="flex-1 text-sm text-text-muted">© {year} {BUSINESS.name}</span>
        <ChevronUp
          aria-hidden="true"
          className={`size-4 shrink-0 text-text-muted transition-transform duration-300 motion-reduce:transition-none ${
            open ? "rotate-0" : "rotate-180"
          }`}
        />
      </button>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows,visibility] duration-300 motion-reduce:transition-none md:visible md:grid-rows-[1fr] ${
          open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr] delay-[0s,300ms]"
        } md:delay-0`}
      >
        <div className="overflow-hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 md:flex-row md:items-start md:justify-between md:gap-10 md:py-10">
            <div className="flex items-center gap-4">
              {/* En mobile la marca ya está en la barra: acá se oculta para no repetirla. */}
              <Logo className="hidden h-10 w-auto shrink-0 md:block" />
              <div className="flex flex-col gap-1.5">
                <p className="max-w-xs text-base leading-relaxed text-text-muted">
                  Textiles, cerámica y objetos que hacen de tu casa un lugar propio.
                </p>
                <div className="flex items-center gap-3 text-text-muted">
                  <a
                    href={BUSINESS.instagramUrl}
                    onClick={() => trackContactClick("instagram", "footer")}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram de Amanda Home & Deco"
                    className="inline-flex transition-colors hover:text-accent-deep"
                  >
                    <Instagram className="size-6" />
                  </a>
                  <a
                    href={BUSINESS.whatsappUrl}
                    onClick={() => trackContactClick("whatsapp", "footer")}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp de Amanda Home & Deco"
                    className="inline-flex items-center gap-1.5 text-base transition-colors hover:text-accent-deep"
                  >
                    <WhatsAppIcon className="size-6" />
                    {BUSINESS.phone}
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-12 gap-y-6 text-base">
              <div className="flex flex-col gap-1.5">
                <span className={titleClass}>Tienda</span>
                <Link to="/catalogo" className={linkClass}>
                  Catálogo
                </Link>
                <Link to="/carrito" className={linkClass}>
                  Carrito
                </Link>
                <Link to="/cuenta/pedidos" className={linkClass}>
                  Mis pedidos
                </Link>
                <Link to="/login" className={linkClass}>
                  Ingresar
                </Link>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={titleClass}>Legales</span>
                <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  <Link to="/terminos-y-condiciones" className={linkClass}>
                    Términos y condiciones
                  </Link>
                  <Link to="/politica-de-privacidad" className={linkClass}>
                    Privacidad
                  </Link>
                  <Link to="/cambios-y-devoluciones" className={linkClass}>
                    Cambios y devoluciones
                  </Link>
                  <Link to="/contacto" className={linkClass}>
                    Contacto
                  </Link>
                  <Link to="/arrepentimiento" className="font-medium text-accent-deep hover:underline">
                    Botón de arrepentimiento
                  </Link>
                  <a href={BUSINESS.consumerDefenseUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Defensa del Consumidor
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 text-sm text-text-muted sm:flex-row">
              <span>
                © {year} {BUSINESS.name}. Todos los derechos reservados.
              </span>
              <span>
                Diseñado y desarrollado por{" "}
                <a
                  href={BUSINESS.author.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-text transition-colors hover:text-accent-deep"
                >
                  {BUSINESS.author.name}
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

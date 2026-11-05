import { BUSINESS } from "@amanda/shared";
import { Instagram, Mail, MapPin } from "lucide-react";
import { trackContactClick } from "@/lib/analytics";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export default function Contacto() {
  const link =
    "flex min-h-14 items-center gap-3 rounded-2xl border-2 border-field bg-surface px-5 py-3 text-lg font-medium text-text transition-colors hover:border-accent-deep hover:bg-surface-alt";
  return (
    <LegalPage
      title="Contacto"
      description="Escribinos por WhatsApp, email o Instagram, o visitá el local de Amanda Home & Deco en Av. El Callao 1585, Grand Bourg."
    >
      <LegalSection title="Escribinos">
        <p>Respondemos consultas sobre productos, pedidos, cambios y devoluciones.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          <li>
            <a href={`mailto:${BUSINESS.email}`} onClick={() => trackContactClick("email", "contacto")} className={link}>
              <Mail className="size-6 shrink-0 text-accent-deep" /> {BUSINESS.email}
            </a>
          </li>
          <li>
            <a
              href={BUSINESS.whatsappUrl}
              onClick={() => trackContactClick("whatsapp", "contacto")}
              target="_blank"
              rel="noreferrer"
              className={link}
            >
              <WhatsAppIcon className="size-6 shrink-0 text-accent-deep" /> {BUSINESS.phone}
            </a>
          </li>
          <li>
            <a
              href={BUSINESS.instagramUrl}
              onClick={() => trackContactClick("instagram", "contacto")}
              target="_blank"
              rel="noreferrer"
              className={link}
            >
              <Instagram className="size-6 shrink-0 text-accent-deep" /> @homedecoamanda
            </a>
          </li>
          <li className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-border bg-surface px-5 py-3 text-lg text-text">
            <MapPin className="size-6 shrink-0 text-accent-deep" /> {BUSINESS.address}, {BUSINESS.city}
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="Datos del proveedor">
        <p>
          {BUSINESS.legalName}, CUIT {BUSINESS.cuit}. Domicilio: {BUSINESS.address}.
        </p>
      </LegalSection>
      <LegalSection title="Defensa del Consumidor">
        <p>
          Ante cualquier reclamo podés contactar a la Dirección de Defensa del Consumidor de tu jurisdicción:{" "}
          <a
            href={BUSINESS.consumerDefenseUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent-deep underline underline-offset-4 hover:text-text"
          >
            Defensa del Consumidor
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

import { BUSINESS } from "@amanda/shared";
import { Instagram, Mail, MapPin } from "lucide-react";
import { trackContactClick } from "@/lib/analytics";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

export default function Contacto() {
  const link = "inline-flex items-center gap-2 text-accent-deep hover:underline";
  return (
    <LegalPage
      title="Contacto"
      description="Escribinos por WhatsApp, email o Instagram, o visitá el local de Amanda Home & Deco en Av. El Callao 1585, Grand Bourg."
    >
      <LegalSection title="Escribinos">
        <p>Respondemos consultas sobre productos, pedidos, cambios y devoluciones.</p>
        <ul className="flex flex-col gap-2">
          <li>
            <a href={`mailto:${BUSINESS.email}`} onClick={() => trackContactClick("email", "contacto")} className={link}>
              <Mail className="size-4" /> {BUSINESS.email}
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
              <WhatsAppIcon className="size-4" /> {BUSINESS.phone}
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
              <Instagram className="size-4" /> @homedecoamanda
            </a>
          </li>
          <li className="inline-flex items-center gap-2">
            <MapPin className="size-4" /> {BUSINESS.address}, {BUSINESS.city}
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="Datos del proveedor">
        <p>
          {BUSINESS.legalName} — CUIT {BUSINESS.cuit}. Domicilio: {BUSINESS.address}.
        </p>
      </LegalSection>
      <LegalSection title="Defensa del Consumidor">
        <p>
          Ante cualquier reclamo podés contactar a la Dirección de Defensa del Consumidor de tu jurisdicción:{" "}
          <a
            href={BUSINESS.consumerDefenseUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent-deep hover:underline"
          >
            Defensa del Consumidor
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

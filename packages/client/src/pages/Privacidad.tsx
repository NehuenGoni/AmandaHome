import { BUSINESS } from "@amanda/shared";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export default function Privacidad() {
  return (
    <LegalPage title="Política de privacidad">
      <LegalSection title="Responsable del tratamiento">
        <p>
          {BUSINESS.legalName} (CUIT {BUSINESS.cuit}), {BUSINESS.address}. Contacto:{" "}
          <a href={`mailto:${BUSINESS.email}`} className="text-accent-deep hover:underline">
            {BUSINESS.email}
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Qué datos recolectamos">
        <p>
          Nombre, apellido, email, teléfono, direcciones de entrega, historial de pedidos y los datos necesarios para
          procesar pagos y envíos. No almacenamos datos de tarjetas: los procesa Mercado Pago.
        </p>
      </LegalSection>
      <LegalSection title="Para qué los usamos">
        <p>
          Gestionar tu cuenta y tus pedidos, enviarte confirmaciones y novedades de tus compras, coordinar envíos y
          cumplir obligaciones legales e impositivas.
        </p>
      </LegalSection>
      <LegalSection title="Con quién los compartimos">
        <p>
          Solo con los proveedores necesarios para brindar el servicio: Mercado Pago (pagos), Correo Argentino
          (envíos) y Resend (envío de emails). No vendemos tus datos a terceros.
        </p>
      </LegalSection>
      <LegalSection title="Tus derechos">
        <p>
          Podés acceder, rectificar y suprimir tus datos escribiéndonos al email de contacto. La Agencia de Acceso a la
          Información Pública, en su carácter de órgano de control de la Ley 25.326, tiene la atribución de atender
          denuncias y reclamos por incumplimientos de las normas de protección de datos personales.
        </p>
      </LegalSection>
      <LegalSection title="Cookies y almacenamiento local">
        <p>
          Usamos una cookie técnica para mantener tu sesión iniciada y almacenamiento local para recordar preferencias
          como el tema claro u oscuro. No usamos cookies publicitarias.
        </p>
      </LegalSection>
      <LegalSection title="Conservación y seguridad">
        <p>
          Conservamos tus datos mientras mantengas tu cuenta o sea necesario por obligaciones legales, y aplicamos
          medidas técnicas razonables para protegerlos.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

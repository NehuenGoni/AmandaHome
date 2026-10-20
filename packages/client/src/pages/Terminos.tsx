import { BUSINESS } from "@amanda/shared";
import { Link } from "react-router-dom";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export default function Terminos() {
  return (
    <LegalPage title="Términos y condiciones">
      <LegalSection title="1. Quiénes somos">
        <p>
          Este sitio es operado por {BUSINESS.legalName} (CUIT {BUSINESS.cuit}), con domicilio en {BUSINESS.address},{" "}
          {BUSINESS.city}, bajo la marca {BUSINESS.name}. Al comprar aceptás estos términos.
        </p>
      </LegalSection>
      <LegalSection title="2. Productos y precios">
        <p>
          Los precios están expresados en pesos argentinos e incluyen impuestos. Las imágenes son ilustrativas y
          pueden presentar leves variaciones de color. Los productos están sujetos a disponibilidad de stock; si un
          producto no estuviera disponible tras tu compra, te lo informaremos y reintegraremos el pago.
        </p>
      </LegalSection>
      <LegalSection title="3. Compra y pago">
        <p>
          El pedido se confirma una vez acreditado el pago. Los pagos online se procesan a través de Mercado Pago; no
          almacenamos datos de tu tarjeta. Los pedidos con pago pendiente pueden cancelarse automáticamente pasado un
          tiempo.
        </p>
      </LegalSection>
      <LegalSection title="4. Envíos y retiro">
        <p>
          Realizamos envíos a todo el país mediante Correo Argentino, con costo y plazos calculados al momento de la
          compra, y también podés retirar sin cargo en nuestro local. Los plazos son estimados y comienzan a correr
          desde la acreditación del pago.
        </p>
      </LegalSection>
      <LegalSection title="5. Arrepentimiento, cambios y devoluciones">
        <p>
          Tenés derecho a arrepentirte de tu compra dentro de {BUSINESS.withdrawalDays} días corridos. Consultá la{" "}
          <Link to="/cambios-y-devoluciones" className="text-accent-deep hover:underline">
            política de cambios y devoluciones
          </Link>{" "}
          o usá el{" "}
          <Link to="/arrepentimiento" className="text-accent-deep hover:underline">
            botón de arrepentimiento
          </Link>
          .
        </p>
      </LegalSection>
      <LegalSection title="6. Cuenta de usuario">
        <p>
          Sos responsable de mantener la confidencialidad de tu contraseña y de la veracidad de los datos que cargues.
        </p>
      </LegalSection>
      <LegalSection title="7. Propiedad intelectual">
        <p>
          Los contenidos, marcas, imágenes y textos del sitio pertenecen a {BUSINESS.name} y no pueden usarse sin
          autorización.
        </p>
      </LegalSection>
      <LegalSection title="8. Datos personales">
        <p>
          El tratamiento de tus datos se rige por nuestra{" "}
          <Link to="/politica-de-privacidad" className="text-accent-deep hover:underline">
            política de privacidad
          </Link>
          .
        </p>
      </LegalSection>
      <LegalSection title="9. Jurisdicción y defensa del consumidor">
        <p>
          Rigen las leyes de la República Argentina, en particular la Ley 24.240 de Defensa del Consumidor. Ante
          cualquier controversia, el consumidor puede recurrir a los tribunales ordinarios de su domicilio. Podés
          presentar reclamos ante la Dirección de Defensa del Consumidor de tu jurisdicción (
          <a
            href={BUSINESS.consumerDefenseUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent-deep hover:underline"
          >
            más información
          </a>
          ).
        </p>
      </LegalSection>
    </LegalPage>
  );
}

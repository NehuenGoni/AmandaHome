import { BUSINESS } from "@amanda/shared";
import { Link } from "react-router-dom";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export default function CambiosYDevoluciones() {
  return (
    <LegalPage title="Cambios y devoluciones">
      <LegalSection title="Derecho de arrepentimiento">
        <p>
          En las compras realizadas por este sitio podés revocar la aceptación dentro de los {BUSINESS.withdrawalDays}{" "}
          días corridos contados desde la recepción del producto (o desde la celebración del contrato, lo último que
          ocurra), sin responsabilidad alguna (Ley 24.240, art. 34, y Res. 424/2020).
        </p>
        <p>
          Para ejercerlo usá el{" "}
          <Link to="/arrepentimiento" className="font-medium text-accent-deep hover:underline">
            botón de arrepentimiento
          </Link>
          . Te enviamos una constancia por email y coordinamos la devolución. Los costos de devolución corren por
          cuenta del vendedor en este caso. Reembolsamos el importe pagado por el mismo medio de pago utilizado.
        </p>
        <p>El producto debe devolverse en las mismas condiciones en que fue recibido, sin uso y con su embalaje.</p>
      </LegalSection>
      <LegalSection title="Cambios por talle, color o preferencia">
        <p>
          Aceptamos cambios dentro de los 30 días de la compra, con el producto sin uso y con etiquetas. Escribinos a{" "}
          <a href={`mailto:${BUSINESS.email}`} className="text-accent-deep hover:underline">
            {BUSINESS.email}
          </a>{" "}
          o por WhatsApp indicando el número de pedido. El costo de envío del cambio lo asume quien lo solicita.
        </p>
      </LegalSection>
      <LegalSection title="Productos con fallas o errores">
        <p>
          Si recibís un producto defectuoso o distinto del pedido, avisanos dentro de los 3 días de recibirlo, con
          fotos. Lo reemplazamos o reembolsamos, y los costos de envío corren por nuestra cuenta. Rige la garantía
          legal de la Ley 24.240.
        </p>
      </LegalSection>
      <LegalSection title="Compras en el local">
        <p>
          Los cambios de compras realizadas en el local se gestionan allí mismo, presentando el ticket. Las compras en
          el local no están alcanzadas por el derecho de arrepentimiento.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

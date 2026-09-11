import type { OrderStatus } from "@amanda/shared";
import { formatMoney } from "@amanda/shared";

interface EmailTemplate {
  subject: string;
  html: string;
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente de pago",
  confirmed: "Confirmado",
  preparing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const BRAND = {
  bg: "#F5F0E4",
  surface: "#FBF8F1",
  text: "#211E1A",
  textMuted: "#6B6252",
  primary: "#211E1A",
  onPrimary: "#C69A3B",
};

function wrapper(title: string, bodyHtml: string): string {
  return `
    <div style="background:${BRAND.bg};padding:32px 16px;font-family:Georgia,serif;color:${BRAND.text};">
      <div style="max-width:480px;margin:0 auto;background:${BRAND.surface};border-radius:8px;padding:32px;">
        <h1 style="margin:0 0 16px;font-size:20px;color:${BRAND.text};">Amanda Home & Deco</h1>
        <h2 style="margin:0 0 16px;font-size:16px;color:${BRAND.text};">${title}</h2>
        ${bodyHtml}
      </div>
    </div>
  `;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${BRAND.primary};color:${BRAND.onPrimary};text-decoration:none;border-radius:6px;">${label}</a>`;
}

export function welcomeTemplate(firstName: string): EmailTemplate {
  return {
    subject: "¡Bienvenido/a a Amanda Home & Deco!",
    html: wrapper(
      `Hola ${firstName}, ¡gracias por sumarte!`,
      `<p style="color:${BRAND.textMuted};">Ya podés explorar nuestro catálogo y armar tu pedido cuando quieras.</p>`,
    ),
  };
}

export function passwordResetTemplate(firstName: string, resetUrl: string): EmailTemplate {
  return {
    subject: "Restablecé tu contraseña",
    html: wrapper(
      `Hola ${firstName}`,
      `<p style="color:${BRAND.textMuted};">Recibimos una solicitud para restablecer tu contraseña. Si fuiste vos, hacé clic en el botón. Si no, podés ignorar este email.</p>${button(resetUrl, "Restablecer contraseña")}<p style="color:${BRAND.textMuted};font-size:12px;margin-top:16px;">El link vence en 1 hora.</p>`,
    ),
  };
}

export function adminInviteTemplate(inviteUrl: string): EmailTemplate {
  return {
    subject: "Invitación para administrar Amanda Home & Deco",
    html: wrapper(
      "Te invitaron como administrador/a",
      `<p style="color:${BRAND.textMuted};">Hacé clic en el botón para aceptar la invitación y crear tu cuenta de administrador.</p>${button(inviteUrl, "Aceptar invitación")}`,
    ),
  };
}

export function adminPromotedTemplate(firstName: string): EmailTemplate {
  return {
    subject: "Ahora sos administrador/a de Amanda Home & Deco",
    html: wrapper(
      `Hola ${firstName}`,
      `<p style="color:${BRAND.textMuted};">Tu cuenta fue promovida a administrador/a. Ya podés acceder al panel de administración.</p>`,
    ),
  };
}

export function adminRevokedTemplate(firstName: string): EmailTemplate {
  return {
    subject: "Tu acceso de administrador fue revocado",
    html: wrapper(
      `Hola ${firstName}`,
      `<p style="color:${BRAND.textMuted};">Tu rol de administrador/a fue revocado. Tu cuenta sigue activa como cliente.</p>`,
    ),
  };
}

export function orderConfirmationTemplate(
  firstName: string,
  order: { orderNumber: number; total: number },
): EmailTemplate {
  return {
    subject: `Confirmamos tu pedido #${order.orderNumber}`,
    html: wrapper(
      `Hola ${firstName}, ¡tu pago fue aprobado!`,
      `<p style="color:${BRAND.textMuted};">Tu pedido <strong>#${order.orderNumber}</strong> por un total de <strong>${formatMoney(order.total)}</strong> ya está confirmado y lo estamos preparando.</p>`,
    ),
  };
}

export function orderStatusChangeTemplate(
  firstName: string,
  order: { orderNumber: number },
  newStatus: OrderStatus,
): EmailTemplate {
  const label = ORDER_STATUS_LABELS[newStatus];
  return {
    subject: `Tu pedido #${order.orderNumber}: ${label}`,
    html: wrapper(
      `Hola ${firstName}`,
      `<p style="color:${BRAND.textMuted};">El estado de tu pedido <strong>#${order.orderNumber}</strong> cambió a: <strong>${label}</strong>.</p>`,
    ),
  };
}

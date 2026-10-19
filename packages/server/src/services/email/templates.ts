import type { OrderStatus } from "@amanda/shared";
import { formatMoney } from "@amanda/shared";
import { env } from "../../config/env.js";

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

/**
 * El logo se sirve desde el front público. Si el cliente de correo bloquea las
 * imágenes, el alt mantiene el nombre de la marca visible.
 */
function logoHtml(): string {
  return `<img src="${env.CLIENT_URL}/logo.png" alt="Amanda Home & Deco" width="180" style="display:block;width:180px;max-width:100%;height:auto;margin:0 auto 24px;border:0;font-size:20px;color:${BRAND.text};text-align:center;" />`;
}

function wrapper(title: string, bodyHtml: string): string {
  return `
    <div style="background:${BRAND.bg};padding:32px 16px;font-family:Georgia,serif;color:${BRAND.text};">
      <div style="max-width:480px;margin:0 auto;background:${BRAND.surface};border-radius:8px;padding:32px;">
        ${logoHtml()}
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface StoreSaleReceiptData {
  saleNumber: number;
  createdAt: Date;
  items: { productName: string; attributeValue: string; quantity: number; subtotal: number }[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethodLabel: string;
  customerName?: string;
}

/** Ticket de una compra en el local. Comprobante no fiscal: no reemplaza a una factura. */
export function storeSaleReceiptTemplate(
  sale: StoreSaleReceiptData,
  store: { address?: string; hours?: string },
): EmailTemplate {
  const rows = sale.items
    .map(
      (item) =>
        `<tr><td style="padding:4px 0;">${item.quantity} × ${escapeHtml(item.productName)} <span style="color:${BRAND.textMuted};">(${escapeHtml(item.attributeValue)})</span></td><td style="padding:4px 0;text-align:right;">${formatMoney(item.subtotal)}</td></tr>`,
    )
    .join("");
  const discountRow =
    sale.discountAmount > 0
      ? `<tr><td style="padding:4px 0;color:${BRAND.textMuted};">Descuento</td><td style="padding:4px 0;text-align:right;">-${formatMoney(sale.discountAmount)}</td></tr>`
      : "";
  const date = sale.createdAt.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  const greeting = sale.customerName ? `Hola ${escapeHtml(sale.customerName)}, ` : "";
  const storeInfo = [store.address, store.hours]
    .filter((v): v is string => Boolean(v))
    .map((v) => escapeHtml(v))
    .join(" · ");

  return {
    subject: `Tu ticket de compra #${sale.saleNumber}`,
    html: wrapper(
      `${greeting}gracias por tu compra`,
      `<p style="color:${BRAND.textMuted};margin:0 0 12px;">Ticket <strong>#${sale.saleNumber}</strong> · ${date}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}
        <tr><td colspan="2" style="border-top:1px solid ${BRAND.bg};padding-top:4px;"></td></tr>
        <tr><td style="padding:4px 0;color:${BRAND.textMuted};">Subtotal</td><td style="padding:4px 0;text-align:right;">${formatMoney(sale.subtotal)}</td></tr>
        ${discountRow}
        <tr><td style="padding:4px 0;"><strong>Total</strong></td><td style="padding:4px 0;text-align:right;"><strong>${formatMoney(sale.total)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:${BRAND.textMuted};">Pago</td><td style="padding:4px 0;text-align:right;">${escapeHtml(sale.paymentMethodLabel)}</td></tr>
      </table>
      ${storeInfo ? `<p style="color:${BRAND.textMuted};font-size:12px;margin-top:16px;">${storeInfo}</p>` : ""}
      <p style="color:${BRAND.textMuted};font-size:12px;margin-top:8px;">Comprobante no válido como factura.</p>`,
    ),
  };
}

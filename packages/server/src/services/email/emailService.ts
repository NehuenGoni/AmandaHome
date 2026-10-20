import type { OrderStatus } from "@amanda/shared";
import { Resend } from "resend";
import { env, isResendConfigured } from "../../config/env.js";
import {
  adminInviteTemplate,
  adminPromotedTemplate,
  adminRevokedTemplate,
  orderConfirmationTemplate,
  orderStatusChangeTemplate,
  storeSaleReceiptTemplate,
  type StoreSaleReceiptData,
  passwordResetTemplate,
  welcomeTemplate,
  withdrawalConfirmationTemplate,
  withdrawalNotificationTemplate,
  type WithdrawalEmailData,
} from "./templates.js";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Versión en texto plano derivada del HTML: los filtros anti-spam valoran que
 * el email incluya una alternativa de texto. Los links se conservan como
 * "etiqueta (url)".
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<img\s[^>]*alt="([^"]*)"[^>]*>/gi, "$1\n")
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/(p|h1|h2|tr|div)>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

let resendClient: Resend | undefined;

function getResendClient(): Resend {
  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
}

/**
 * Nunca lanza: un email transaccional que falla no debe romper el flujo
 * principal (registro, checkout, etc.). Sin API key configurada, cae a log
 * para poder desarrollar sin cuenta de Resend.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!isResendConfigured) {
    console.log(`[email:dev] to=${params.to} subject="${params.subject}"`);
    return;
  }

  try {
    await getResendClient().emails.send({
      from: env.EMAIL_FROM,
      to: params.to,
      replyTo: env.EMAIL_REPLY_TO,
      subject: params.subject,
      html: params.html,
      text: htmlToText(params.html),
    });
  } catch (err) {
    console.error("[email] error enviando email:", err);
  }
}

export function sendWelcomeEmail(user: { email: string; firstName: string }): void {
  const { subject, html } = welcomeTemplate(user.firstName);
  void sendEmail({ to: user.email, subject, html });
}

export function sendPasswordResetEmail(
  user: { email: string; firstName: string },
  resetUrl: string,
): void {
  const { subject, html } = passwordResetTemplate(user.firstName, resetUrl);
  void sendEmail({ to: user.email, subject, html });
}

export function sendAdminInviteEmail(email: string, inviteUrl: string): void {
  const { subject, html } = adminInviteTemplate(inviteUrl);
  void sendEmail({ to: email, subject, html });
}

export function sendAdminPromotedEmail(user: { email: string; firstName: string }): void {
  const { subject, html } = adminPromotedTemplate(user.firstName);
  void sendEmail({ to: user.email, subject, html });
}

export function sendAdminRevokedEmail(user: { email: string; firstName: string }): void {
  const { subject, html } = adminRevokedTemplate(user.firstName);
  void sendEmail({ to: user.email, subject, html });
}

export function sendOrderConfirmationEmail(
  user: { email: string; firstName: string },
  order: { orderNumber: number; total: number },
): void {
  const { subject, html } = orderConfirmationTemplate(user.firstName, order);
  void sendEmail({ to: user.email, subject, html });
}

export function sendOrderStatusChangeEmail(
  user: { email: string; firstName: string },
  order: { orderNumber: number },
  newStatus: OrderStatus,
): void {
  const { subject, html } = orderStatusChangeTemplate(user.firstName, order, newStatus);
  void sendEmail({ to: user.email, subject, html });
}

export function sendStoreSaleReceiptEmail(
  to: string,
  sale: StoreSaleReceiptData,
  store: { address?: string; hours?: string },
): Promise<void> {
  const { subject, html } = storeSaleReceiptTemplate(sale, store);
  return sendEmail({ to, subject, html });
}

export function sendWithdrawalConfirmationEmail(to: string, data: WithdrawalEmailData): void {
  const { subject, html } = withdrawalConfirmationTemplate(data);
  void sendEmail({ to, subject, html });
}

/** Aviso interno al local; llega a la casilla de contacto configurada. */
export function sendWithdrawalNotificationEmail(data: WithdrawalEmailData, orderMatched: boolean): void {
  const { subject, html } = withdrawalNotificationTemplate(data, orderMatched);
  void sendEmail({ to: env.EMAIL_REPLY_TO, subject, html });
}

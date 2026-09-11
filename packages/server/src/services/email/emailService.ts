import { Resend } from "resend";
import { env, isResendConfigured } from "../../config/env.js";
import {
  adminInviteTemplate,
  adminPromotedTemplate,
  adminRevokedTemplate,
  passwordResetTemplate,
  welcomeTemplate,
} from "./templates.js";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
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
      subject: params.subject,
      html: params.html,
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

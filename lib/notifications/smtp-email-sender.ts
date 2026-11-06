import 'server-only';

import { createTransport } from 'nodemailer';

import { env } from '@/lib/env';
import { logger, maskEmail } from '@/lib/logger';
import { renderEmail } from '@/lib/notifications/render-email';
import type { EmailMessage, EmailSender } from '@/lib/notifications/types';

const GENERIC_SEND_ERROR = 'Falha ao enviar e-mail.';

/** Só o código do erro do nodemailer (ex.: `ESOCKET`): a mensagem pode trazer o destinatário. */
function readErrorCode(error: unknown): string {
  if (error instanceof Error && 'code' in error && typeof error.code === 'string') return error.code;
  return error instanceof Error ? error.name : typeof error;
}

// D4: SMTP via nodemailer (Mailpit em desenvolvimento), com HTML e texto gerados pelo React Email.
export class SmtpEmailSender implements EmailSender {
  private readonly transporter = createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: false });

  async send({ to, subject, react }: EmailMessage): Promise<void> {
    const { html, text } = await renderEmail(react);

    try {
      await this.transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
    } catch (error) {
      // O detalhe interno fica só no log; o chamador recebe um erro genérico.
      logger.error('email_send_failed', { to: maskEmail(to), errorCode: readErrorCode(error) });
      throw new Error(GENERIC_SEND_ERROR);
    }
  }
}

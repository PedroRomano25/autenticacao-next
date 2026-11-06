import 'server-only';

import type { EmailSender } from '@/lib/notifications/types';

// Esqueleto para a factory compilar; o envio por SMTP (nodemailer → Mailpit) é a tarefa 9.4 da setup-fundacao.
export class SmtpEmailSender implements EmailSender {
  send(): Promise<void> {
    return Promise.reject(new Error('SmtpEmailSender ainda não implementado.'));
  }
}

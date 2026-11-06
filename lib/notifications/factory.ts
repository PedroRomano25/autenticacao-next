import 'server-only';

import { env } from '@/lib/env';
import { ConsoleSmsSender } from '@/lib/notifications/console-sms-sender';
import { SmtpEmailSender } from '@/lib/notifications/smtp-email-sender';
import type { EmailSender, SmsSender } from '@/lib/notifications/types';

type EmailProvider = typeof env.EMAIL_PROVIDER;
type SmsProvider = typeof env.SMS_PROVIDER;

// D4: dispatch tables por provedor. Provedor novo = valor novo no enum de lib/env.ts
// + entrada aqui; os fluxos só chamam getEmailSender()/getSmsSender().
const EMAIL_SENDERS = {
  smtp: () => new SmtpEmailSender(),
} as const satisfies Record<EmailProvider, () => EmailSender>;

const SMS_SENDERS = {
  console: () => new ConsoleSmsSender(),
} as const satisfies Record<SmsProvider, () => SmsSender>;

export function getEmailSender(): EmailSender {
  return EMAIL_SENDERS[env.EMAIL_PROVIDER]();
}

export function getSmsSender(): SmsSender {
  return SMS_SENDERS[env.SMS_PROVIDER]();
}

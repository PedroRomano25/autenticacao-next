import type { ReactElement } from 'react';

// D4: interfaces dos destinos de entrega. Os fluxos dependem só delas; a
// implementação concreta é escolhida pela factory (lib/notifications/factory.ts).

export type EmailMessage = {
  to: string;
  subject: string;
  react: ReactElement;
};

export type SmsMessage = {
  to: string;
  text: string;
};

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface SmsSender {
  send(message: SmsMessage): Promise<void>;
}

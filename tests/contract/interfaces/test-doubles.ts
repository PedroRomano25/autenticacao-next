import { logger, maskEmail } from '@/lib/logger';
import type { EmailMessage, EmailSender, SmsMessage, SmsSender } from '@/lib/notifications/types';
import type {
  DeliveredEmail,
  EmailSenderHarness,
  FailingEmailSenderHarness,
} from '@/tests/contract/interfaces/email-sender-contract';
import type {
  DeliveredSms,
  FailingSmsSenderHarness,
  SmsSenderHarness,
} from '@/tests/contract/interfaces/sms-sender-contract';

// Dublês com transporte em memória injetado pelo construtor: o mesmo formato que as
// implementações reais podem seguir para simular falha de transporte na suíte de contrato.

type Transport<TMessage> = (message: TMessage) => Promise<void>;

export const TRANSPORT_ERROR_DETAIL = 'connect ECONNREFUSED 127.0.0.1:1025';
const GENERIC_EMAIL_ERROR = 'Falha ao enviar e-mail.';
const GENERIC_SMS_ERROR = 'Falha ao enviar SMS.';
const INVALID_PHONE_ERROR = 'Número de telefone fora do formato E.164.';
// D4.
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export class InMemoryEmailSender implements EmailSender {
  constructor(private readonly transport: Transport<DeliveredEmail>) {}

  async send({ to, subject }: EmailMessage): Promise<void> {
    try {
      await this.transport({ to, subject });
    } catch (error) {
      logger.error('email_send_failed', {
        to: maskEmail(to),
        reason: error instanceof Error ? error.message : String(error),
      });
      throw new Error(GENERIC_EMAIL_ERROR);
    }
  }
}

export class InMemorySmsSender implements SmsSender {
  constructor(private readonly transport: Transport<DeliveredSms>) {}

  async send({ to, text }: SmsMessage): Promise<void> {
    if (!E164_PATTERN.test(to)) throw new Error(INVALID_PHONE_ERROR);
    try {
      await this.transport({ to, text });
    } catch {
      throw new Error(GENERIC_SMS_ERROR);
    }
  }
}

// Dublês quebrados, usados só para provar que a suíte de contrato reprova cada defeito.

/** Repassa o erro do transporte ao chamador e não registra nada no log. */
export class LeakyEmailSender implements EmailSender {
  constructor(private readonly transport: Transport<DeliveredEmail>) {}

  send({ to, subject }: EmailMessage): Promise<void> {
    return this.transport({ to, subject });
  }
}

/** Não valida E.164. */
export class UnvalidatedSmsSender implements SmsSender {
  constructor(private readonly transport: Transport<DeliveredSms>) {}

  send(message: SmsMessage): Promise<void> {
    return this.transport(message);
  }
}

type Inbox<TMessage extends { to: string }> = {
  transport: Transport<TMessage>;
  readDelivered: (to: string) => Promise<readonly TMessage[]>;
};

function createInbox<TMessage extends { to: string }>(): Inbox<TMessage> {
  const delivered: TMessage[] = [];
  return {
    transport: (message) => {
      delivered.push(message);
      return Promise.resolve();
    },
    readDelivered: (to) => Promise.resolve(delivered.filter((message) => message.to === to)),
  };
}

function failingTransport(): Promise<void> {
  return Promise.reject(new Error(TRANSPORT_ERROR_DETAIL));
}

type EmailSenderConstructor = new (transport: Transport<DeliveredEmail>) => EmailSender;
type SmsSenderConstructor = new (transport: Transport<DeliveredSms>) => SmsSender;

export function createEmailHarness(Sender: EmailSenderConstructor): Promise<EmailSenderHarness> {
  const inbox = createInbox<DeliveredEmail>();
  return Promise.resolve({ sender: new Sender(inbox.transport), readDelivered: inbox.readDelivered });
}

export function createFailingEmailHarness(Sender: EmailSenderConstructor): Promise<FailingEmailSenderHarness> {
  const inbox = createInbox<DeliveredEmail>();
  return Promise.resolve({
    sender: new Sender(failingTransport),
    readDelivered: inbox.readDelivered,
    internalErrorDetail: TRANSPORT_ERROR_DETAIL,
  });
}

export function createSmsHarness(Sender: SmsSenderConstructor): Promise<SmsSenderHarness> {
  const inbox = createInbox<DeliveredSms>();
  return Promise.resolve({ sender: new Sender(inbox.transport), readDelivered: inbox.readDelivered });
}

export function createFailingSmsHarness(Sender: SmsSenderConstructor): Promise<FailingSmsSenderHarness> {
  const inbox = createInbox<DeliveredSms>();
  return Promise.resolve({
    sender: new Sender(failingTransport),
    readDelivered: inbox.readDelivered,
    internalErrorDetail: TRANSPORT_ERROR_DETAIL,
  });
}

import { randomUUID } from 'node:crypto';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EmailMessage, EmailSender } from '@/lib/notifications/types';
import { captureLogLines } from '@/tests/helpers/log-capture';

// D6: suíte de contrato de `EmailSender` que toda implementação deve passar.
// Uso: describeEmailSenderContract('SmtpEmailSender', { createHarness, createFailingHarness }).

/** O que o transporte efetivamente entregou (ex.: lido do Mailpit, para o SmtpEmailSender). */
export type DeliveredEmail = Pick<EmailMessage, 'to' | 'subject'>;

export type EmailSenderHarness = {
  sender: EmailSender;
  /** Mensagens entregues ao destinatário desde a criação do harness. */
  readDelivered: (to: string) => Promise<readonly DeliveredEmail[]>;
};

export type FailingEmailSenderHarness = EmailSenderHarness & {
  /** Trecho do erro interno do transporte (ex.: `ECONNREFUSED`) que nunca pode chegar ao chamador. */
  internalErrorDetail: string;
};

export type EmailSenderContractOptions = {
  /** Implementação com o transporte funcionando. */
  createHarness: () => Promise<EmailSenderHarness>;
  /** Mesma implementação com o transporte indisponível (falha real ou simulada). */
  createFailingHarness: () => Promise<FailingEmailSenderHarness>;
};

type ContractCase = {
  title: string;
  run: (options: EmailSenderContractOptions) => Promise<void>;
};

function buildMessage(): EmailMessage {
  return {
    to: `contrato-${randomUUID()}@exemplo.test`,
    subject: 'Confirme seu e-mail',
    react: createElement('p', null, 'Use o link para confirmar seu e-mail.'),
  };
}

async function captureRejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) return error;
  }
  throw new Error('o envio deveria ter sido rejeitado');
}

// Casos expostos para que tests/contract/interfaces/test-doubles.test.ts prove que a suíte
// reprova implementações quebradas (uma suíte que nunca falha não prova nada).
export const EMAIL_SENDER_CONTRACT = {
  validSend: {
    title: '[notificacoes] Envio de e-mail transacional: envio válido resolve e entrega destinatário e assunto',
    run: async ({ createHarness }) => {
      const { sender, readDelivered } = await createHarness();
      const message = buildMessage();

      await expect(sender.send(message)).resolves.toBeUndefined();

      expect(await readDelivered(message.to)).toEqual([{ to: message.to, subject: message.subject }]);
    },
  },
  transportFailure: {
    title:
      '[notificacoes] Falha no servidor de e-mail: rejeita com erro genérico, registra no log e não entrega',
    run: async ({ createFailingHarness }) => {
      const log = captureLogLines();
      const { sender, readDelivered, internalErrorDetail } = await createFailingHarness();
      const message = buildMessage();

      const error = await captureRejection(sender.send(message));

      expect(error.message).not.toBe('');
      expect(error.message).not.toContain(internalErrorDetail);
      expect(error.message).not.toContain(message.to);
      expect(log.readLines()).toContainEqual(expect.objectContaining({ level: 'error' }));
      expect(log.readRaw()).not.toContain(message.to);
      expect(await readDelivered(message.to)).toEqual([]);
    },
  },
} as const satisfies Record<string, ContractCase>;

export function describeEmailSenderContract(implementationName: string, options: EmailSenderContractOptions) {
  describe(`contrato EmailSender: ${implementationName}`, () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    });

    for (const contractCase of Object.values(EMAIL_SENDER_CONTRACT)) {
      it(contractCase.title, () => contractCase.run(options));
    }
  });
}

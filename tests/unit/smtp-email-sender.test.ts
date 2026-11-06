import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureLogLines } from '@/tests/helpers/log-capture';

// Unitário: o transporte do nodemailer é um dublê, para provar a configuração do SMTP, a mensagem
// entregue ao transporte e o registro da falha sem depender do Mailpit. O envio real ao Mailpit é
// coberto pelo contrato (tests/contract/interfaces/smtp-email-sender.test.ts).
const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMailMock = vi.fn<(message: Record<string, unknown>) => Promise<unknown>>();
  return { sendMail: sendMailMock, createTransport: vi.fn(() => ({ sendMail: sendMailMock })) };
});

vi.mock('nodemailer', () => ({ createTransport }));

const SMTP_HOST = 'smtp.exemplo.test';
const SMTP_PORT = 2525;
const EMAIL_FROM = 'Autenticação <nao-responder@exemplo.test>';
const RECIPIENT = 'pessoa@exemplo.test';
const MASKED_RECIPIENT = 'p***@exemplo.test';
const SUBJECT = 'Confirme seu e-mail';
const BODY_TEXT = 'Use o link para confirmar seu e-mail.';

async function createSender() {
  vi.stubEnv('SMTP_HOST', SMTP_HOST);
  vi.stubEnv('SMTP_PORT', String(SMTP_PORT));
  vi.stubEnv('EMAIL_FROM', EMAIL_FROM);
  // lib/env.ts lê o ambiente no carregamento (D5).
  vi.resetModules();
  const { SmtpEmailSender } = await import('@/lib/notifications/smtp-email-sender');
  return new SmtpEmailSender();
}

function sendSample(sender: Awaited<ReturnType<typeof createSender>>) {
  return sender.send({ to: RECIPIENT, subject: SUBJECT, react: createElement('p', null, BODY_TEXT) });
}

class ErrorWithCode extends Error {
  constructor(
    message: string,
    readonly code: unknown,
  ) {
    super(message);
  }
}

describe('lib/notifications/smtp-email-sender', () => {
  beforeEach(() => {
    createTransport.mockClear();
    sendMail.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('[notificacoes] Envio de e-mail transacional: usa o SMTP do ambiente, sem TLS implícito', async () => {
    await createSender();

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith({ host: SMTP_HOST, port: SMTP_PORT, secure: false });
  });

  it('[notificacoes] Envio de e-mail transacional: entrega remetente, destinatário, assunto, HTML e texto', async () => {
    sendMail.mockResolvedValue({});
    const sender = await createSender();

    await expect(sendSample(sender)).resolves.toBeUndefined();

    expect(sendMail).toHaveBeenCalledTimes(1);
    const { html, ...envelope } = sendMail.mock.calls[0]?.[0] ?? {};
    expect(envelope).toEqual({ from: EMAIL_FROM, to: RECIPIENT, subject: SUBJECT, text: BODY_TEXT });
    expect(html).toEqual(expect.stringContaining(BODY_TEXT));
  });

  it('[notificacoes] Falha no servidor de e-mail: registra email_send_failed com destinatário mascarado e código do erro', async () => {
    sendMail.mockRejectedValue(new ErrorWithCode(`connect ECONNREFUSED para ${RECIPIENT}`, 'ECONNREFUSED'));
    const log = captureLogLines();
    const sender = await createSender();

    await expect(sendSample(sender)).rejects.toThrow('Falha ao enviar e-mail.');

    expect(log.readLines()).toEqual([
      expect.objectContaining({
        level: 'error',
        event: 'email_send_failed',
        to: MASKED_RECIPIENT,
        errorCode: 'ECONNREFUSED',
      }),
    ]);
    expect(log.readRaw()).not.toContain(RECIPIENT);
  });

  it.each([
    { name: 'Error sem code', thrown: new TypeError(`falha para ${RECIPIENT}`), expectedErrorCode: 'TypeError' },
    { name: 'Error com code não textual', thrown: new ErrorWithCode(`falha para ${RECIPIENT}`, 535), expectedErrorCode: 'Error' },
    { name: 'objeto com code que não é Error', thrown: { code: 'EAUTH', to: RECIPIENT }, expectedErrorCode: 'object' },
    { name: 'valor que não é Error', thrown: `falha para ${RECIPIENT}`, expectedErrorCode: 'string' },
  ])(
    '[notificacoes] Falha no servidor de e-mail: $name vira errorCode "$expectedErrorCode" sem a mensagem original',
    async ({ thrown, expectedErrorCode }) => {
      sendMail.mockRejectedValue(thrown);
      const log = captureLogLines();
      const sender = await createSender();

      await expect(sendSample(sender)).rejects.toThrow('Falha ao enviar e-mail.');

      expect(log.readLines()).toEqual([
        expect.objectContaining({ event: 'email_send_failed', errorCode: expectedErrorCode }),
      ]);
      expect(log.readRaw()).not.toContain(RECIPIENT);
    },
  );
});

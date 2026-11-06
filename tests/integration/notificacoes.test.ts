import { randomUUID } from 'node:crypto';
import { createElement } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ExampleEmail } from '@/emails/example-email';
import { env } from '@/lib/env';
import { SmtpEmailSender } from '@/lib/notifications/smtp-email-sender';
import { clearMailbox, findLatestMessageTo, listMessagesTo } from '@/tests/helpers/mailpit';

const RECIPIENT_NAME = 'Maria';
const SUBJECT = 'Mensagem de exemplo';
const GREETING = `Olá, ${RECIPIENT_NAME}`;
const BODY_SENTENCE = 'Este é um e-mail de exemplo do sistema de autenticação.';
// EMAIL_FROM no formato `Nome <endereço>` (.env.example).
const SENDER_ADDRESS_PATTERN = /<([^>]+)>\s*$/;

function readSenderAddress(): string {
  return SENDER_ADDRESS_PATTERN.exec(env.EMAIL_FROM)?.[1] ?? env.EMAIL_FROM;
}

describe('notificacoes', () => {
  beforeEach(async () => {
    await clearMailbox();
  });

  it('[notificacoes] E-mail entregue no ambiente de desenvolvimento', async () => {
    const to = `integracao-${randomUUID()}@exemplo.test`;

    await new SmtpEmailSender().send({
      to,
      subject: SUBJECT,
      react: createElement(ExampleEmail, { name: RECIPIENT_NAME }),
    });

    const message = await findLatestMessageTo(to);
    expect(message).toBeDefined();
    expect(message?.To).toEqual([{ Name: '', Address: to }]);
    expect(message?.From.Address).toBe(readSenderAddress());
    expect(message?.Subject).toBe(SUBJECT);
    expect(message?.HTML).toContain('lang="pt-BR"');
    expect(message?.HTML).toContain(`<h1`);
    expect(message?.HTML).toContain(GREETING);
    expect(message?.HTML).toContain(BODY_SENTENCE);
    expect(message?.Text).toContain(GREETING);
    expect(message?.Text).toContain(BODY_SENTENCE);
    // O texto puro é texto de verdade, não o HTML repetido.
    expect(message?.Text).not.toContain('<');
  });

  it('[notificacoes] helper do Mailpit: limpar a caixa remove o que foi entregue', async () => {
    const to = `limpeza-${randomUUID()}@exemplo.test`;
    await new SmtpEmailSender().send({
      to,
      subject: SUBJECT,
      react: createElement(ExampleEmail, { name: RECIPIENT_NAME }),
    });
    expect(await listMessagesTo(to)).toHaveLength(1);

    await clearMailbox();

    expect(await listMessagesTo(to)).toEqual([]);
    expect(await findLatestMessageTo(to)).toBeUndefined();
  });

  it('[notificacoes] helper do Mailpit: devolve o último e-mail do destinatário', async () => {
    const to = `ultimo-${randomUUID()}@exemplo.test`;
    const sender = new SmtpEmailSender();
    const react = createElement(ExampleEmail, { name: RECIPIENT_NAME });

    await sender.send({ to, subject: 'Primeiro', react });
    await sender.send({ to, subject: 'Segundo', react });
    await sender.send({ to: `outro-${randomUUID()}@exemplo.test`, subject: 'De outro destinatário', react });

    expect((await listMessagesTo(to)).map(({ Subject }) => Subject)).toEqual(['Segundo', 'Primeiro']);
    expect((await findLatestMessageTo(to))?.Subject).toBe('Segundo');
  });
});

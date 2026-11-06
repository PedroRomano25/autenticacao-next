import { createServer } from 'node:net';
import { vi } from 'vitest';

import {
  describeEmailSenderContract,
  type DeliveredEmail,
} from '@/tests/contract/interfaces/email-sender-contract';
import { listMessagesTo } from '@/tests/helpers/mailpit';

const LOOPBACK_HOST = '127.0.0.1';

/** Reserva uma porta livre e a fecha: conectar nela dá ECONNREFUSED (falha real de transporte). */
function findClosedPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, LOOPBACK_HOST, () => {
      const address = server.address();
      server.close(() => {
        if (address !== null && typeof address === 'object') resolve(address.port);
        else reject(new Error('porta não reservada'));
      });
    });
  });
}

/** O que chegou de fato ao Mailpit para o destinatário (o contrato usa destinatários únicos). */
async function readDeliveredFromMailpit(to: string): Promise<DeliveredEmail[]> {
  const messages = await listMessagesTo(to);
  return messages.map(({ Subject }) => ({ to, subject: Subject }));
}

async function importSmtpEmailSender() {
  // lib/env.ts lê o ambiente no carregamento (D5): recarrega os módulos com o ambiente atual.
  vi.resetModules();
  const { SmtpEmailSender } = await import('@/lib/notifications/smtp-email-sender');
  return new SmtpEmailSender();
}

// D6: o SmtpEmailSender passa na suíte compartilhada contra o Mailpit real (SMTP do .env.local).
describeEmailSenderContract('SmtpEmailSender', {
  createHarness: async () => ({
    sender: await importSmtpEmailSender(),
    readDelivered: readDeliveredFromMailpit,
  }),
  createFailingHarness: async () => {
    vi.stubEnv('SMTP_HOST', LOOPBACK_HOST);
    vi.stubEnv('SMTP_PORT', String(await findClosedPort()));
    return {
      sender: await importSmtpEmailSender(),
      // Consulta o Mailpit de verdade para provar que nada foi entregue ao destinatário.
      readDelivered: readDeliveredFromMailpit,
      internalErrorDetail: 'ECONNREFUSED',
    };
  },
});

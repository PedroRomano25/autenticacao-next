import { createServer } from 'node:net';
import { afterEach, describe, it, vi } from 'vitest';

import { EMAIL_SENDER_CONTRACT } from '@/tests/contract/interfaces/email-sender-contract';

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

// O envio válido lê o Mailpit pelo helper tests/helpers/mailpit.ts (tarefa 9.5, qa). Até lá, este
// arquivo roda só o caso de falha; na 9.5 ele passa a chamar describeEmailSenderContract.
describe('contrato EmailSender: SmtpEmailSender', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it(EMAIL_SENDER_CONTRACT.transportFailure.title, () =>
    EMAIL_SENDER_CONTRACT.transportFailure.run({
      createHarness: () => Promise.reject(new Error('envio válido depende do helper do Mailpit (9.5)')),
      createFailingHarness: async () => {
        vi.stubEnv('SMTP_HOST', LOOPBACK_HOST);
        vi.stubEnv('SMTP_PORT', String(await findClosedPort()));
        // lib/env.ts lê o ambiente no carregamento (D5): recarrega os módulos com a porta fechada.
        vi.resetModules();
        const { SmtpEmailSender } = await import('@/lib/notifications/smtp-email-sender');
        return {
          sender: new SmtpEmailSender(),
          // Nada pode chegar ao Mailpit: o SMTP aponta para uma porta fechada.
          readDelivered: () => Promise.resolve([]),
          internalErrorDetail: 'ECONNREFUSED',
        };
      },
    }),
  );

  it.todo(`${EMAIL_SENDER_CONTRACT.validSend.title} (ligar com tests/helpers/mailpit.ts na 9.5)`);
});

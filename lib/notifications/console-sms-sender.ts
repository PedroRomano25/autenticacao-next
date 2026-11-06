import 'server-only';

import type { SmsSender } from '@/lib/notifications/types';

// Esqueleto para a factory compilar; validação E.164 e o evento sms_sent_dev são a tarefa 9.3 da setup-fundacao.
export class ConsoleSmsSender implements SmsSender {
  send(): Promise<void> {
    return Promise.reject(new Error('ConsoleSmsSender ainda não implementado.'));
  }
}

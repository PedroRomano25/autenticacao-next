import 'server-only';

import { logger, maskPhone } from '@/lib/logger';
import type { SmsMessage, SmsSender } from '@/lib/notifications/types';

// D4: E.164 validado por regex (a libphonenumber-js fica para a change `telefone`).
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const INVALID_PHONE_ERROR = 'Número de telefone fora do formato E.164.';
const GENERIC_SEND_ERROR = 'Falha ao enviar SMS.';

// D4: destino de desenvolvimento (SMS_PROVIDER=console). Exceção documentada à regra de
// não logar conteúdo: a linha `sms_sent_dev` traz o número e o texto, que pode conter OTP.
export class ConsoleSmsSender implements SmsSender {
  send({ to, text }: SmsMessage): Promise<void> {
    if (!E164_PATTERN.test(to)) return Promise.reject(new Error(INVALID_PHONE_ERROR));

    try {
      logger.info('sms_sent_dev', { to, text });
    } catch (error) {
      // O detalhe interno fica só no log (sem texto e com o número mascarado); o chamador recebe um erro genérico.
      logger.error('sms_send_failed', {
        to: maskPhone(to),
        errorName: error instanceof Error ? error.name : typeof error,
      });
      return Promise.reject(new Error(GENERIC_SEND_ERROR));
    }
    return Promise.resolve();
  }
}

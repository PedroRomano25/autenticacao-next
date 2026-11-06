import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SmsMessage, SmsSender } from '@/lib/notifications/types';

// D6: suíte de contrato de `SmsSender` que toda implementação deve passar.
// Uso: describeSmsSenderContract('ConsoleSmsSender', { createHarness, createFailingHarness }).

/** O que o transporte efetivamente entregou (ex.: a linha `sms_sent_dev`, para o ConsoleSmsSender). */
export type DeliveredSms = SmsMessage;

export type SmsSenderHarness = {
  sender: SmsSender;
  /** Mensagens entregues ao número desde a criação do harness. */
  readDelivered: (to: string) => Promise<readonly DeliveredSms[]>;
};

export type FailingSmsSenderHarness = SmsSenderHarness & {
  /** Trecho do erro interno do transporte que nunca pode chegar ao chamador. */
  internalErrorDetail: string;
};

export type SmsSenderContractOptions = {
  /** Implementação com o transporte funcionando. */
  createHarness: () => Promise<SmsSenderHarness>;
  /** Mesma implementação com o transporte falhando (falha real ou simulada). */
  createFailingHarness: () => Promise<FailingSmsSenderHarness>;
};

type ContractCase = {
  title: string;
  run: (options: SmsSenderContractOptions) => Promise<void>;
};

// O texto pode conter OTP: nenhum erro pode repeti-lo.
const SMS_TEXT = 'Seu código de verificação é 482913.';
const VALID_PHONE = '+5511999991234';

// D4: E.164 = `^\+[1-9]\d{7,14}$`. Bordas: 8 e 15 dígitos.
const VALID_E164_PHONES = [VALID_PHONE, '+12345678', '+123456789012345'] as const;
const INVALID_E164_PHONES = [
  '',
  '5511999991234', // sem `+`
  '+0511999991234', // código de país começando em 0
  '+1234567', // 7 dígitos, abaixo do mínimo
  '+1234567890123456', // 16 dígitos, acima do máximo
  '+55 11 99999-1234', // com espaço e hífen
  '+55(11)999991234', // com parênteses
  '+55119999a1234', // com letra
  ' +5511999991234', // espaço antes
  '+5511999991234\n', // quebra de linha depois
  '++5511999991234', // `+` duplicado
] as const;

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
export const SMS_SENDER_CONTRACT = {
  validSend: {
    title: '[notificacoes] Envio de SMS transacional: número E.164 válido resolve e entrega número e texto',
    run: async ({ createHarness }) => {
      const { sender, readDelivered } = await createHarness();

      for (const to of VALID_E164_PHONES) {
        await expect(sender.send({ to, text: SMS_TEXT }), `número ${to}`).resolves.toBeUndefined();
        expect(await readDelivered(to), `número ${to}`).toEqual([{ to, text: SMS_TEXT }]);
      }
    },
  },
  invalidPhone: {
    title: '[notificacoes] Número fora do padrão E.164: rejeita com erro e nada é enviado',
    run: async ({ createHarness }) => {
      const { sender, readDelivered } = await createHarness();

      for (const to of INVALID_E164_PHONES) {
        const error = await captureRejection(sender.send({ to, text: SMS_TEXT }));
        expect(error.message, `número ${JSON.stringify(to)}`).not.toContain(SMS_TEXT);
        expect(await readDelivered(to), `número ${JSON.stringify(to)}`).toEqual([]);
      }
      // Controle positivo: o mesmo harness entrega e observa um envio válido.
      await sender.send({ to: VALID_PHONE, text: SMS_TEXT });
      expect(await readDelivered(VALID_PHONE)).toEqual([{ to: VALID_PHONE, text: SMS_TEXT }]);
    },
  },
  transportFailure: {
    title: '[notificacoes] Envio de SMS transacional: falha do transporte rejeita com erro genérico e não entrega',
    run: async ({ createFailingHarness }) => {
      const { sender, readDelivered, internalErrorDetail } = await createFailingHarness();

      const error = await captureRejection(sender.send({ to: VALID_PHONE, text: SMS_TEXT }));

      expect(error.message).not.toBe('');
      expect(error.message).not.toContain(internalErrorDetail);
      expect(error.message).not.toContain(SMS_TEXT);
      expect(await readDelivered(VALID_PHONE)).toEqual([]);
    },
  },
} as const satisfies Record<string, ContractCase>;

export function describeSmsSenderContract(implementationName: string, options: SmsSenderContractOptions) {
  describe(`contrato SmsSender: ${implementationName}`, () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
    });

    for (const contractCase of Object.values(SMS_SENDER_CONTRACT)) {
      it(contractCase.title, () => contractCase.run(options));
    }
  });
}

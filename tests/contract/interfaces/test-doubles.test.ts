import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  describeEmailSenderContract,
  EMAIL_SENDER_CONTRACT,
  type EmailSenderContractOptions,
} from '@/tests/contract/interfaces/email-sender-contract';
import {
  describeSmsSenderContract,
  SMS_SENDER_CONTRACT,
  type SmsSenderContractOptions,
} from '@/tests/contract/interfaces/sms-sender-contract';
import {
  createEmailHarness,
  createFailingEmailHarness,
  createFailingSmsHarness,
  createSmsHarness,
  InMemoryEmailSender,
  InMemorySmsSender,
  LeakyEmailSender,
  TRANSPORT_ERROR_DETAIL,
  UnvalidatedSmsSender,
} from '@/tests/contract/interfaces/test-doubles';

describeEmailSenderContract('dublê em memória', {
  createHarness: () => createEmailHarness(InMemoryEmailSender),
  createFailingHarness: () => createFailingEmailHarness(InMemoryEmailSender),
});

describeSmsSenderContract('dublê em memória', {
  createHarness: () => createSmsHarness(InMemorySmsSender),
  createFailingHarness: () => createFailingSmsHarness(InMemorySmsSender),
});

describe('as suítes de contrato reprovam implementações quebradas', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const leakyEmail: EmailSenderContractOptions = {
    createHarness: () => createEmailHarness(LeakyEmailSender),
    createFailingHarness: () => createFailingEmailHarness(LeakyEmailSender),
  };
  const unvalidatedSms: SmsSenderContractOptions = {
    createHarness: () => createSmsHarness(UnvalidatedSmsSender),
    createFailingHarness: () => createFailingSmsHarness(UnvalidatedSmsSender),
  };

  it('[notificacoes] Falha no servidor de e-mail: reprova quem repassa o erro do transporte', async () => {
    await expect(EMAIL_SENDER_CONTRACT.transportFailure.run(leakyEmail)).rejects.toThrow(TRANSPORT_ERROR_DETAIL);
  });

  it('[notificacoes] Número fora do padrão E.164: reprova quem envia sem validar', async () => {
    await expect(SMS_SENDER_CONTRACT.invalidPhone.run(unvalidatedSms)).rejects.toThrow(
      'o envio deveria ter sido rejeitado',
    );
  });

  it('[notificacoes] Envio de SMS transacional: reprova quem repassa o erro do transporte', async () => {
    await expect(SMS_SENDER_CONTRACT.transportFailure.run(unvalidatedSms)).rejects.toThrow(
      TRANSPORT_ERROR_DETAIL,
    );
  });

  it('o envio válido das implementações quebradas ainda passa (a reprovação vem do defeito, não do harness)', async () => {
    await expect(EMAIL_SENDER_CONTRACT.validSend.run(leakyEmail)).resolves.toBeUndefined();
    await expect(SMS_SENDER_CONTRACT.validSend.run(unvalidatedSms)).resolves.toBeUndefined();
  });
});

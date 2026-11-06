import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsoleSmsSender } from '@/lib/notifications/console-sms-sender';
import { captureLogLines } from '@/tests/helpers/log-capture';

const PHONE = '+5511999991234';
const TEXT = 'Seu código de verificação é 482913.';
const FIXED_NOW = new Date('2026-01-15T12:34:56.789Z');

describe('lib/notifications/console-sms-sender', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('[notificacoes] SMS em desenvolvimento: escreve uma linha JSON sms_sent_dev com to e text', async () => {
    const log = captureLogLines();

    await new ConsoleSmsSender().send({ to: PHONE, text: TEXT });

    expect(log.readLines()).toEqual([
      { level: 'info', event: 'sms_sent_dev', to: PHONE, text: TEXT, timestamp: FIXED_NOW.toISOString() },
    ]);
  });

  it('[notificacoes] Número fora do padrão E.164: rejeita sem escrever no log nem repetir o texto', async () => {
    const log = captureLogLines();
    const sender = new ConsoleSmsSender();

    await expect(sender.send({ to: '5511999991234', text: TEXT })).rejects.toThrow(/E\.164/);
    expect(log.readRaw()).not.toContain('sms_sent_dev');

    // Controle positivo: a mesma captura registra um envio válido.
    await sender.send({ to: PHONE, text: TEXT });
    expect(log.readLines()).toContainEqual(expect.objectContaining({ event: 'sms_sent_dev', to: PHONE }));
  });

  it('[notificacoes] Envio de SMS transacional: falha ao escrever registra sms_send_failed com o número mascarado', async () => {
    const log = captureLogLines();
    vi.spyOn(console, 'info').mockImplementation(() => {
      throw new Error('stdout fechado');
    });

    await expect(new ConsoleSmsSender().send({ to: PHONE, text: TEXT })).rejects.toThrow('Falha ao enviar SMS.');

    expect(log.readLines()).toContainEqual(
      expect.objectContaining({ level: 'error', event: 'sms_send_failed', to: '+55******1234' }),
    );
    expect(log.readRaw()).not.toContain(PHONE);
    expect(log.readRaw()).not.toContain(TEXT);
  });
});

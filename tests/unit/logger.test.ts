import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger, maskEmail, maskPhone } from '@/lib/logger';

const FIXED_NOW = new Date('2026-01-15T12:34:56.789Z');

function parseSingleLine(output: unknown): Record<string, unknown> {
  if (typeof output !== 'string') throw new Error('o logger deve escrever uma string');
  expect(output).not.toContain('\n');
  const parsed: unknown = JSON.parse(output);
  if (typeof parsed !== 'object' || parsed === null) throw new Error('linha não é um objeto JSON');
  return Object.fromEntries(Object.entries(parsed));
}

describe('lib/logger', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    ['info', 'info'],
    ['warn', 'warn'],
    ['error', 'error'],
  ] as const)('logger.%s escreve uma linha JSON com level, event, timestamp e campos', (level, consoleMethod) => {
    const spy = vi.spyOn(console, consoleMethod).mockImplementation(() => undefined);

    logger[level]('email_send_failed', { userId: 'u_1', durationMs: 12, code: 'UNEXPECTED' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toHaveLength(1);
    expect(parseSingleLine(spy.mock.calls[0]?.[0])).toEqual({
      level,
      event: 'email_send_failed',
      timestamp: FIXED_NOW.toISOString(),
      userId: 'u_1',
      durationMs: 12,
      code: 'UNEXPECTED',
    });
  });

  it('escreve só level, event e timestamp quando não há campos', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logger.info('server_started');

    expect(parseSingleLine(spy.mock.calls[0]?.[0])).toEqual({
      level: 'info',
      event: 'server_started',
      timestamp: FIXED_NOW.toISOString(),
    });
  });

  it('campos não sobrescrevem level, event nem timestamp', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    logger.warn('rate_limited', { level: 'info', event: 'outro', timestamp: 'ontem' });

    expect(parseSingleLine(spy.mock.calls[0]?.[0])).toMatchObject({
      level: 'warn',
      event: 'rate_limited',
      timestamp: FIXED_NOW.toISOString(),
    });
  });

  it('valores com quebra de linha continuam numa linha só', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.error('unexpected_error', { detail: 'linha 1\nlinha 2' });

    expect(parseSingleLine(spy.mock.calls[0]?.[0])).toMatchObject({ detail: 'linha 1\nlinha 2' });
  });
});

describe('maskEmail', () => {
  it.each([
    ['pedro@gmail.com', 'p***@gmail.com'],
    ['a@b.com', 'a***@b.com'],
    ['nome.sobrenome@empresa.com.br', 'n***@empresa.com.br'],
    ['"a@b"@exemplo.com', '"***@exemplo.com'],
  ])('mascara %s como %s', (email, masked) => {
    expect(maskEmail(email)).toBe(masked);
  });

  it.each(['sem-arroba', '@gmail.com', ''])('mascara por inteiro o valor sem parte local: "%s"', (value) => {
    expect(maskEmail(value)).toBe('***');
  });
});

describe('maskPhone', () => {
  it.each([
    ['+5511999991234', '+55******1234'],
    ['+14155552671', '+14******2671'],
    ['+12345678', '+12******5678'],
  ])('mascara %s como %s', (phone, masked) => {
    expect(maskPhone(phone)).toBe(masked);
  });

  it.each(['+1234567', '+55', ''])('mascara por inteiro o número curto demais: "%s"', (value) => {
    expect(maskPhone(value)).toBe('******');
  });
});

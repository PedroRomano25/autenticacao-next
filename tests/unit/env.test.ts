import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// lib/env.ts faz o parse no carregamento do módulo (D5): cada teste define o
// ambiente com vi.stubEnv e importa o módulo de novo depois de vi.resetModules().
const VALID_ENV = {
  BETTER_AUTH_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres-0123456789',
  BETTER_AUTH_URL: 'http://localhost:3000',
  DATABASE_URL: 'mysql://auth:senha@127.0.0.1:3306/auth_dev',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  EMAIL_FROM: 'Autenticação <nao-responder@localhost>',
  EMAIL_PROVIDER: 'smtp',
  SMS_PROVIDER: 'console',
} as const;

const ENV_EXAMPLE_SECRET_PLACEHOLDER = 'troque-por-npm-run-env-init';

function stubEnv(overrides: Partial<Record<keyof typeof VALID_ENV, string | undefined>>) {
  for (const [name, value] of Object.entries({ ...VALID_ENV, ...overrides })) {
    vi.stubEnv(name, value);
  }
}

async function loadEnv() {
  const { env } = await import('@/lib/env');
  return env;
}

async function loadEnvError(): Promise<Error> {
  try {
    await loadEnv();
  } catch (error) {
    if (error instanceof Error) return error;
    throw new Error('lib/env.ts lançou algo que não é Error');
  }
  throw new Error('lib/env.ts deveria ter lançado erro');
}

describe('lib/env', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('[ambiente-local] aceita o ambiente válido e converte a porta SMTP em número', async () => {
    stubEnv({});

    const env = await loadEnv();

    expect(env.BETTER_AUTH_SECRET).toBe(VALID_ENV.BETTER_AUTH_SECRET);
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.EMAIL_PROVIDER).toBe('smtp');
    expect(env.SMS_PROVIDER).toBe('console');
  });

  it('[ambiente-local] Variável obrigatória ausente', async () => {
    stubEnv({ BETTER_AUTH_SECRET: undefined });

    const error = await loadEnvError();

    expect(error.message).toContain('BETTER_AUTH_SECRET');
  });

  it('[ambiente-local] lista todas as variáveis inválidas, sem repetir nem citar as válidas', async () => {
    stubEnv({ DATABASE_URL: undefined, SMTP_PORT: 'porta', EMAIL_PROVIDER: 'resend' });

    const error = await loadEnvError();

    expect(error.message).toContain('DATABASE_URL');
    expect(error.message).toContain('SMTP_PORT');
    expect(error.message).toContain('EMAIL_PROVIDER');
    expect(error.message).not.toContain('BETTER_AUTH_SECRET');
    expect(error.message.match(/SMTP_PORT/g)).toHaveLength(1);
  });

  it('[ambiente-local] Segredo curto demais', async () => {
    const shortSecret = 'segredo-curto-com-31-caracteres';
    expect(shortSecret).toHaveLength(31);
    stubEnv({ BETTER_AUTH_SECRET: shortSecret });

    const error = await loadEnvError();

    expect(error.message).toContain('BETTER_AUTH_SECRET');
    expect(error.message).not.toContain(shortSecret);
  });

  it('[ambiente-local] aceita segredo com exatamente 32 caracteres', async () => {
    const secret = 'a'.repeat(32);
    stubEnv({ BETTER_AUTH_SECRET: secret });

    const env = await loadEnv();

    expect(env.BETTER_AUTH_SECRET).toBe(secret);
  });

  it('[ambiente-local] recusa o placeholder do .env.example sem exibi-lo', async () => {
    stubEnv({ BETTER_AUTH_SECRET: ENV_EXAMPLE_SECRET_PLACEHOLDER });

    const error = await loadEnvError();

    expect(error.message).toContain('BETTER_AUTH_SECRET');
    expect(error.message).not.toContain(ENV_EXAMPLE_SECRET_PLACEHOLDER);
  });

  it('[ambiente-local] recusa o placeholder mesmo completado até 32 caracteres', async () => {
    const paddedPlaceholder = ENV_EXAMPLE_SECRET_PLACEHOLDER.padEnd(32, 'x');
    stubEnv({ BETTER_AUTH_SECRET: paddedPlaceholder });

    const error = await loadEnvError();

    expect(error.message).toContain('BETTER_AUTH_SECRET');
    expect(error.message).not.toContain(paddedPlaceholder);
  });

  it.each([
    ['SMTP_PORT', '0'],
    ['SMTP_PORT', '65536'],
    ['SMTP_PORT', '25.5'],
    ['SMTP_HOST', ''],
    ['EMAIL_FROM', ''],
    ['SMS_PROVIDER', 'twilio'],
    ['BETTER_AUTH_URL', 'ftp://localhost'],
    ['DATABASE_URL', 'http://127.0.0.1:3306/auth_dev'],
  ] as const)('[ambiente-local] recusa %s = "%s"', async (name, value) => {
    stubEnv({ [name]: value });

    const error = await loadEnvError();

    expect(error.message).toContain(name);
  });

  it('[ambiente-local] aceita as portas nos limites 1 e 65535', async () => {
    stubEnv({ SMTP_PORT: '1' });
    expect((await loadEnv()).SMTP_PORT).toBe(1);

    vi.resetModules();
    stubEnv({ SMTP_PORT: '65535' });
    expect((await loadEnv()).SMTP_PORT).toBe(65_535);
  });

  it('[ambiente-local] a mensagem de erro não contém o valor de nenhuma variável', async () => {
    const invalidUrl = 'nao-e-uma-url-secreta';
    stubEnv({ BETTER_AUTH_URL: invalidUrl, DATABASE_URL: 'postgres://u:senha-do-banco@h/db' });

    const error = await loadEnvError();

    expect(error.message).toContain('BETTER_AUTH_URL');
    expect(error.message).toContain('DATABASE_URL');
    expect(error.message).not.toContain(invalidUrl);
    expect(error.message).not.toContain('senha-do-banco');
    expect(error.message).not.toContain(VALID_ENV.BETTER_AUTH_SECRET);
  });
});

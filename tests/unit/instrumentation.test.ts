import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// D5: register() valida o env na inicialização do servidor (runtime nodejs).
describe('instrumentation register()', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('[ambiente-local] Variável obrigatória ausente: falha ao iniciar nomeando a variável', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('BETTER_AUTH_SECRET', undefined);
    const { register } = await import('@/instrumentation');

    await expect(register()).rejects.toThrow('BETTER_AUTH_SECRET');
  });

  it('[ambiente-local] com o ambiente válido, inicia sem erro', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    const { register } = await import('@/instrumentation');

    await expect(register()).resolves.toBeUndefined();
  });

  it('não valida no runtime edge (lib/env.ts é só do Node)', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    vi.stubEnv('BETTER_AUTH_SECRET', undefined);
    const { register } = await import('@/instrumentation');

    await expect(register()).resolves.toBeUndefined();
  });
});

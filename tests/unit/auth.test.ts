import { describe, expect, it } from 'vitest';

import { auth } from '@/lib/auth';
import {
  SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from '@/lib/constants/auth';

// Só lê a configuração e o contexto do Better Auth: nenhuma consulta ao banco.
describe('lib/auth', () => {
  it('[sessao] Duração e renovação deslizante: expiresIn de 30 dias e updateAge de 1 dia', () => {
    expect(auth.options.session.expiresIn).toBe(SESSION_EXPIRES_IN_SECONDS);
    expect(auth.options.session.updateAge).toBe(SESSION_UPDATE_AGE_SECONDS);
    expect(SESSION_EXPIRES_IN_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(SESSION_UPDATE_AGE_SECONDS).toBe(24 * 60 * 60);
  });

  it('[sessao] Sessões persistidas no servidor: cookie cache de no máximo 5 minutos', () => {
    expect(auth.options.session.cookieCache).toEqual({
      enabled: true,
      maxAge: SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
    });
    expect(SESSION_COOKIE_CACHE_MAX_AGE_SECONDS).toBe(5 * 60);
  });

  it('[D2] Rate limit habilitado e guardado no banco', () => {
    expect(auth.options.rateLimit).toMatchObject({ enabled: true, storage: 'database' });
  });

  it('[sessao] Cookie inacessível ao JavaScript: HttpOnly, Secure, SameSite=Lax e Path=/', async () => {
    const { authCookies } = await auth.$context;
    const { name, attributes } = authCookies.sessionToken;

    expect(name.startsWith('__Secure-')).toBe(true);
    expect(attributes).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
    expect(authCookies.sessionData.attributes).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('[D2] Server Actions podem definir cookies: plugin nextCookies registrado', () => {
    const pluginIds = auth.options.plugins.map((plugin) => plugin.id);
    expect(pluginIds).toContain('next-cookies');
  });
});

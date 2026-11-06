import { describe, expect, it } from 'vitest';

import { auth } from '@/lib/auth';
import {
  anonymousSessionSchema,
  authenticatedSessionSchema,
} from '@/tests/contract/schemas/get-session';
import {
  buildSessionTokenCookie,
  createTestSession,
  findSetCookie,
  requestGetSession,
  toCookiePair,
} from '@/tests/helpers/session';

const JSON_CONTENT_TYPE = 'application/json';

async function readJson(response: Response): Promise<unknown> {
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain(JSON_CONTENT_TYPE);
  return response.json();
}

describe('contrato GET /api/auth/get-session', () => {
  it('[sessao] Sem sessão', async () => {
    const body = await readJson(await requestGetSession());

    expect(anonymousSessionSchema.parse(body)).toBeNull();
  });

  it('[sessao] Sem sessão: cookie de token inexistente responde no mesmo formato', async () => {
    const body = await readJson(await requestGetSession(await buildSessionTokenCookie('inexistente')));

    expect(anonymousSessionSchema.parse(body)).toBeNull();
  });

  it('[sessao] Endpoint de consulta da sessão: com sessão (lida do banco)', async () => {
    const { session, user } = await createTestSession();

    const body = await readJson(await requestGetSession(await buildSessionTokenCookie(session.token)));

    const parsed = authenticatedSessionSchema.parse(body);
    expect(parsed.session.id).toBe(session.id);
    expect(parsed.user.id).toBe(user.id);
  });

  it('[sessao] Endpoint de consulta da sessão: com sessão (lida do cookie cache)', async () => {
    const { session, user } = await createTestSession();
    const { authCookies } = await auth.$context;
    const tokenCookie = await buildSessionTokenCookie(session.token);
    const firstResponse = await requestGetSession(tokenCookie);
    const sessionDataCookie = findSetCookie(firstResponse, authCookies.sessionData.name);
    expect(sessionDataCookie).toBeDefined();

    const body = await readJson(
      await requestGetSession(`${tokenCookie}; ${toCookiePair(sessionDataCookie ?? '')}`),
    );

    const parsed = authenticatedSessionSchema.parse(body);
    expect(parsed.session.id).toBe(session.id);
    expect(parsed.user.id).toBe(user.id);
  });
});

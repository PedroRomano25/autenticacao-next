import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import {
  SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from '@/lib/constants/auth';
import {
  buildSessionTokenCookie,
  createTestSession,
  deleteSessionRow,
  findSessionRow,
  findSetCookie,
  requestGetSession,
  signSessionToken,
  toCookiePair,
} from '@/tests/helpers/session';

const START = new Date('2026-03-10T12:00:00.000Z');
const ONE_SECOND_MS = 1000;
const EXPIRES_IN_MS = SESSION_EXPIRES_IN_SECONDS * ONE_SECOND_MS;
const UPDATE_AGE_MS = SESSION_UPDATE_AGE_SECONDS * ONE_SECOND_MS;
const COOKIE_CACHE_MS = SESSION_COOKIE_CACHE_MAX_AGE_SECONDS * ONE_SECOND_MS;

// Só os campos que estes testes leem; o formato completo é do contrato (tests/contract/).
const getSessionBodySchema = z
  .object({
    session: z.object({ id: z.string(), expiresAt: z.iso.datetime() }),
    user: z.object({ id: z.string() }),
  })
  .nullable();

async function readBody(response: Response): Promise<z.infer<typeof getSessionBodySchema>> {
  expect(response.status).toBe(200);
  return getSessionBodySchema.parse(await response.json());
}

function advanceTo(offsetMs: number): Date {
  const now = new Date(START.getTime() + offsetMs);
  vi.setSystemTime(now);
  return now;
}

describe('sessao', () => {
  beforeEach(() => {
    // D6: só o Date é falso; timers falsos completos travam o mysql2.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Duração e renovação deslizante da sessão', () => {
    it('[sessao] Sessão expirada', async () => {
      const { session } = await createTestSession();
      const cookie = await buildSessionTokenCookie(session.token);

      advanceTo(EXPIRES_IN_MS + ONE_SECOND_MS);
      const body = await readBody(await requestGetSession(cookie));

      expect(body).toBeNull();
    });

    it('[sessao] Sessão expirada: ainda vale 1 segundo antes dos 30 dias', async () => {
      const { session, user } = await createTestSession();
      const cookie = await buildSessionTokenCookie(session.token);

      advanceTo(EXPIRES_IN_MS - ONE_SECOND_MS);
      const body = await readBody(await requestGetSession(cookie));

      expect(body?.user.id).toBe(user.id);
    });

    it('[sessao] Renovação por uso', async () => {
      const { session } = await createTestSession();
      const cookie = await buildSessionTokenCookie(session.token);
      expect(session.expiresAt.getTime()).toBe(START.getTime() + EXPIRES_IN_MS);

      const usedAt = advanceTo(UPDATE_AGE_MS + ONE_SECOND_MS);
      const body = await readBody(await requestGetSession(cookie));

      const renewedExpiresAt = usedAt.getTime() + EXPIRES_IN_MS;
      expect(body?.session.id).toBe(session.id);
      expect(new Date(body?.session.expiresAt ?? '').getTime()).toBe(renewedExpiresAt);
      expect((await findSessionRow(session.id))?.expiresAt.getTime()).toBe(renewedExpiresAt);
    });

    it('[sessao] Uso dentro de 1 dia não renova', async () => {
      const { session } = await createTestSession();
      const cookie = await buildSessionTokenCookie(session.token);
      const { authCookies } = await auth.$context;

      advanceTo(UPDATE_AGE_MS - ONE_SECOND_MS);
      const response = await requestGetSession(cookie);
      const body = await readBody(response);

      const originalExpiresAt = START.getTime() + EXPIRES_IN_MS;
      expect(body?.session.id).toBe(session.id);
      expect(new Date(body?.session.expiresAt ?? '').getTime()).toBe(originalExpiresAt);
      expect((await findSessionRow(session.id))?.expiresAt.getTime()).toBe(originalExpiresAt);
      // Só o cookie cache é emitido; o cookie de token não é renovado.
      expect(findSetCookie(response, authCookies.sessionData.name)).toBeDefined();
      expect(findSetCookie(response, authCookies.sessionToken.name)).toBeUndefined();
    });
  });

  describe('Sessões persistidas no servidor', () => {
    it('[sessao] Sessão revogada no banco deixa de valer', async () => {
      const { session, user } = await createTestSession();
      const cookie = await buildSessionTokenCookie(session.token);
      expect((await readBody(await requestGetSession(cookie)))?.user.id).toBe(user.id);

      await deleteSessionRow(session.id);
      const body = await readBody(await requestGetSession(cookie));

      expect(body).toBeNull();
    });

    it('[sessao] Sessão revogada no banco deixa de valer: cookie cache vale no máximo 5 minutos', async () => {
      const { session, user } = await createTestSession();
      const { authCookies } = await auth.$context;
      const tokenCookie = await buildSessionTokenCookie(session.token);
      const firstResponse = await requestGetSession(tokenCookie);
      expect((await readBody(firstResponse))?.user.id).toBe(user.id);
      const sessionDataCookie = findSetCookie(firstResponse, authCookies.sessionData.name);
      expect(sessionDataCookie).toBeDefined();
      const cookieWithCache = `${tokenCookie}; ${toCookiePair(sessionDataCookie ?? '')}`;

      await deleteSessionRow(session.id);

      advanceTo(COOKIE_CACHE_MS - ONE_SECOND_MS);
      const insideWindow = await readBody(await requestGetSession(cookieWithCache));
      expect(insideWindow?.user.id).toBe(user.id);

      advanceTo(COOKIE_CACHE_MS + ONE_SECOND_MS);
      const afterWindow = await readBody(await requestGetSession(cookieWithCache));
      expect(afterWindow).toBeNull();
    });

    it('[sessao] Cookie adulterado: token inexistente com assinatura válida', async () => {
      const { session, user } = await createTestSession();
      expect(
        (await readBody(await requestGetSession(await buildSessionTokenCookie(session.token))))?.user
          .id,
      ).toBe(user.id);

      const body = await readBody(
        await requestGetSession(await buildSessionTokenCookie(`${session.token}inexistente`)),
      );

      expect(body).toBeNull();
    });

    it('[sessao] Cookie adulterado: token existente com assinatura inválida', async () => {
      const { session, user } = await createTestSession();
      const { authCookies } = await auth.$context;
      const validCookie = await buildSessionTokenCookie(session.token);
      expect((await readBody(await requestGetSession(validCookie)))?.user.id).toBe(user.id);

      // Troca o primeiro caractere da assinatura base64 válida.
      const signature = decodeURIComponent(await signSessionToken(session.token)).slice(
        session.token.length + 1,
      );
      const tamperedSignature = `${signature.startsWith('A') ? 'B' : 'A'}${signature.slice(1)}`;
      const tamperedCookie = `${authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${tamperedSignature}`)}`;
      const body = await readBody(await requestGetSession(tamperedCookie));

      expect(body).toBeNull();
    });
  });

  describe('Atributos do cookie de sessão', () => {
    it('[sessao] Cookie inacessível ao JavaScript', async () => {
      const { session } = await createTestSession();
      const { authCookies } = await auth.$context;
      const cookie = await buildSessionTokenCookie(session.token);

      advanceTo(UPDATE_AGE_MS + ONE_SECOND_MS);
      const response = await requestGetSession(cookie);
      expect((await readBody(response))?.session.id).toBe(session.id);

      const setCookie = findSetCookie(response, authCookies.sessionToken.name);
      expect(setCookie).toBeDefined();
      const attributes = (setCookie ?? '').split(';').map((part) => part.trim());
      expect(attributes).toEqual(
        expect.arrayContaining([
          'HttpOnly',
          'Secure',
          'SameSite=Lax',
          'Path=/',
          `Max-Age=${String(SESSION_EXPIRES_IN_SECONDS)}`,
        ]),
      );
    });
  });
});

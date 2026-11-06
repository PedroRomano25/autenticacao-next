import { randomUUID } from 'node:crypto';

import { makeSignature } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { session as sessionTable } from '@/db/schema/auth';
import { auth } from '@/lib/auth';

const TEST_USER_NAME = 'Pessoa de Teste';
const GET_SESSION_PATH = '/get-session';

// D6: sem método de login nesta change, usuário e sessão nascem pelo internalAdapter.
export async function createTestSession() {
  const { internalAdapter } = await auth.$context;
  const user = await internalAdapter.createUser(
    { name: TEST_USER_NAME, email: `teste-${randomUUID()}@exemplo.com` },
    { method: 'email-password' },
  );
  const session = await internalAdapter.createSession(user.id);
  return { user, session };
}

// Valor do cookie assinado pelo utilitário do próprio Better Auth (`<token>.<assinatura>`, URL-encoded).
export async function signSessionToken(token: string): Promise<string> {
  const { secret } = await auth.$context;
  return encodeURIComponent(`${token}.${await makeSignature(token, secret)}`);
}

// Cabeçalho `Cookie` só com o token de sessão (sem o cookie cache): a resposta reflete o banco.
export async function buildSessionTokenCookie(token: string): Promise<string> {
  const { authCookies } = await auth.$context;
  return `${authCookies.sessionToken.name}=${await signSessionToken(token)}`;
}

export async function requestGetSession(cookie?: string): Promise<Response> {
  const { baseURL } = await auth.$context;
  const headers = new Headers();
  if (cookie !== undefined) {
    headers.set('cookie', cookie);
  }
  return auth.handler(new Request(`${baseURL}${GET_SESSION_PATH}`, { headers }));
}

// `Set-Cookie` emitido para um cookie (nome exato), ou undefined.
export function findSetCookie(response: Response, cookieName: string): string | undefined {
  return response.headers.getSetCookie().find((header) => header.startsWith(`${cookieName}=`));
}

// Par `nome=valor` de um `Set-Cookie`, para reenviar no cabeçalho `Cookie`.
export function toCookiePair(setCookie: string): string {
  return setCookie.split(';', 1)[0] ?? '';
}

export async function findSessionRow(
  sessionId: string,
): Promise<typeof sessionTable.$inferSelect | undefined> {
  const [row] = await db.select().from(sessionTable).where(eq(sessionTable.id, sessionId));
  return row;
}

export async function deleteSessionRow(sessionId: string): Promise<void> {
  await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
}

import { describe, expect, it } from 'vitest';

import { auth } from '@/lib/auth';

// Rota com limite especial do Better Auth (3 requisições por 10 s por chave).
const SIGN_IN_EMAIL_PATH = '/sign-in/email';
const ATTEMPTS = 6;
const TOO_MANY_REQUESTS = 429;

async function postSignIn(forwardedFor: string): Promise<Response> {
  const { baseURL } = await auth.$context;
  return auth.handler(
    new Request(`${baseURL}${SIGN_IN_EMAIL_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': forwardedFor },
      body: JSON.stringify({ email: 'pessoa@exemplo.com', password: 'senha-errada' }),
    }),
  );
}

describe('rate limit', () => {
  // Achado do security: sem proxy na frente, X-Forwarded-For vem do cliente e não pode compor a chave.
  it('[security: X-Forwarded-For não é confiável] trocar X-Forwarded-For a cada requisição não escapa do limite', async () => {
    const statuses: number[] = [];
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const response = await postSignIn(`10.0.0.${String(attempt)}`);
      statuses.push(response.status);
    }

    expect(statuses).toContain(TOO_MANY_REQUESTS);
    expect(statuses.slice(0, 3)).not.toContain(TOO_MANY_REQUESTS);
  });
});

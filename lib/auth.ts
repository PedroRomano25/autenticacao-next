import 'server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';

import { db } from '@/db';
import * as schema from '@/db/schema/auth';
import {
  SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from '@/lib/constants/auth';

// D2: `secret` e `baseURL` vêm de BETTER_AUTH_SECRET e BETTER_AUTH_URL, validadas em lib/env.ts
// (importado por db/index.ts antes de a instância ser criada).
export const auth = betterAuth({
  // D2: schema gerado pela CLI do Better Auth (db/schema/auth.ts), em snake_case.
  database: drizzleAdapter(db, { provider: 'mysql', schema }),
  // spec sessao: Duração e renovação deslizante da sessão; Sessões persistidas no servidor.
  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
    cookieCache: { enabled: true, maxAge: SESSION_COOKIE_CACHE_MAX_AGE_SECONDS },
  },
  // D2: tabela gerada agora; os limites por rota entram na próxima change.
  rateLimit: { enabled: true, storage: 'database' },
  // spec sessao: Atributos do cookie de sessão (HttpOnly, Secure, SameSite=Lax, Path=/).
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
  },
  // nextCookies() precisa ser o último plugin.
  plugins: [nextCookies()],
});

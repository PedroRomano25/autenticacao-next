import 'server-only';

import { z } from 'zod';

// D5: o BETTER_AUTH_SECRET precisa de no mínimo 32 caracteres.
const MIN_SECRET_LENGTH = 32;
// D5: valor de exemplo do `.env.example`; nunca pode virar o segredo real.
const ENV_EXAMPLE_SECRET_PLACEHOLDER = 'troque-por-npm-run-env-init';
const MAX_TCP_PORT = 65_535;

const envSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(MIN_SECRET_LENGTH)
    .refine((secret) => !secret.includes(ENV_EXAMPLE_SECRET_PLACEHOLDER)),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
  DATABASE_URL: z.url({ protocol: /^mysql$/ }),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(MAX_TCP_PORT),
  EMAIL_FROM: z.string().min(1),
  EMAIL_PROVIDER: z.enum(['smtp']),
  SMS_PROVIDER: z.enum(['console']),
});

function parseEnv(source: NodeJS.ProcessEnv) {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  // Só os nomes das variáveis: os valores (inclusive segredos) nunca entram na mensagem.
  const invalidNames = new Set(result.error.issues.map((issue) => String(issue.path[0])));
  throw new Error(
    `Variáveis de ambiente ausentes ou inválidas: ${[...invalidNames].join(', ')}. ` +
      'Confira o .env.local (npm run env:init cria um a partir do .env.example).',
  );
}

export const env = parseEnv(process.env);

import { z } from 'zod';

// Contrato de GET /api/auth/get-session (spec sessao: Endpoint de consulta da sessão).
// `strictObject`: campo novo (ex.: hash ou dado técnico vazando) ou removido quebra o contrato.
const sessionSchema = z.strictObject({
  id: z.string().min(1),
  userId: z.string().min(1),
  token: z.string().min(1),
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});

const userSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const authenticatedSessionSchema = z.strictObject({
  session: sessionSchema,
  user: userSchema,
});

// Sem sessão: 200 com corpo `null`.
export const anonymousSessionSchema = z.null();

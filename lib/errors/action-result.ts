import type { ErrorCode } from '@/lib/errors/codes';

// Retorno de toda Server Action (skill boas-praticas-servidor, seção 6).
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; fieldErrors?: Record<string, string[]> };

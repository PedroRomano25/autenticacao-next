import type { ErrorCode } from '@/lib/errors/codes';

// Mensagens em pt-BR exibidas ao usuário, uma por código do catálogo.
export const ERROR_MESSAGES = {
  UNEXPECTED: 'Não foi possível concluir. Tente novamente.',
  VALIDATION_FAILED: 'Confira os campos destacados e tente novamente.',
} as const satisfies Record<ErrorCode, string>;

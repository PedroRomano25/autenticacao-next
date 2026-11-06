// Catálogo único de códigos de erro das Server Actions (D8). Os fluxos acrescentam
// códigos aqui; cada código novo exige a mensagem em messages.ts (não compila sem ela).
export const ERROR_CODES = ['UNEXPECTED', 'VALIDATION_FAILED'] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

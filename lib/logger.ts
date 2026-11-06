// Logger mínimo (D8): uma linha JSON por evento. Único arquivo com `console.*`.
// NUNCA registre senha, hash, token, OTP, link, cookie ou segredo; e-mail e
// telefone só via maskEmail/maskPhone.

type LogLevel = 'info' | 'warn' | 'error';
type LogFields = Readonly<Record<string, unknown>>;

const CONSOLE_BY_LEVEL = {
  info: (line: string) => {
    console.info(line);
  },
  warn: (line: string) => {
    console.warn(line);
  },
  error: (line: string) => {
    console.error(line);
  },
} as const satisfies Record<LogLevel, (line: string) => void>;

function write(level: LogLevel, event: string, fields: LogFields = {}) {
  // Os campos vêm antes: não podem sobrescrever level, event nem timestamp.
  const line = JSON.stringify({ ...fields, level, event, timestamp: new Date().toISOString() });
  CONSOLE_BY_LEVEL[level](line);
}

export const logger = {
  info: (event: string, fields?: LogFields) => {
    write('info', event, fields);
  },
  warn: (event: string, fields?: LogFields) => {
    write('warn', event, fields);
  },
  error: (event: string, fields?: LogFields) => {
    write('error', event, fields);
  },
} as const satisfies Record<LogLevel, (event: string, fields?: LogFields) => void>;

const EMAIL_MASK = '***';
const PHONE_MASK = '******';
// Formato da skill boas-praticas-servidor, seção 7: `+55******1234`.
const PHONE_VISIBLE_PREFIX_LENGTH = 3;
const PHONE_VISIBLE_SUFFIX_LENGTH = 4;
// D4: E.164 tem no mínimo `+` e 8 dígitos (`^\+[1-9]\d{7,14}$`).
const E164_MIN_LENGTH = 9;

/** `pedro@gmail.com` → `p***@gmail.com`. Sem parte local, mascara tudo. */
export function maskEmail(email: string): string {
  const atIndex = email.lastIndexOf('@');
  if (atIndex < 1) return EMAIL_MASK;
  return `${email.charAt(0)}${EMAIL_MASK}${email.slice(atIndex)}`;
}

/** `+5511999991234` → `+55******1234`. Mais curto que um E.164, mascara tudo. */
export function maskPhone(phone: string): string {
  if (phone.length < E164_MIN_LENGTH) return PHONE_MASK;
  return `${phone.slice(0, PHONE_VISIBLE_PREFIX_LENGTH)}${PHONE_MASK}${phone.slice(-PHONE_VISIBLE_SUFFIX_LENGTH)}`;
}

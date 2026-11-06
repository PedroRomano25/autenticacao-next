import { describe, expect, expectTypeOf, it } from 'vitest';

import type { ActionResult } from '@/lib/errors/action-result';
import { ERROR_CODES, type ErrorCode } from '@/lib/errors/codes';
import { ERROR_MESSAGES } from '@/lib/errors/messages';

describe('lib/errors', () => {
  it('o catálogo inicial tem UNEXPECTED e VALIDATION_FAILED', () => {
    expect(ERROR_CODES).toEqual(['UNEXPECTED', 'VALIDATION_FAILED']);
    expectTypeOf<ErrorCode>().toEqualTypeOf<'UNEXPECTED' | 'VALIDATION_FAILED'>();
  });

  it.each(ERROR_CODES)('o código %s tem mensagem em pt-BR não vazia', (code) => {
    expect(Object.hasOwn(ERROR_MESSAGES, code)).toBe(true);
    expect(ERROR_MESSAGES[code].trim()).not.toBe('');
  });

  it('não há mensagem para código fora do catálogo', () => {
    expect(Object.keys(ERROR_MESSAGES).sort()).toEqual([...ERROR_CODES].sort());
  });

  it('ActionResult<T> tem um ramo de sucesso com data e um de erro com code do catálogo', () => {
    expectTypeOf<ActionResult<{ userId: string }>>().toEqualTypeOf<
      | { ok: true; data: { userId: string } }
      | { ok: false; code: ErrorCode; fieldErrors?: Record<string, string[]> }
    >();
    expectTypeOf<ActionResult>().extract<{ ok: true }>().toEqualTypeOf<{ ok: true; data: void }>();

    const failure: ActionResult = { ok: false, code: 'VALIDATION_FAILED', fieldErrors: { email: ['inválido'] } };
    expect(failure.ok).toBe(false);
    // @ts-expect-error: código fora do catálogo não compila.
    const unknownCode: ActionResult = { ok: false, code: 'NAO_EXISTE' };
    expect(unknownCode.ok).toBe(false);
  });
});

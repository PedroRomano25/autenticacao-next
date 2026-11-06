import { describe, expect, it } from 'vitest';

import { assertTestDatabase, TEST_DATABASE_NAME } from '@/tests/helpers/test-database';

describe('trava do banco de teste', () => {
  it('[ambiente-local] Testes não tocam o banco de desenvolvimento: auth_dev é recusado', () => {
    expect(() => {
      assertTestDatabase('auth_dev');
    }).toThrow('Banco de teste inválido: esperado "auth_test", conectado a "auth_dev"');
  });

  it('[ambiente-local] Testes não tocam o banco de desenvolvimento: nome ausente é recusado', () => {
    expect(() => {
      assertTestDatabase(undefined);
    }).toThrow('conectado a "undefined"');
  });

  it('[ambiente-local] Testes não tocam o banco de desenvolvimento: auth_test passa', () => {
    expect(TEST_DATABASE_NAME).toBe('auth_test');
    expect(() => {
      assertTestDatabase('auth_test');
    }).not.toThrow();
  });
});

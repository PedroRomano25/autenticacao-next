import { describe, expect, it } from 'vitest';

import { getCurrentDatabaseName, listTableNames } from '@/tests/helpers/db';
import { TEST_DATABASE_NAME } from '@/tests/helpers/test-database';

// Tabelas da autenticação (spec ambiente-local: Migrações versionadas do banco).
const AUTH_TABLES = ['account', 'rate_limit', 'session', 'user', 'verification'];

describe('ambiente-local', () => {
  it('[ambiente-local] Testes não tocam o banco de desenvolvimento', async () => {
    expect(await getCurrentDatabaseName()).toBe(TEST_DATABASE_NAME);
  });

  it('[ambiente-local] Banco vazio', async () => {
    const tableNames = await listTableNames();

    expect(tableNames).toEqual(expect.arrayContaining(AUTH_TABLES));
    expect(tableNames.filter((name) => !name.startsWith('__'))).toHaveLength(AUTH_TABLES.length);
  });
});

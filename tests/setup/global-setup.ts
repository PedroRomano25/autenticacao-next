import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { createConnection, type RowDataPacket } from 'mysql2/promise';
import type { TestProject } from 'vitest/node';

import { assertTestDatabase } from '../helpers/test-database';

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

// D6: roda no processo principal, fora do `test.env`; lê DATABASE_URL_TEST da config resolvida.
// Aborta ANTES de qualquer escrita se a conexão não estiver no `auth_test`.
export default async function setup(project: TestProject): Promise<void> {
  const url = project.config.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('DATABASE_URL_TEST ausente: rode `npm run env:init`.');
  }

  const connection = await createConnection(url);
  try {
    const [rows] = await connection.query<(RowDataPacket & { databaseName: string | null })[]>(
      'SELECT DATABASE() AS databaseName',
    );
    assertTestDatabase(rows[0]?.databaseName);
    await migrate(drizzle({ client: connection, casing: 'snake_case', mode: 'default' }), {
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  } finally {
    await connection.end();
  }
}

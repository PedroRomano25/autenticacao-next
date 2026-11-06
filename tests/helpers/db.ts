import type { RowDataPacket } from 'mysql2/promise';

import { db } from '@/db';

import { assertTestDatabase, MIGRATIONS_TABLE_NAME } from './test-database';

type DatabaseNameRow = RowDataPacket & { databaseName: string | null };
type TableNameRow = RowDataPacket & { tableName: string };

// Usa o mesmo pool do app (`db/index.ts`), que nos testes aponta para DATABASE_URL_TEST (D6).
export async function getCurrentDatabaseName(): Promise<string | null> {
  const [rows] = await db.$client.query<DatabaseNameRow[]>('SELECT DATABASE() AS databaseName');
  return rows[0]?.databaseName ?? null;
}

export async function listTableNames(): Promise<string[]> {
  const [rows] = await db.$client.query<TableNameRow[]>(
    'SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME',
  );
  return rows.map((row) => row.tableName);
}

// Esvazia todas as tabelas do `auth_test` (menos a de controle das migrações).
// Confere o banco antes de qualquer escrita, numa conexão só (FOREIGN_KEY_CHECKS é por sessão).
export async function truncateAllTables(): Promise<void> {
  const connection = await db.$client.getConnection();
  try {
    const [databaseRows] = await connection.query<DatabaseNameRow[]>(
      'SELECT DATABASE() AS databaseName',
    );
    assertTestDatabase(databaseRows[0]?.databaseName);
    const [tableRows] = await connection.query<TableNameRow[]>(
      'SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> ?',
      [MIGRATIONS_TABLE_NAME],
    );
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const { tableName } of tableRows) {
        await connection.query('TRUNCATE TABLE ??', [tableName]);
      }
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }
  } finally {
    connection.release();
  }
}

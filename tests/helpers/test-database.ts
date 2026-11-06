// D6: único banco em que integração e contrato podem rodar (spec ambiente-local: Banco de teste isolado).
export const TEST_DATABASE_NAME = 'auth_test';

// Tabela de controle do migrator do Drizzle: nunca é truncada.
export const MIGRATIONS_TABLE_NAME = '__drizzle_migrations';

export function assertTestDatabase(databaseName: unknown): void {
  if (databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      `Banco de teste inválido: esperado "${TEST_DATABASE_NAME}", conectado a "${String(databaseName)}". ` +
        'Corrija DATABASE_URL_TEST no .env.local; nada foi alterado.',
    );
  }
}

import { beforeAll } from 'vitest';

import { truncateAllTables } from '../helpers/db';

// D6: cada arquivo de integração/contrato começa com o `auth_test` vazio.
beforeAll(async () => {
  await truncateAllTables();
});

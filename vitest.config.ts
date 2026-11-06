import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const ROOT_DIR = fileURLToPath(new URL('./', import.meta.url));

// D6: variáveis do `.env.local` com DATABASE_URL apontando para o `auth_test`.
const fileEnv = parseEnv(readFileSync(`${ROOT_DIR}.env.local`, 'utf8'));
// Uma variável DATABASE_URL_TEST no ambiente do shell prevalece sobre o `.env.local`; o globalSetup
// recusa qualquer banco que não seja o `auth_test` antes de escrever (tests/setup/global-setup.ts).
const testDatabaseUrl = process.env.DATABASE_URL_TEST ?? fileEnv.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  // Sem DATABASE_URL_TEST os testes cairiam no DATABASE_URL (auth_dev); nunca rodar assim.
  throw new Error('DATABASE_URL_TEST ausente no .env.local: rode `npm run env:init`.');
}

// D6: integração e contrato usam o MySQL real; um arquivo por vez e projetos em grupos distintos
// para nunca rodarem ao mesmo tempo contra o mesmo banco.
const DATABASE_PROJECT_OPTIONS = {
  environment: 'node',
  globalSetup: ['tests/setup/global-setup.ts'],
  setupFiles: ['tests/setup/truncate.ts'],
  fileParallelism: false,
};
const INTEGRATION_GROUP_ORDER = 1;
const CONTRACT_GROUP_ORDER = 2;

export default defineConfig({
  resolve: {
    alias: [
      { find: 'server-only', replacement: `${ROOT_DIR}tests/helpers/empty-module.ts` },
      { find: /^@\//, replacement: ROOT_DIR },
    ],
  },
  // Vite 8 (peer do vitest 5.1.0): `esbuild` está obsoleto; a opção equivalente é `oxc.jsx`.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    env: { ...fileEnv, DATABASE_URL_TEST: testDatabaseUrl, DATABASE_URL: testDatabaseUrl },
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['tests/unit/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          ...DATABASE_PROJECT_OPTIONS,
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          sequence: { groupOrder: INTEGRATION_GROUP_ORDER },
        },
      },
      {
        extends: true,
        test: {
          ...DATABASE_PROJECT_OPTIONS,
          name: 'contract',
          include: ['tests/contract/**/*.test.ts'],
          sequence: { groupOrder: CONTRACT_GROUP_ORDER },
        },
      },
      {
        extends: true,
        test: { name: 'a11y', environment: 'jsdom', include: ['tests/a11y/**/*.test.tsx'] },
      },
    ],
  },
});

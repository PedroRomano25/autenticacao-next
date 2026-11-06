import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const ROOT_DIR = fileURLToPath(new URL('./', import.meta.url));

// D6: variáveis do `.env.local` com DATABASE_URL apontando para o `auth_test`.
const fileEnv = parseEnv(readFileSync(`${ROOT_DIR}.env.local`, 'utf8'));
const testDatabaseUrl = fileEnv.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  // Sem DATABASE_URL_TEST os testes cairiam no DATABASE_URL (auth_dev); nunca rodar assim.
  throw new Error('DATABASE_URL_TEST ausente no .env.local: rode `npm run env:init`.');
}

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
    env: { ...fileEnv, DATABASE_URL: testDatabaseUrl },
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['tests/unit/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: { name: 'contract', environment: 'node', include: ['tests/contract/**/*.test.ts'] },
      },
      {
        extends: true,
        test: { name: 'a11y', environment: 'jsdom', include: ['tests/a11y/**/*.test.tsx'] },
      },
    ],
  },
});

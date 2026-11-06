import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { defineConfig, devices } from '@playwright/test';

// D6: a varredura de páginas sobe `next start` na porta 3100. A11Y_PORT existe só para verificar
// localmente quando a 3100 estiver ocupada por outro processo; o padrão continua sendo o do design.
const DEFAULT_PORT = '3100';
const port = process.env.A11Y_PORT ?? DEFAULT_PORT;
const baseUrl = `http://localhost:${port}`;

// O Playwright transpila a config para CommonJS (o package.json não tem "type": "module"), por isso
// `__dirname` em vez de `import.meta.url`.
// D6: o servidor da varredura usa o `auth_test`, nunca o `auth_dev` do `next dev` do desenvolvedor.
const fileEnv = parseEnv(readFileSync(join(__dirname, '.env.local'), 'utf8'));
const testDatabaseUrl = process.env.DATABASE_URL_TEST ?? fileEnv.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  throw new Error('DATABASE_URL_TEST ausente no .env.local: rode `npm run env:init`.');
}

// `next build` sem cache pode passar do padrão de 60 s do webServer.
const WEB_SERVER_TIMEOUT_MS = 300_000;

export default defineConfig({
  testDir: './a11y',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  outputDir: 'test-results/a11y',
  use: { baseURL: baseUrl },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `next build && next start -p ${port}`,
    url: baseUrl,
    reuseExistingServer: false,
    timeout: WEB_SERVER_TIMEOUT_MS,
    env: { DATABASE_URL: testDatabaseUrl, BETTER_AUTH_URL: baseUrl },
  },
});

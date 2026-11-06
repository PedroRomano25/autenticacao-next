// D6 (Mutação): Stryker com o runner do Vitest sobre `lib/` e `services/`.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: 'vitest',
  // O runner 10.1.1 percorre `ctx.projects` do vitest.config.ts (unit, integration, contract, a11y).
  vitest: { configFile: 'vitest.config.ts' },
  // D6: uma sandbox por vez, para as sandboxes não disputarem o `auth_test`.
  concurrency: 1,
  mutate: [
    'lib/**/*.ts',
    'services/**/*.ts',
    // D6: arquivos só de valores ou gerados.
    '!lib/constants/**',
    '!lib/routes.ts',
    '!lib/errors/messages.ts',
    '!lib/utils.ts',
    '!lib/errors/codes.ts',
    // D6: arquivos só de tipos.
    '!lib/errors/action-result.ts',
    '!lib/notifications/types.ts',
  ],
  thresholds: { high: 90, low: 80, break: 80 },
  incremental: true,
  incrementalFile: 'reports/stryker-incremental.json',
  reporters: ['clear-text', 'progress', 'html'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  tempDirName: '.stryker-tmp',
};

export default config;

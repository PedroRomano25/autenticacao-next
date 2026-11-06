import eslintComments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

const TEST_AND_CONFIG_FILES = [
  "tests/**",
  "a11y/**",
  "**/*.config.{js,mjs,ts}",
  "scripts/**",
];
const GENERATED_UI_FILES = ["components/ui/**"];

// Valores arbitrários do Tailwind (`text-[15px]`) em literais de className/cn().
const ARBITRARY_VALUE_PATTERN = "\\[[^\\]\\s]+\\]";
const ARBITRARY_VALUE_MESSAGE =
  "Valor arbitrário de Tailwind é proibido: use um token semântico do tema.";
const noArbitraryTailwind = {
  files: ["**/*.{ts,tsx}"],
  ignores: GENERATED_UI_FILES,
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: `JSXAttribute[name.name='className'] Literal[value=/${ARBITRARY_VALUE_PATTERN}/]`,
        message: ARBITRARY_VALUE_MESSAGE,
      },
      {
        selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${ARBITRARY_VALUE_PATTERN}/]`,
        message: ARBITRARY_VALUE_MESSAGE,
      },
      {
        selector: `CallExpression[callee.name='cn'] Literal[value=/${ARBITRARY_VALUE_PATTERN}/]`,
        message: ARBITRARY_VALUE_MESSAGE,
      },
    ],
  },
};

export default defineConfig([
  // Os plugins `@typescript-eslint` e `jsx-a11y` já são registrados pelo
  // eslint-config-next; as configs abaixo só ativam regras (sem registrar de novo).
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [tseslint.configs.strictTypeCheckedOnly],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["**/*.{jsx,tsx}"],
    rules: jsxA11y.flatConfigs.strict.rules,
  },
  eslintComments.recommended,
  {
    rules: {
      "@eslint-community/eslint-comments/no-use": [
        "error",
        { allow: ["eslint-disable-next-line"] },
      ],
      "@eslint-community/eslint-comments/require-description": "error",
      "no-console": "error",
    },
  },
  noArbitraryTailwind,
  {
    files: ["**/*.{ts,tsx,mts}"],
    ignores: [...TEST_AND_CONFIG_FILES, ...GENERATED_UI_FILES],
    rules: {
      "no-magic-numbers": [
        "error",
        { ignore: [-1, 0, 1], ignoreArrayIndexes: true, enforceConst: true },
      ],
    },
  },
  {
    files: ["lib/logger.ts"],
    rules: { "no-console": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".claude/**",
    "docs/**",
    "openspec/**",
    "coverage/**",
    "reports/**",
    "test-results/**",
    "playwright-report/**",
    ".stryker-tmp/**",
    "next-env.d.ts",
  ]),
]);

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { ROUTES } from '@/lib/routes';

// D6: WCAG 2.2 AA (as tags acumulam os níveis anteriores).
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const COLOR_SCHEMES = ['light', 'dark'] as const;
const HTTP_OK = 200;

for (const colorScheme of COLOR_SCHEMES) {
  test(`[ambiente-local] Acesso à raiz: ${ROUTES.HOME} em pt-BR e sem violações WCAG 2.2 AA (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    const response = await page.goto(ROUTES.HOME);

    expect(response?.status()).toBe(HTTP_OK);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { level: 1, name: 'Sistema de autenticação' })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const violations = results.violations.map((violation) => ({
      page: ROUTES.HOME,
      colorScheme,
      rule: violation.id,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }));
    expect(violations).toEqual([]);
  });
}

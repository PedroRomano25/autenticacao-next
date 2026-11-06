import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Button } from '@/components/ui/button';

describe('components/ui/button', () => {
  it('[ambiente-local] Tudo verde: Button padrão sem violações', async () => {
    const { container } = render(<Button>Entrar</Button>);

    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveProperty('disabled', false);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('[ambiente-local] Tudo verde: Button desabilitado sem violações', async () => {
    const { container } = render(<Button disabled>Entrar</Button>);

    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveProperty('disabled', true);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('[ambiente-local] Tudo verde: Button pendente (desabilitado e aria-busy) sem violações', async () => {
    const { container } = render(
      <Button disabled aria-busy="true">
        Entrando…
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Entrando…' });
    expect(button).toHaveProperty('disabled', true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('[ambiente-local] Violação de acessibilidade: Button só com ícone e sem nome é reprovado', async () => {
    const { container } = render(
      <Button>
        <svg aria-hidden="true" />
      </Button>,
    );

    const results = await axe(container);
    expect(results.violations.map((violation) => violation.id)).toContain('button-name');
    expect(() => {
      expect(results).toHaveNoViolations();
    }).toThrow(/button-name/);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FIELD_ID = 'email';
const ERROR_ID = 'email-erro';

describe('components/ui/input + components/ui/label', () => {
  it('[ambiente-local] Tudo verde: Input com Label sem violações', async () => {
    const { container } = render(
      <div>
        <Label htmlFor={FIELD_ID}>E-mail</Label>
        <Input id={FIELD_ID} type="email" autoComplete="email" />
      </div>,
    );

    expect(screen.getByLabelText('E-mail')).toHaveProperty('id', FIELD_ID);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('[ambiente-local] Tudo verde: Input com Label em estado de erro sem violações', async () => {
    const { container } = render(
      <div>
        <Label htmlFor={FIELD_ID}>E-mail</Label>
        <Input id={FIELD_ID} type="email" autoComplete="email" aria-invalid="true" aria-describedby={ERROR_ID} />
        <p id={ERROR_ID}>Informe um e-mail válido.</p>
      </div>,
    );

    const input = screen.getByRole('textbox', { name: 'E-mail', description: 'Informe um e-mail válido.' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('[ambiente-local] Tudo verde: Input com Label desabilitado sem violações', async () => {
    const { container } = render(
      <div>
        <Label htmlFor={FIELD_ID}>E-mail</Label>
        <Input id={FIELD_ID} type="email" autoComplete="email" disabled />
      </div>,
    );

    expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveProperty('disabled', true);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('[ambiente-local] Violação de acessibilidade: Input sem rótulo é reprovado', async () => {
    const { container } = render(<Input type="email" autoComplete="email" />);

    const results = await axe(container);
    expect(results.violations.map((violation) => violation.id)).toContain('label');
    expect(() => {
      expect(results).toHaveNoViolations();
    }).toThrow(/label/);
  });
});

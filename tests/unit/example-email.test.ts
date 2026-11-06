import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { ExampleEmail } from '@/emails/example-email';
import { renderEmail } from '@/lib/notifications/render-email';

describe('emails/example-email + lib/notifications/render-email', () => {
  it('[notificacoes] Envio de e-mail transacional: renderiza HTML em pt-BR e texto puro com o conteúdo', async () => {
    const { html, text } = await renderEmail(createElement(ExampleEmail, { name: 'Maria' }));

    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain('Olá, Maria');
    expect(text).toContain('Olá, Maria');
    expect(text).not.toContain('<');
  });

  it('escapa o conteúdo vindo de fora no HTML', async () => {
    const { html } = await renderEmail(createElement(ExampleEmail, { name: '<script>alert(1)</script>' }));

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});

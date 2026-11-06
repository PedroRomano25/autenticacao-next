import 'server-only';

import { render, toPlainText } from '@react-email/render';
import type { ReactElement } from 'react';

// O html-to-text põe títulos em maiúsculas por padrão; no texto puro o conteúdo
// (nomes, códigos) precisa sair como foi escrito.
const HEADING_SELECTORS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((selector) => ({
  selector,
  options: { uppercase: false },
}));

/** D4: corpo HTML e texto puro do mesmo template React Email. */
export async function renderEmail(react: ReactElement): Promise<{ html: string; text: string }> {
  const html = await render(react);
  return { html, text: toPlainText(html, { selectors: HEADING_SELECTORS }) };
}

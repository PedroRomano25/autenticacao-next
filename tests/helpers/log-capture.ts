import { vi } from 'vitest';

// Captura as linhas do lib/logger.ts espiando o console global (e não o objeto `logger`):
// funciona mesmo quando a implementação foi importada depois de vi.resetModules().
// Restaure com vi.restoreAllMocks() no afterEach.

export type LogCapture = {
  /** Linhas JSON parseadas, na ordem em que foram escritas. */
  readLines: () => Record<string, unknown>[];
  /** Todo o texto escrito, para afirmações de ausência (sempre junto de uma afirmação positiva). */
  readRaw: () => string;
};

const CONSOLE_METHODS = ['info', 'warn', 'error'] as const;

function parseLine(output: unknown): Record<string, unknown> {
  if (typeof output !== 'string') throw new Error('o logger deve escrever uma string');
  const parsed: unknown = JSON.parse(output);
  if (typeof parsed !== 'object' || parsed === null) throw new Error('linha de log não é um objeto JSON');
  return Object.fromEntries(Object.entries(parsed));
}

export function captureLogLines(): LogCapture {
  const outputs: unknown[] = [];
  for (const method of CONSOLE_METHODS) {
    vi.spyOn(console, method).mockImplementation((output: unknown) => {
      outputs.push(output);
    });
  }
  return {
    readLines: () => outputs.map(parseLine),
    readRaw: () => outputs.map(String).join('\n'),
  };
}

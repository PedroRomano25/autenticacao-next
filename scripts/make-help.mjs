// Lista os alvos do Makefile com a descrição escrita em `## ...` (sem depender de grep/awk).
import { readFileSync } from 'node:fs';

const TARGET_LINE = /^([a-z][a-z-]*):.*## (.+)$/;
const NAME_WIDTH = 14;

const lines = readFileSync(new URL('../Makefile', import.meta.url), 'utf8').split(/\r?\n/);
for (const line of lines) {
  const match = TARGET_LINE.exec(line);
  if (match) {
    process.stdout.write(`  ${match[1].padEnd(NAME_WIDTH)}${match[2]}\n`);
  }
}

// Cria o `.env.local` a partir do `.env.example`, só se ele ainda não existir,
// trocando o placeholder de BETTER_AUTH_SECRET por um segredo aleatório.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const EXAMPLE_FILE = ".env.example";
const TARGET_FILE = ".env.local";
const SECRET_BYTES = 32;
const SECRET_LINE_PATTERN = /^BETTER_AUTH_SECRET=.*$/m;

if (existsSync(TARGET_FILE)) {
  process.stdout.write(`${TARGET_FILE} já existe; nada foi alterado.\n`);
} else {
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const content = readFileSync(EXAMPLE_FILE, "utf8").replace(
    SECRET_LINE_PATTERN,
    () => `BETTER_AUTH_SECRET=${secret}`,
  );
  // flag "wx": falha se o arquivo for criado por outro processo no meio do caminho.
  writeFileSync(TARGET_FILE, content, { flag: "wx" });
  process.stdout.write(`${TARGET_FILE} criado com um BETTER_AUTH_SECRET aleatório.\n`);
}

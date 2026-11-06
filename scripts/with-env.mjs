// Executa um comando com o `.env.local` carregado.
// Uso: node scripts/with-env.mjs [--react-server] <comando> [args...]
// `--react-server` define NODE_OPTIONS=--conditions=react-server, o que faz o
// pacote `server-only` resolver para o módulo vazio fora do Next.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const ENV_FILE = ".env.local";
const REACT_SERVER_FLAG = "--react-server";
const REACT_SERVER_CONDITION = "--conditions=react-server";
const FAILURE_EXIT_CODE = 1;

const [firstArg, ...restArgs] = process.argv.slice(2);
const isReactServer = firstArg === REACT_SERVER_FLAG;
const [command, ...commandArgs] = isReactServer ? restArgs : [firstArg, ...restArgs];

if (command === undefined) {
  process.stderr.write("Uso: node scripts/with-env.mjs [--react-server] <comando> [args...]\n");
  process.exit(FAILURE_EXIT_CODE);
}

if (existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

const env = { ...process.env };
if (isReactServer) {
  env.NODE_OPTIONS = [env.NODE_OPTIONS, REACT_SERVER_CONDITION].filter(Boolean).join(" ");
}

// No Windows os binários de node_modules/.bin são .cmd e exigem shell.
const child = spawn(command, commandArgs, {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  process.stderr.write(`Falha ao executar ${command}: ${error.message}\n`);
  process.exit(FAILURE_EXIT_CODE);
});
child.on("exit", (code) => {
  process.exit(code ?? FAILURE_EXIT_CODE);
});

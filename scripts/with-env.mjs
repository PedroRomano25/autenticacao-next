// Executa um comando com o `.env.local` carregado.
// Uso: node scripts/with-env.mjs [--react-server] <comando> [args...]
// `--react-server` define NODE_OPTIONS=--conditions=react-server (o pacote
// `server-only` resolve para o módulo vazio fora do Next) e, para o jiti da CLI
// do Better Auth, que ignora essa condição, registra scripts/server-only-hook.mjs
// e JITI_NATIVE_MODULES (design D2, "CLI").
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ENV_FILE = ".env.local";
const REACT_SERVER_FLAG = "--react-server";
const REACT_SERVER_CONDITION = "--conditions=react-server";
const SERVER_ONLY_HOOK_PATH = fileURLToPath(new URL("./server-only-hook.mjs", import.meta.url));
const JITI_NATIVE_MODULES = JSON.stringify(["server-only"]);
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
  const hookImport = `--import ${pathToFileURL(SERVER_ONLY_HOOK_PATH).href}`;
  env.NODE_OPTIONS = [env.NODE_OPTIONS, REACT_SERVER_CONDITION, hookImport].filter(Boolean).join(" ");
  env.JITI_NATIVE_MODULES = JITI_NATIVE_MODULES;
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

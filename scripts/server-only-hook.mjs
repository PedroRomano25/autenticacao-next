// Hook de resolução de módulos para rodar código que importa `server-only` fora do Next.
// A CLI do Better Auth carrega `lib/auth.ts` pelo jiti 2.x, que ignora
// `--conditions=react-server`; sem este hook, `server-only` lança erro.
// Carregado por `scripts/with-env.mjs --react-server` via `NODE_OPTIONS=--import`.
import { registerHooks } from "node:module";

const SERVER_ONLY_ENTRY = /\/node_modules\/server-only\/index\.js$/;
const EMPTY_MODULE = "empty.js";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    if (!SERVER_ONLY_ENTRY.test(result.url)) {
      return result;
    }
    // Redireciona para o módulo vazio que o próprio pacote fornece.
    return { ...result, url: result.url.replace(/index\.js$/, EMPTY_MODULE) };
  },
});

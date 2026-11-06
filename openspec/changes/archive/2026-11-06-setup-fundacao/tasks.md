# Tasks

> Antes do grupo 1, a sessão principal cria a branch `change/setup-fundacao` a partir da `main`. Tarefas `· alto risco` vão num commit só delas e são auditadas pelo `security` na revisão da change completa, no fim (convenções, seção 10).

## 1. Scaffold e dependências (infra)

- [x] 1.1 Gerar o app Next.js 16 (TypeScript `strict: true`, App Router, Tailwind v4, ESLint, sem `src/`, sem git) com `create-next-app` numa pasta temporária fora do repositório e copiar para a raiz **sem sobrescrever** `CLAUDE.md`, `docs/`, `.claude/`, `openspec/` e `skills-lock.json` (exceção declarada: o infra escreve os `app/layout.tsx` e `app/page.tsx` iniciais, que o uiux substitui na 10.2), e verificar que `npm run build` conclui sem erros e que `git status` não mostra alteração nos arquivos preservados
- [x] 1.2 Criar `.gitignore` (`.env*` exceto `.env.example`, `.next/`, `node_modules/`, `coverage/`, `reports/`, `test-results/`, `playwright-report/`, `blob-report/`, `.stryker-tmp/`), `.gitattributes` (`* text=auto eol=lf`), `.npmrc` (`save-exact=true`) e `engines.node` `>=22` no `package.json`, e verificar que `git status` não lista `.env.local` nem artefatos e que `git add --renormalize .` não gera avisos de CRLF
- [x] 1.3 Instalar de uma vez todas as dependências da D9 com versões exatas (a CLI do Better Auth pelo pacote indicado na documentação da versão fixada do `better-auth`), e verificar que `npm ls` lista todas sem erro e que nenhuma versão do `package.json` tem `^` ou `~`

## 2. Análise estática (infra)

- [x] 2.1 Configurar o ESLint flat config sobre o `eslint-config-next` (reaproveitando as instâncias de `jsx-a11y` e `@typescript-eslint` que ele registra; regras strict do `jsx-a11y` lidas de `flatConfigs.strict.rules`, sem registrar o plugin de novo), com `typescript-eslint` strict-type-checked e as regras da D8 (com `components/ui/**` fora de `no-restricted-syntax` e `no-magic-numbers`), e verificar que `npm run lint` passa no scaffold e falha, em arquivos temporários fora de `components/ui/`, com: `<img>` sem `alt`, número mágico, `console.log`, `/* eslint-disable */`, `eslint-disable-next-line` sem motivo e `className="text-[15px]"`
- [x] 2.2 Configurar o `knip` (D6: `components/ui/**` ignorado; `instrumentation.ts` e `scripts/*` como entries; `ignoreDependencies` comentado só para `shadcn`, `lucide-react`, `tw-animate-css` e `@testing-library/dom`) e os scripts `typecheck`, `lint` e `knip`, e verificar que os três passam no scaffold

## 3. Ambiente local (infra)

- [x] 3.1 Criar `docker-compose.yml` com `mysql:8.4` (porta só em `127.0.0.1`, volume nomeado, healthcheck, usuário `auth` da D3) e `axllent/mailpit` (versão fixada, portas 1025 e 8025 em `127.0.0.1`), e verificar que `docker compose up -d --wait` termina com os dois serviços prontos e deixa os dois serviços `healthy`/`running`
- [x] 3.2 Adicionar `docker/mysql/init.sql`, que cria `auth_dev` e `auth_test` em `utf8mb4` e dá `GRANT ALL` nos dois ao usuário `auth`, e verificar com `docker compose exec mysql mysql -uauth -p<senha> -e "SHOW DATABASES"` que o usuário da aplicação enxerga os dois bancos, e com `curl -s -o /dev/null -w "%{http_code}" http://localhost:8025` que o Mailpit responde 200
- [x] 3.3 Criar `.env.example` com todas as variáveis da D5 (aplicação + `DATABASE_URL_TEST`) documentadas em pt-BR e o placeholder inválido de `BETTER_AUTH_SECRET`, e verificar contra a lista da D5 que nenhuma falta · alto risco
- [x] 3.4 Criar `scripts/with-env.mjs` e `scripts/env-init.mjs` (D5/D8) e os scripts `env:init` e `auth:generate`, e verificar que `npm run env:init` cria o `.env.local` com um `BETTER_AUTH_SECRET` aleatório de pelo menos 32 caracteres, que uma segunda execução não sobrescreve o arquivo existente e que o `.env.local` continua fora do git · alto risco

## 4. Base de testes unitários (qa)

- [x] 4.1 Criar `vitest.config.ts` (D6: `projects` `unit`, `integration`, `contract` e `a11y`; `loadEnv` com `DATABASE_URL` = `DATABASE_URL_TEST`; aliases `@/` e `server-only` → `tests/helpers/empty-module.ts`; `esbuild.jsx: "automatic"`) e os scripts `test:unit`, `test:integration`, `test:contract` e `test:a11y`, (conferindo na versão fixada se a opção de JSX ainda é `esbuild.jsx` ou mudou com o Vite atual) e verificar que `npx vitest run --project unit --passWithNoTests` termina com código 0 (sem teste trivial; os primeiros testes reais vêm na 5.1)

## 5. Configuração e bases transversais (dev-next)

- [x] 5.1 Implementar `lib/env.ts` (schema Zod da D5, sem trava por `NODE_ENV`; ver D4) que lança erro com os nomes das variáveis inválidas e sem os valores, e verificar com testes em `tests/unit/` (escritos antes, vistos falhando) os casos de variável ausente, segredo com menos de 32 caracteres, placeholder do `.env.example` recusado e mensagem de erro sem o valor secreto · alto risco
- [x] 5.2 Criar `instrumentation.ts` com `register()` importando `lib/env.ts` no runtime `nodejs`, e verificar que `next dev` sem `BETTER_AUTH_SECRET` falha ao iniciar com uma mensagem que nomeia a variável e que, com o `.env.local` válido, sobe normalmente (fazendo um `curl -i http://localhost:3000/` logo depois de subir, porque no `next dev` o `register()` pode rodar só na primeira requisição; se for o caso, registrar no relatório que a falha aparece na primeira requisição em dev e já no boot em `next start`)
- [x] 5.3 Implementar `lib/logger.ts` (JSON de uma linha com `level`, `event`, `timestamp`; `maskEmail`, `maskPhone`), e verificar com testes unitários (escritos antes) o formato da linha e o mascaramento, e com `npm run lint` que `console.*` é acusado em qualquer outro arquivo
- [x] 5.4 Criar `lib/errors/` (`codes.ts` com `UNEXPECTED` e `VALIDATION_FAILED`, `messages.ts` com lookup table `satisfies Record<ErrorCode, string>` em pt-BR, `action-result.ts`), `lib/routes.ts` (`ROUTES.HOME`) e `lib/constants/auth.ts` (constantes da D2), e verificar com teste unitário que todo código tem mensagem, com teste de tipo (`expectTypeOf`) o formato de `ActionResult` e com `npm run typecheck` que um código sem mensagem não compila

## 6. Banco de dados (dev-db)

- [x] 6.1 Criar `db/index.ts` (pool `mysql2/promise` com `server-only` e `casing: "snake_case"`) e `drizzle.config.ts` (`casing: "snake_case"`, `.env.local` carregado por `process.loadEnvFile`), e verificar que `npx drizzle-kit check` roda sem erro
- [x] 6.2 Adicionar os scripts `db:generate`, `db:migrate` e `db:studio` (chamando o `drizzle-kit` direto; o env vem do `drizzle.config.ts`, D8), e verificar que `npm run db:migrate` sem migrações pendentes termina com código 0 contra o `auth_dev`

## 7. Better Auth e sessão (dev-next + dev-db)

- [x] 7.1 (dev-next) Criar `lib/auth.ts` com `drizzleAdapter(db, { provider: "mysql" })` ainda sem `schema`, a configuração de sessão da D2 (constantes de `lib/constants/auth.ts`), `rateLimit.storage = "database"`, `useSecureCookies`, atributos de cookie explícitos e o plugin `nextCookies()`, e verificar que `npm run typecheck` passa · alto risco
- [x] 7.2 (dev-db) Rodar `npm run auth:generate` e conferir os nomes de tabela e coluna em `db/schema/auth.ts`. Se estiverem em snake_case: gerar a migração (`npm run db:generate`), ler o SQL, aplicar (`npm run db:migrate`) e verificar com `SHOW TABLES` e `SHOW COLUMNS` (usuário `auth`) que `user`, `session`, `account`, `verification` e `rate_limit` existem no `auth_dev` com colunas em snake_case (ex.: `email_verified`, `user_id`, `expires_at`). Se não estiverem, reportar os nomes gerados e parar para a 7.3; se a CLI não carregar o `lib/auth.ts`, `BLOQUEADO` com o erro
- [x] 7.3 (dev-next, condicional: só se a 7.2 reportar nomes fora de snake_case) Mapear em `lib/auth.ts` os `modelName` e `fields` de `user`, `session`, `account`, `verification` e `rateLimit` para snake_case, e verificar que, depois de o dev-db repetir a 7.2, todas as tabelas e colunas saem em snake_case — não necessária: a 7.2 gerou tudo em snake_case
- [x] 7.4 (dev-next) Passar o `schema` gerado para o `drizzleAdapter` em `lib/auth.ts`, e verificar que `npm run typecheck` passa · alto risco
- [x] 7.5 (dev-next) Criar `app/api/auth/[...all]/route.ts` com `toNextJsHandler`, e verificar com `curl -i http://localhost:3000/api/auth/get-session` (sem cookie, `next dev` no ar) que a resposta é 200 com corpo `null` · alto risco

## 8. Base de testes de integração e contrato (qa)

- [x] 8.1 Criar `tests/setup/global-setup.ts` (conecta por `DATABASE_URL_TEST` e aborta se `SELECT DATABASE()` não for `auth_test`; aplica as migrações), `tests/setup/truncate.ts` (`beforeAll` por arquivo), `tests/helpers/db.ts`, `fileParallelism: false` e `sequence.groupOrder` distintos para `integration` e `contract`, e verificar que: um teste de integração `[ambiente-local] Banco vazio` lista as cinco tabelas no `auth_test` após o setup; apontar `DATABASE_URL_TEST` temporariamente para o `auth_dev` faz o `globalSetup` abortar sem tocar nenhuma tabela
- [x] 8.2 Criar `tests/helpers/session.ts` (D6: `internalAdapter`, nome do cookie por `authCookies`, assinatura pelo utilitário do Better Auth) e os testes de integração da spec `sessao` com `vi.useFakeTimers({ toFake: ["Date"] })`: expiração após 30 dias, renovação após 1 dia de uso, ausência de renovação antes de 1 dia, sessão removida e token inválido tratados como não autenticados (cookie só de token), janela de até 5 minutos do cookie cache e atributos `HttpOnly`/`Secure`/`SameSite=Lax`/`Path=/` no `Set-Cookie` emitido na renovação, e verificar que passam
- [x] 8.3 Criar o schema Zod de `get-session` em `tests/contract/schemas/` e o teste de contrato que chama `auth.handler` com e sem sessão, e verificar que passa e que falha se o formato da resposta mudar (alterando o schema temporariamente)

## 9. Notificações (dev-next + qa)

- [x] 9.1 (dev-next) Criar as interfaces `EmailSender` e `SmsSender` e a factory (dispatch table) baseada em `EMAIL_PROVIDER`/`SMS_PROVIDER` em `lib/notifications/`, e verificar com teste unitário (escrito antes) que a factory devolve a implementação correta para cada valor
- [x] 9.2 (qa) Criar as suítes de contrato `describeEmailSenderContract` (envio válido; erro genérico em falha do transporte) e `describeSmsSenderContract` (envio válido; rejeição fora de E.164; erro genérico em falha) em `tests/contract/interfaces/`, e verificar que rodam contra um dublê de teste
- [x] 9.3 (dev-next) Implementar `ConsoleSmsSender` com validação E.164, escrevendo pelo `lib/logger.ts` o evento `sms_sent_dev`, e verificar que passa na suíte de contrato de `SmsSender` e que o teste unitário confere a linha JSON com `event`, `to` e `text` · alto risco
- [x] 9.4 (dev-next) Criar um template de exemplo em `emails/` e implementar `SmtpEmailSender` (HTML e texto, falha de SMTP registrada como `email_send_failed` e lançada como erro genérico), e verificar que passa na suíte de contrato de `EmailSender`
- [x] 9.5 (qa) Criar o helper `tests/helpers/mailpit.ts` (buscar o último e-mail de um destinatário, limpar a caixa) e um teste de integração que envia pelo `SmtpEmailSender` e confere no Mailpit o assunto, o HTML e o texto, e verificar que passa

## 10. UI base (uiux)

- [x] 10.1 Rodar `shadcn init` e adicionar `button`, `input`, `label` e `card` (sem `form`; exceção declarada: o shadcn gera `lib/utils.ts` e pode tocar o `package.json`; decisão do usuário no apply: o pacote `cn` que o shadcn 4.x adiciona é rejeitado, `lib/utils.ts` exporta `cn()` com `clsx` + `tailwind-merge` e os componentes importam `cn` de `@/lib/utils`), e verificar que `git diff package.json` não mostra dependência nova fora da D9 (senão `BLOQUEADO`) e que `npm run build`, `npm run lint` e `npm run knip` passam
- [x] 10.2 Definir em `app/layout.tsx` `<html lang="pt-BR">`, a fonte via `next/font` e `metadata.title`; em `app/globals.css` os tokens semânticos claro/escuro com tema escuro automático (D7: `@custom-variant dark (@media (prefers-color-scheme: dark))` **e** o bloco `.dark { ... }` do shadcn movido para `@media (prefers-color-scheme: dark) { :root { ... } }`, sem nenhum seletor `.dark` restante); e em `app/page.tsx` uma página inicial em português com `<main>`, um único `h1`, `Card` e `Button` só com utilitários semânticos, e um link que usa `ROUTES.HOME` (consumidor real de `lib/routes.ts`; decisão do usuário no apply), e verificar com `curl -i http://localhost:3000/` que a resposta é 200 com o texto em pt-BR e com `npm run lint` que não há valor arbitrário

## 11. Acessibilidade (qa)

- [x] 11.1 Configurar o projeto `a11y` do Vitest com `vitest-axe` (declaração de tipos em `tests/a11y/vitest-axe.d.ts`) e escrever testes para `Button` e para `Input` com `Label`, e verificar que passam, que um `Input` sem rótulo faz o teste falhar e que `npm run typecheck` aceita o matcher
- [x] 11.2 Criar `playwright.config.ts` (D6: só Chromium; `webServer` `next build && next start -p 3100` com `DATABASE_URL` → `auth_test`; `reuseExistingServer: false`), rodar `npx playwright install chromium`, criar `a11y/home.spec.ts` (status 200, `lang="pt-BR"`, texto em pt-BR e zero violações WCAG 2.2 AA, nas preferências clara e escura via `page.emulateMedia({ colorScheme })`) e o script `a11y:pages`, e verificar que `/` passa e que uma violação temporária (ex.: botão sem nome) faz o comando falhar apontando a página e a regra

## 12. Mutação (qa)

- [x] 12.1 Criar `stryker.config.mjs` (D6: `concurrency: 1`, `mutate` em `lib/**/*.ts` e `services/**/*.ts` com as exclusões da D6, `thresholds.break: 80`, `incremental: true`) e o script `test:mutation`, confirmando na versão fixada que o `vitest-runner` aceita `projects` e que a sandbox do Stryker leva o `.env.local` (senão, configurar o arquivo como copiado), e verificar que o score fica ≥ 80% (adicionando testes para os mutantes sobreviventes relevantes) e que, com o limite de quebra em 100 (pela opção de CLI ou config da versão fixada), o comando termina com código diferente de 0 e lista os sobreviventes

## 13. Portão de qualidade e documentação (infra)

- [x] 13.1 Criar os agregadores `qa` (`typecheck` → `lint` → `knip` → `test:unit` → `test:integration` → `test:contract` → `test:a11y` → `a11y:pages`, parando no primeiro que falhar) e `qa:mutation` (chama `test:mutation`), e verificar que `npm run qa` passa e retorna código diferente de 0 ao introduzir temporariamente um erro de tipo, e que todas as variáveis lidas por `lib/env.ts` constam no `.env.example`
- [x] 13.2 Criar o `Makefile` (D8) com os alvos `help` (padrão), `up` (`docker compose up -d --wait`), `setup` (`up` → `env:init` → `db:migrate` → `npx playwright install chromium`), `down`, `logs`, `dev`, `build`, `db-generate`, `db-migrate`, `db-studio`, `lint`, `typecheck`, `test`, `qa` e `qa-mutation`, todos `.PHONY`, delegando a scripts npm ou ao `docker compose` e sem alvo destrutivo, e verificar no Windows (`winget install ezwinports.make`) que `make help` lista todos os alvos com descrição e que `make up`, `make qa` e `make down` funcionam · alto risco — verificado no WSL/Linux; a verificação no Windows (winget) fica pendente com o usuário
- [x] 13.3 Escrever o README em pt-BR com pré-requisitos (Node 22, Docker Desktop e, opcionalmente, GNU Make via `winget install ezwinports.make`), o início rápido (`make setup` → `make dev`, com os comandos npm/docker equivalentes para quem não usa `make`), a tabela de portões de qualidade (`make qa`/`npm run qa`, `make qa-mutation`/`npm run qa:mutation`) e o roadmap das changes, e verificar seguindo os passos num clone limpo em outra pasta, depois de `make down` na stack atual (para liberar as portas)

## 14. Verificação integrada

- [x] 14.1 Com o ambiente recém-subido (`make down` + `make up`, sem apagar volumes), rodar `make build`, `make qa` e `make qa-mutation`, e verificar que todos passam

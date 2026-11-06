# Design

## Context

O repositório tem só a configuração do OpenSpec, os agentes e as skills de convenção. Não existe código nem `package.json`. Motivação e escopo estão em `proposal.md`; os requisitos estão em `specs/sessao`, `specs/notificacoes` e `specs/ambiente-local`. O alvo é apenas a máquina local do desenvolvedor (Windows 11 com Docker Desktop e Node 22 LTS).

## Goals / Non-Goals

**Goals:**
- Deixar uma estrutura em que as próximas changes só acrescentem plugins do Better Auth, telas e Server Actions, sem mexer em infraestrutura.
- Deixar todos os portões de qualidade (estático, unitário, integração, contrato, acessibilidade e mutação) configurados desde já, cada um com um exemplo real passando, para que as próximas changes só acrescentem testes.

**Non-Goals:**
- Nenhum método de login habilitado (o `emailAndPassword` fica desligado até a change `cadastro-login-email-senha`), e por isso nenhum `lib/auth-client.ts` ainda (entra com o primeiro formulário).
- Nenhum adapter de produção, CI ou deploy.
- Nenhum teste E2E de fluxo: fluxos são provados por testes de integração; o Playwright só varre páginas com axe.

## Decisions

### D1. Estrutura de pastas
```
app/                      # rotas finas (App Router); app/api/auth/[...all]/route.ts
instrumentation.ts        # register(): valida o env na inicialização do servidor
components/ui/            # shadcn/ui
components/ hooks/ actions/ services/ schemas/ types/   # estrutura por tipo (skill `boas-praticas-interface`, seção 1); criadas sob demanda a partir da change cadastro-login-email-senha
lib/env.ts                # validação de env com Zod
lib/auth.ts               # instância do Better Auth (somente servidor)
lib/constants/auth.ts     # durações de sessão, cookie cache e afins
lib/routes.ts             # mapa ROUTES (URLs em pt-BR)
lib/logger.ts             # logger JSON mínimo + maskEmail/maskPhone
lib/errors/               # codes.ts, messages.ts, action-result.ts
lib/notifications/        # email.ts, sms.ts (interfaces + implementações + factory)
lib/utils.ts              # cn() gerado pelo shadcn
db/index.ts, db/schema/   # cliente Drizzle + schema
drizzle/                  # migrações geradas
emails/                   # templates React Email
scripts/                  # with-env.mjs, env-init.mjs (infra)
tests/unit/               # Vitest, sem banco/rede
tests/integration/        # Vitest contra auth_test + Mailpit
tests/contract/           # schemas/, api/, interfaces/
tests/a11y/               # vitest-axe em componentes
tests/helpers/            # db.ts, mailpit.ts, session.ts, sms.ts, empty-module.ts
tests/setup/              # global-setup.ts (migra + guarda), truncate.ts
a11y/                     # Playwright + @axe-core/playwright (varredura de páginas)
```
`lib/auth.ts` e `db/` importam `server-only` para impedir vazamento para o bundle do cliente. Convenções nas skills `convencoes-de-codigo`, `boas-praticas-servidor` e `boas-praticas-interface`.

### D2. Better Auth + Drizzle
- `drizzleAdapter(db, { provider: "mysql", schema })`. Como o `schema` é gerado a partir do próprio `lib/auth.ts`, a ordem é: (1) `lib/auth.ts` sem `schema`; (2) gerar o schema; (3) ligar o `schema` no adapter.
- **CLI:** a CLI do Better Auth entra como devDependency com versão exata (o pacote indicado pela documentação da versão fixada do `better-auth`; hoje o pacote `auth`, na mesma versão do `better-auth`, com o binário `better-auth`; o `@better-auth/cli` está marcado como não suportado). Script `auth:generate` = `node scripts/with-env.mjs --react-server <cli> generate --config lib/auth.ts --output db/schema/auth.ts --yes`. O `with-env.mjs` carrega o `.env.local` e, com `--react-server`, define `NODE_OPTIONS` com `--conditions=react-server` e `--import scripts/server-only-hook.mjs` (hook `module.registerHooks` que troca `server-only` pelo módulo vazio) e `JITI_NATIVE_MODULES='["server-only"]'`: a CLI (pacote `auth` 1.7.18) carrega o config pelo jiti, que ignora as condições do Node; sem o hook, o `server-only` real é executado e lança erro. As migrações saem do `drizzle-kit generate`/`migrate`. Alternativa descartada: `migrate` da CLI do Better Auth, que deixaria as migrações fora do controle do Drizzle.
- **Sessão:** `expiresIn` de 30 dias, `updateAge` de 1 dia e `cookieCache: { enabled: true, maxAge }` de 5 minutos, todos como constantes nomeadas em `lib/constants/auth.ts`.
- **Nomes no banco (decisão: snake_case obrigatório):** o Drizzle usa `casing: "snake_case"` no cliente e no `drizzle.config.ts`. O schema gerado traz nomes de coluna explícitos, que prevalecem sobre o `casing`; por isso a tarefa 7.2 confere a saída. Se a CLI emitir colunas ou tabelas em camelCase, a tarefa condicional 7.3 (dev-next) mapeia em `lib/auth.ts` com `modelName` e `fields` de cada modelo (`user`, `session`, `account`, `verification`, `rateLimit` → `rate_limit`) e o schema é regenerado. Nada é editado à mão no arquivo gerado.
- `rateLimit: { storage: "database" }` já fica habilitado (tabela gerada agora; os limites por rota entram na próxima change).
- **Cookies:** `advanced.useSecureCookies: true` força `Secure` mesmo em `http://localhost` (navegadores tratam localhost como contexto seguro) e aplica o prefixo `__Secure-` ao nome dos cookies. `SameSite=Lax`, `HttpOnly` e `Path=/` ficam explícitos em `advanced.defaultCookieAttributes`. Testes leem o nome real do cookie em `(await auth.$context).authCookies`, nunca fixam o nome.
- Plugin `nextCookies()` para que as Server Actions consigam definir cookies.

### D3. Banco MySQL
- Uma imagem `mysql:8.4` no compose, com `docker/mysql/init.sql` que cria `auth_dev` e `auth_test` (`utf8mb4` / `utf8mb4_0900_ai_ci`) e dá `GRANT ALL` nos dois ao usuário da aplicação. Alternativa descartada: dois contêineres, que gastam mais memória sem ganho.
- Credenciais só locais (usuário `auth`, senhas de desenvolvimento) ficam no `docker-compose.yml` e no `.env.example`; não são segredos de produção e o banco só escuta em `127.0.0.1`.
- Pool via `mysql2/promise`, com a URL em `DATABASE_URL`. Os testes usam `DATABASE_URL_TEST` (ver D6).

### D4. Notificações
- Interfaces `EmailSender.send({ to, subject, react })` e `SmsSender.send({ to, text })`.
- `SmtpEmailSender` usa `nodemailer` apontando para o Mailpit (porta 1025) e gera HTML e texto com `@react-email/render`. Falha de transporte: registra `email_send_failed` no log e lança erro genérico.
- `ConsoleSmsSender` valida E.164 com regex (`^\+[1-9]\d{7,14}$`) e escreve pelo `lib/logger.ts` o evento `sms_sent_dev` com `to` e `text`. É exceção documentada à regra de não logar conteúdo: o texto pode conter OTP, e por isso só existe com `SMS_PROVIDER=console`. Não há trava por `NODE_ENV`: `next build`/`next start` (inclusive na varredura de páginas) rodam com `NODE_ENV=production` localmente. Risco aceito porque o alvo é só a máquina local; quando entrar um adapter de produção, uma change futura passa a exigir provedor real fora do ambiente local. A `libphonenumber-js` fica para a change `telefone`.
- Uma factory (dispatch table) escolhe a implementação por `EMAIL_PROVIDER` (`smtp`) e `SMS_PROVIDER` (`console`). Novos provedores entram como novos valores do enum, sem tocar nos fluxos.

### D5. Variáveis de ambiente
- `lib/env.ts` faz o parse de `process.env` com Zod no carregamento do módulo e lança um erro listando os nomes das variáveis inválidas, sem os valores. Variáveis da aplicação: `BETTER_AUTH_SECRET` (mínimo de 32), `BETTER_AUTH_URL`, `DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`, `EMAIL_PROVIDER`, `SMS_PROVIDER`. Alternativa descartada: `@t3-oss/env-nextjs`, dependência extra para pouco ganho.
- **Validação na inicialização:** `instrumentation.ts` exporta `register()`, que (no runtime `nodejs`) importa `lib/env.ts`. Assim o `next dev`/`next start` falha ao subir, nomeando a variável, em vez de só na primeira requisição.
- **Variáveis só de ferramentas:** `DATABASE_URL_TEST` (testes e Playwright) fica no `.env.example`, mas não em `lib/env.ts`.
- **Exceção à regra "só via `lib/env.ts`":** arquivos de configuração de ferramentas (`drizzle.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `stryker.config.mjs`) e `scripts/` leem `process.env` direto, porque rodam fora do app. O `drizzle.config.ts` carrega o `.env.local` com `process.loadEnvFile` (Node ≥ 20.12, sem dependência nova); o Vitest lê o `.env.local` com `parseEnv` de `node:util` + `readFileSync` (o vitest 5.1.0 não expõe o `loadEnv` do Vite sem depender do pacote `vite`, que fica fora da D9).
- **Segredo local:** `scripts/env-init.mjs` (`npm run env:init`) cria o `.env.local` a partir do `.env.example` só se ele não existir, trocando o valor de exemplo de `BETTER_AUTH_SECRET` por `crypto.randomBytes(32).toString("base64url")`. O `.env.example` traz um placeholder que **não** passa na validação (ex.: `troque-por-npm-run-env-init`), para que ninguém rode com um segredo público.

### D6. Portões de qualidade
- **Estático:** `tsc --noEmit` com `strict`; ESLint flat config sobre o `eslint-config-next` (`core-web-vitals` + `typescript`), reaproveitando as instâncias dos plugins `jsx-a11y` e `@typescript-eslint` que ele já registra (sem registrar de novo, o que dá "Cannot redefine plugin"): os objetos de config seguintes só ativam regras desses plugins. As regras strict do `jsx-a11y` vêm de `jsxA11y.flatConfigs.strict.rules`, importando `eslint-plugin-jsx-a11y` **só para ler as regras** (ele entra como devDependency explícita, na mesma versão usada pelo `eslint-config-next`); com `typescript-eslint` strict-type-checked. `knip` para arquivos, exports e dependências não usados, com `components/ui/**` ignorado (código gerado), `instrumentation.ts`/`scripts/*` como entries e `ignoreDependencies` só para o que não tem import direto nesta change: `shadcn` (CLI), `lucide-react` (pedido pelo `shadcn init`, usado a partir dos primeiros ícones), `tw-animate-css` (importado por CSS) e `@testing-library/dom` (peer do `@testing-library/react`). Cada entrada leva um comentário com o motivo e é revista quando o pacote ganhar uso.
- **Regras extras (D8):** valem para o código do projeto; `components/ui/**` (gerado pelo shadcn) fica fora de `no-restricted-syntax` (valores arbitrários) e de `no-magic-numbers`.
- **Vitest com `projects`:**
  - `unit` (ambiente `node`), `integration` e `contract` (ambiente `node`, MySQL e Mailpit reais) e `a11y` (ambiente `jsdom`, Testing Library + `vitest-axe`).
  - `vitest.config.ts` lê o `.env.local` com `parseEnv(readFileSync('.env.local', 'utf8'))` e injeta em `test.env` as variáveis do `.env.local` com `DATABASE_URL` = `DATABASE_URL_TEST`.
  - Aliases: `@/` → raiz (manual, sem `vite-tsconfig-paths`) e `server-only` → `tests/helpers/empty-module.ts`.
  - JSX via `oxc: { jsx: { runtime: "automatic" } }` (no Vite 8, `esbuild` está obsoleto; sem `@vitejs/plugin-react`).
  - `integration` e `contract`: `globalSetup` (`tests/setup/global-setup.ts`) que conecta por `DATABASE_URL_TEST` (ele roda no processo principal, fora do `test.env`) e **aborta** se `SELECT DATABASE()` não for `auth_test` e aplica as migrações com o migrator do Drizzle; `setupFiles` (`tests/setup/truncate.ts`) trunca as tabelas em `beforeAll` de cada arquivo; `fileParallelism: false`; `sequence.groupOrder` distinto para que os dois projetos não rodem ao mesmo tempo contra o mesmo banco.
  - Relógio: `vi.useFakeTimers({ toFake: ["Date"] })` + `vi.setSystemTime` (timers falsos completos travam o `mysql2`).
  - Tipos do `vitest-axe`: `tests/a11y/vitest-axe.d.ts` declara o matcher no formato do Vitest atual.
  - Alternativa descartada: arquivos de config separados por tipo, que duplicam alias e setup.
- **Sessões nos testes** (`tests/helpers/session.ts`): sem método de login, cria usuário e sessão por `(await auth.$context).internalAdapter` e monta o cookie com o nome de `authCookies.sessionToken` e o token assinado pelo utilitário de assinatura do próprio Better Auth (sem reimplementar HMAC). Testes de revogação/expiração mandam só o cookie de token (sem o cookie de cache), para medir o banco; um teste separado documenta a janela de 5 minutos do cache.
- **Helper do Mailpit** (`tests/helpers/mailpit.ts`): API REST (`/api/v1/messages`, `/api/v1/message/{id}`, `DELETE /api/v1/messages`) para buscar o último e-mail de um destinatário e limpar a caixa. Substitui o E2E nos fluxos por e-mail.
- **Contrato de API:** schemas Zod em `tests/contract/schemas/` para as respostas de `/api/auth/*` (nesta change, `get-session`). Os testes chamam o handler real via `auth.handler(new Request(...))`, sem subir servidor.
- **Contrato de interface:** `describeEmailSenderContract(factory)` (envio válido; erro genérico em falha do transporte) e `describeSmsSenderContract(factory)` (envio válido; rejeição fora de E.164; erro genérico em falha) são suítes parametrizadas que cada implementação invoca.
- **Acessibilidade de página:** Playwright só com Chromium (`npx playwright install chromium`), `webServer` = `next build && next start -p 3100` com `DATABASE_URL` → `auth_test` e `BETTER_AUTH_URL=http://localhost:3100`, `reuseExistingServer: false` (nunca reaproveita o `next dev` do desenvolvedor, que aponta para o `auth_dev`). Um teste por rota com `@axe-core/playwright` (tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`), conferindo também status 200, `lang` e texto em pt-BR.
- **Mutação:** Stryker com `@stryker-mutator/vitest-runner`, `concurrency: 1` (as sandboxes não disputam o `auth_test`), `mutate: ["lib/**/*.ts", "services/**/*.ts"]` excluindo arquivos só de valores ou gerados (`lib/constants/**`, `lib/routes.ts`, `lib/errors/messages.ts`, `lib/utils.ts`) e arquivos só de tipos; `thresholds.break: 80`; `incremental: true`. `services/` passa a ter arquivos a partir da change `cadastro-login-email-senha`.
- **Scripts e donos:** o `qa` cria `test:unit`, `test:integration`, `test:contract`, `test:a11y`, `a11y:pages` e `test:mutation`; o `dev-db` cria `db:generate`, `db:migrate`, `db:studio`; o `infra` cria `typecheck`, `lint`, `knip`, `env:init`, `auth:generate` e os agregadores `qa` (estático e testes em sequência, parando no primeiro que falhar) e `qa:mutation` (chama `test:mutation`).

### D7. UI
- Tailwind v4 com `shadcn init` e os componentes `button`, `input`, `label` e `card`. O `form` do shadcn **não** entra: ele depende de `react-hook-form`, e os formulários usam `useActionState` (skill `boas-praticas-interface`, seção 5).
- A fonte vem de `next/font`, e o `lang="pt-BR"` fica no `app/layout.tsx`. `metadata.title` por rota, um `h1` por página e `<main>` como landmark.
- Os tokens semânticos do shadcn (claro e escuro) em `app/globals.css` são a única fonte de valores visuais (skill `boas-praticas-interface`, seção 12.1). **Tema escuro automático, sem botão de alternar:** `@custom-variant dark (@media (prefers-color-scheme: dark));` para o variant `dark:` **e** o bloco de tokens escuros que o shadcn gera sob `.dark { ... }` passa para `@media (prefers-color-scheme: dark) { :root { ... } }`. Sem as duas mudanças juntas, os utilitários `dark:` dos componentes acendem sobre tokens claros (tema misto). A varredura de páginas roda nas duas preferências (`page.emulateMedia({ colorScheme })`), o que também confere contraste no escuro.

### D8. Bases transversais
- **Logger** (`lib/logger.ts`): `logger.info|warn|error(event, fields)` escreve uma linha JSON (`level`, `event`, `timestamp`, campos). Único lugar com `console.*`. Exporta `maskEmail` e `maskPhone`. Alternativa descartada: `pino`, dependência extra sem ganho num projeto local.
- **Erros** (`lib/errors/`): `codes.ts` com o catálogo inicial (`UNEXPECTED`, `VALIDATION_FAILED`), `messages.ts` com a lookup table `satisfies Record<ErrorCode, string>` em pt-BR e `action-result.ts` com o tipo `ActionResult<T>`. Os fluxos acrescentam códigos nas próximas changes. Até lá, um teste de tipo (`expectTypeOf`) consome `ActionResult`, para o `knip` não acusar export sem uso.
- **Rotas** (`lib/routes.ts`): `ROUTES` com `HOME` nesta change; as demais entram com cada fluxo.
- **ESLint**: além dos presets, `no-magic-numbers` (fora de testes, configs e `components/ui/**`), `no-console` (exceto `lib/logger.ts`), `@eslint-community/eslint-plugin-eslint-comments` com `no-use` permitindo só `eslint-disable-next-line` e `require-description` (motivo obrigatório depois de ` -- `), e `no-restricted-syntax` barrando valores arbitrários de Tailwind (`[...]`) em literais de `className`/`cn()` fora de `components/ui/**`, sem plugin extra.
- **Makefile** (dono: infra): atalhos finos para scripts npm e `docker compose` (`help`, `setup`, `up`, `down`, `logs`, `dev`, `build`, `db-*`, `lint`, `typecheck`, `test`, `qa`, `qa-mutation`). `up` usa `docker compose up -d --wait` (espera o healthcheck do MySQL). `setup` = `up` → `env:init` → `db:migrate` → `npx playwright install chromium`. Os scripts npm continuam sendo a fonte; o `make` é opcional no Windows (`winget install ezwinports.make`). Sem alvos destrutivos. Alternativa descartada: só scripts npm, que funcionam mas não dão o `make help` como índice de comandos.
- **`scripts/with-env.mjs`:** carrega o `.env.local` (`process.loadEnvFile`), aplica `--react-server` quando pedido e executa o comando recebido. É o mecanismo da CLI do Better Auth (`auth:generate`). O `drizzle-kit` não passa por ele: o `drizzle.config.ts` carrega o `.env.local` sozinho (um mecanismo por ferramenta, sem duplicar). Resolve no Windows a falta de `VAR=valor cmd` nos scripts npm sem `cross-env`.
- **Git**: a sessão principal cria a branch `change/setup-fundacao`; daí em diante cada agente commita sua tarefa (convenções, seção 7). `.gitattributes` com `* text=auto eol=lf` evita os avisos de CRLF no Windows.

### D9. Dependências (versões exatas, `save-exact=true` no `.npmrc`)
Instaladas de uma vez pelo `infra` na tarefa 1.3; os demais agentes só configuram. Dependência fora desta lista exige atualizar este design (convenções, seção 1).
- **Aplicação:** `next`, `react`, `react-dom`, `better-auth`, `drizzle-orm`, `mysql2`, `zod`, `server-only`, `nodemailer`, `@react-email/components`, `@react-email/render`; dependências do shadcn: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `radix-ui` (o conjunto exato é o que o `shadcn init` da versão fixada pedir; se diferir, a tarefa 10.1 reporta `BLOQUEADO`). O `lib/utils.ts` exporta `cn()` com `clsx` + `tailwind-merge`; o pacote `cn` que o `shadcn` 4.x adiciona no `init`/`add` é rejeitado e os componentes importam `cn` de `@/lib/utils` (conferir os imports a cada `shadcn add`).
- **Desenvolvimento:** `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/nodemailer`, `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css`, `shadcn`, `eslint`, `eslint-config-next`, `typescript-eslint`, `@eslint-community/eslint-plugin-eslint-comments`, `knip`, `drizzle-kit`, CLI do Better Auth, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `vitest-axe`, `@playwright/test`, `@axe-core/playwright`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`, `eslint-plugin-jsx-a11y` (mesma versão da dependência do `eslint-config-next`, só para ler as regras strict).

## Risks / Trade-offs

- [Cookie `Secure` em `http://localhost` pode não ser aceito por algum navegador] → Chrome, Edge e Firefox aceitam em localhost. Se der problema, documentar `next dev --experimental-https`.
- [Cookie cache faz a revogação demorar até 5 minutos para valer] → Aceito e registrado na spec. A change `sessoes` pode desabilitar o cache em rotas sensíveis.
- [A CLI do Better Auth pode não respeitar snake_case ou não carregar o `lib/auth.ts` com `server-only`] → `with-env.mjs --react-server` e a tarefa condicional 7.3 com `fields`/`modelName`; se nenhum dos dois resolver, 7.2 devolve `BLOQUEADO`.
- [O schema gerado pela CLI do Better Auth muda quando entram plugins] → Cada change que adicionar plugin regenera o schema (`npm run auth:generate`) e cria uma nova migração do Drizzle.
- [Docker Desktop no Windows consome memória] → Um único contêiner MySQL para os dois bancos.
- [Mutação é lenta, e com `concurrency: 1` mais ainda] → Escopo restrito a `lib/` e `services/` sem arquivos só de valores, modo incremental e execução uma vez por change, não por tarefa.
- [Varredura de páginas com `next build` a cada execução é lenta] → Só Chromium e uma execução por `npm run qa`; o ganho é nunca tocar o `auth_dev`.
- [Sem E2E, problemas de integração entre a UI e as Server Actions podem passar] → Integração testa as Server Actions diretamente; a varredura axe abre cada página real e falha em erros de renderização.
- [Versões do Better Auth, Next e shadcn mudam rápido] → Versões exatas no `package.json` e `save-exact=true`.

## Migration Plan

Primeira change do projeto, sem dados existentes. Para desfazer, basta remover os arquivos criados e, por decisão explícita do usuário, os volumes do Docker (`docker compose down -v`, fora do Makefile).

# Design

## Context

O repositório tem só a configuração do OpenSpec. Não existe código, `package.json` nem specs. Motivação e escopo estão em `proposal.md`; os requisitos estão em `specs/sessao`, `specs/notificacoes` e `specs/ambiente-local`. O alvo é apenas a máquina local do desenvolvedor (Windows 11 com Docker Desktop).

## Goals / Non-Goals

**Goals:**
- Deixar uma estrutura em que as próximas changes só acrescentem plugins do Better Auth, telas e Server Actions, sem mexer em infraestrutura.
- Deixar todos os portões de qualidade (estático, unitário, integração, contrato, acessibilidade e mutação) configurados desde já, cada um com um exemplo passando, para que as próximas changes só acrescentem testes.

**Non-Goals:**
- Nenhum método de login habilitado (o `emailAndPassword` fica desligado até a change `cadastro-login-email-senha`).
- Nenhum adapter de produção, CI ou deploy.
- Nenhum teste E2E de fluxo: fluxos são provados por testes de integração; o Playwright só varre páginas com axe.

## Decisions

### D1. Estrutura de pastas
```
app/                      # rotas finas (App Router); app/api/auth/[...all]/route.ts
components/ hooks/ actions/ services/ schemas/ types/   # estrutura por tipo (skill `boas-praticas-interface`, seção 1); criadas sob demanda a partir da change cadastro-login-email-senha
components/ui/            # shadcn/ui
lib/env.ts                # validação de env com Zod
lib/auth.ts               # instância do Better Auth (somente servidor)
lib/auth-client.ts        # createAuthClient (cliente)
lib/constants/auth.ts     # durações de sessão, cookie cache e afins
lib/routes.ts             # mapa ROUTES (URLs em pt-BR)
lib/logger.ts             # logger JSON mínimo + maskEmail/maskPhone
lib/errors/               # codes.ts, messages.ts, action-result.ts
lib/notifications/        # email.ts, sms.ts (interfaces + implementações + factory)
db/index.ts, db/schema/   # cliente Drizzle + schema
drizzle/                  # migrações geradas
emails/                   # templates React Email
tests/unit/               # Vitest, sem banco/rede
tests/integration/        # Vitest contra auth_test + Mailpit
tests/contract/           # schemas/, api/, interfaces/
tests/a11y/               # vitest-axe em componentes
tests/helpers/            # mailpit.ts, db.ts, captura de SMS
a11y/                     # Playwright + @axe-core/playwright (varredura de páginas)
```
`lib/auth.ts` e `db/` importam `server-only` para impedir vazamento para o bundle do cliente. Convenções nas skills `convencoes-de-codigo`, `boas-praticas-servidor` e `boas-praticas-interface`.

### D2. Better Auth + Drizzle
- `drizzleAdapter(db, { provider: "mysql" })`.
- O schema é gerado com `npx @better-auth/cli generate` para `db/schema/auth.ts`, e as migrações com `drizzle-kit generate`/`migrate`. Alternativa descartada: `@better-auth/cli migrate` direto, que deixaria as migrações fora do controle do Drizzle.
- Configuração da sessão: `expiresIn` de 30 dias, `updateAge` de 1 dia e `cookieCache: { enabled: true, maxAge }` de 5 minutos, todos como constantes nomeadas em `lib/constants/auth.ts`.
- Nomes no banco: o Drizzle usa `casing: "snake_case"` no cliente e no `drizzle.config.ts`, e o schema gerado pela CLI do Better Auth é conferido para que as colunas saiam em snake_case (ex.: `email_verified`, `user_id`). Se a CLI não respeitar o casing, o dev-db mapeia os nomes das colunas no schema gerado via opção `fields` do Better Auth, sem editar o arquivo à mão.
- `rateLimit: { storage: "database" }` já fica habilitado (tabela gerada agora; os limites por rota entram na próxima change).
- Cookies: `advanced.useSecureCookies: true` força `Secure` mesmo em `http://localhost` (navegadores tratam localhost como contexto seguro). `SameSite=Lax` e `HttpOnly` são o padrão do Better Auth e ficam explícitos em `advanced.defaultCookieAttributes`.
- Plugin `nextCookies()` para que as Server Actions consigam definir cookies.

### D3. Banco MySQL
- Uma imagem `mysql:8.4` no compose, com um script de init que cria os bancos `auth_dev` e `auth_test`. Alternativa descartada: dois contêineres, que gastam mais memória sem ganho.
- Pool via `mysql2/promise`, com a URL em `DATABASE_URL`. Os testes usam `DATABASE_URL_TEST`.
- Charset `utf8mb4` / collation `utf8mb4_0900_ai_ci`.

### D4. Notificações
- Interfaces `EmailSender.send({ to, subject, react })` e `SmsSender.send({ to, text })`.
- `SmtpEmailSender` usa `nodemailer` apontando para o Mailpit (porta 1025) e gera HTML e texto com `@react-email/render`.
- `ConsoleSmsSender` valida E.164 com regex (`^\+[1-9]\d{7,14}$`) e escreve pelo `lib/logger.ts` o evento `sms_sent_dev` com `to` e `text` (exceção documentada à regra de não logar conteúdo, só com `SMS_PROVIDER=console`). A `libphonenumber-js` fica para a change `telefone`.
- Uma factory escolhe a implementação por `EMAIL_PROVIDER` (`smtp`) e `SMS_PROVIDER` (`console`). Novos provedores entram como novos valores do enum, sem tocar nos fluxos.

### D5. Variáveis de ambiente
`lib/env.ts` faz o parse de `process.env` com Zod no carregamento do módulo e lança um erro listando os nomes das variáveis inválidas, sem os valores. Variáveis: `BETTER_AUTH_SECRET` (mínimo de 32), `BETTER_AUTH_URL`, `DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`, `EMAIL_PROVIDER`, `SMS_PROVIDER`. É importado por `lib/auth.ts`, então qualquer rota que use autenticação falha cedo. Alternativa descartada: `@t3-oss/env-nextjs`, dependência extra para pouco ganho aqui.

### D6. Portões de qualidade
- **Estático:** `tsc --noEmit` com `strict`, ESLint flat config (`next/core-web-vitals`, `typescript-eslint` strict-type-checked, `eslint-plugin-jsx-a11y`) e `knip` para arquivos, exports e dependências não usados.
- **Vitest com `projects`:** `unit` (ambiente `node`, sem banco), `integration` (`globalSetup` aplica as migrações no `auth_test`; tabelas truncadas entre arquivos; `fileParallelism: false`), `contract` (idem integração) e `a11y` (ambiente `jsdom`, Testing Library + `vitest-axe`). Alternativa descartada: arquivos de config separados por tipo, que duplicam alias e setup.
- **Helper do Mailpit** (`tests/helpers/mailpit.ts`): usa a API REST (`/api/v1/messages`, `/api/v1/message/{id}`, `DELETE /api/v1/messages`) para buscar o último e-mail de um destinatário e limpar a caixa. É o que substitui o E2E nos fluxos por e-mail.
- **Contrato de API:** schemas Zod em `tests/contract/schemas/` para as respostas de `/api/auth/*` (nesta change, `get-session`). Os testes chamam o handler real via `auth.handler(new Request(...))`, sem subir servidor.
- **Contrato de interface:** `describeEmailSenderContract(factory)` e `describeSmsSenderContract(factory)` são suítes parametrizadas que cada implementação invoca.
- **Acessibilidade de página:** Playwright com `webServer` (`next dev`, `DATABASE_URL` → `auth_test`), um teste por rota usando `@axe-core/playwright` com tags `wcag2a`, `wcag2aa`, `wcag21aa` e `wcag22aa`. Só Chromium, para ser mais rápido.
- **Mutação:** Stryker com `@stryker-mutator/vitest-runner`, `mutate: ["lib/**/*.ts", "services/**/*.ts"]` (onde mora a lógica de autenticação; `services/` passa a ter arquivos a partir da change `cadastro-login-email-senha`; excluindo `lib/auth-client.ts` e arquivos só de tipos), `thresholds.break: 80` e `incremental: true` para reaproveitar resultados entre execuções.
- **Scripts:** `typecheck`, `lint`, `knip`, `test:unit`, `test:integration`, `test:contract`, `test:a11y`, `a11y:pages`; `qa` roda os de estático e de teste em sequência, parando no primeiro que falhar; `qa:mutation` roda o Stryker.

### D8. Bases transversais
- **Logger** (`lib/logger.ts`): `logger.info|warn|error(event, fields)` escreve uma linha JSON (`level`, `event`, `timestamp`, campos). Único lugar com `console.*`. Exporta `maskEmail` e `maskPhone`. Alternativa descartada: `pino`, dependência extra sem ganho num projeto local.
- **Erros** (`lib/errors/`): `codes.ts` com o catálogo inicial (`UNEXPECTED`, `VALIDATION_FAILED`), `messages.ts` com a lookup table `satisfies Record<ErrorCode, string>` em pt-BR e `action-result.ts` com o tipo `ActionResult<T>`. Os fluxos acrescentam códigos nas próximas changes.
- **Rotas** (`lib/routes.ts`): `ROUTES` com `HOME` nesta change; as demais entram com cada fluxo.
- **ESLint**: além dos presets, `no-magic-numbers` (fora de testes e configs), `no-console` (exceto `lib/logger.ts`), `@eslint-community/eslint-plugin-eslint-comments` com `no-use` permitindo só `eslint-disable-next-line` e `require-description` (motivo obrigatório depois de ` -- `), e `no-restricted-syntax` barrando valores arbitrários de Tailwind (`[...]`) em literais de `className`/`cn()`, sem plugin extra.
- **Makefile** (dono: infra): atalhos finos para scripts npm e `docker compose` (`help`, `setup`, `up`, `down`, `logs`, `dev`, `build`, `db-*`, `lint`, `typecheck`, `test`, `qa`, `qa-mutation`). Os scripts npm continuam sendo a fonte; o `make` é opcional no Windows (`winget install ezwinports.make`). Sem alvos destrutivos. Alternativa descartada: só scripts npm, que funcionam mas não dão o `make help` como índice de comandos.
- **Git**: a sessão principal faz o commit inicial na `main` (OpenSpec, agentes, docs) e cria a branch `change/setup-fundacao`; daí em diante cada agente commita sua tarefa (convenções, seção 7).

### D7. UI
Tailwind v4 com `shadcn init` (componentes `button`, `input`, `label`, `card`, `form`). A fonte vem de `next/font`, e o `lang="pt-BR"` fica no `app/layout.tsx`. Os tokens semânticos do shadcn (claro e escuro) em `app/globals.css` são a única fonte de valores visuais (skill `boas-praticas-interface`, seção 12.1).

## Risks / Trade-offs

- [Cookie `Secure` em `http://localhost` pode não ser aceito por algum navegador] → Chrome, Edge e Firefox aceitam em localhost. Se der problema, documentar `next dev --experimental-https`.
- [Cookie cache faz a revogação demorar até 5 minutos para valer] → Aceito e registrado na spec. A change `sessoes` pode desabilitar o cache em rotas sensíveis.
- [O schema gerado pela CLI do Better Auth muda quando entram plugins] → Cada change que adicionar plugin regenera o schema e cria uma nova migração do Drizzle.
- [Docker Desktop no Windows consome memória] → Um único contêiner MySQL para os dois bancos.
- [Mutação é lenta e pode travar o fluxo] → Escopo restrito a `lib/` e `services/`, modo incremental e execução uma vez por change, não por tarefa.
- [Sem E2E, problemas de integração entre a UI e as Server Actions podem passar] → Integração testa as Server Actions diretamente; a varredura axe abre cada página real e falha em erros de renderização.
- [Versões do Better Auth mudam rápido] → Fixar as versões exatas no `package.json`.

## Migration Plan

Primeira change do projeto, sem dados existentes. Para desfazer, basta remover os arquivos criados e os volumes do Docker (`docker compose down -v`).

# Tasks

## 1. Scaffold do app (infra)

- [ ] 1.1 Criar o app Next.js 16 com TypeScript (`strict: true`), App Router e Tailwind v4 na raiz do repositório, e verificar que `npm run build` conclui sem erros
- [ ] 1.2 Criar `.gitignore` (`.env*` exceto `.env.example`, `.next/`, `coverage/`, `reports/`, `test-results/`, `.stryker-tmp/`), e verificar que `git status` não lista `.env.local` nem artefatos. (O `git init`, o commit inicial na `main` e a branch `change/setup-fundacao` são feitos pela sessão principal antes do grupo 1.)
- [ ] 1.3 Instalar `zod` e `server-only` com versões fixadas, e verificar que `npm ls zod server-only` lista os dois

## 2. Análise estática (infra)

- [ ] 2.1 Configurar o ESLint flat config com `next/core-web-vitals`, `typescript-eslint` strict-type-checked, `eslint-plugin-jsx-a11y` e as regras da D8 (`no-magic-numbers` fora de testes/configs, `no-console` exceto `lib/logger.ts`, `eslint-comments` só com `disable-next-line` justificado, `no-restricted-syntax` contra valores arbitrários de Tailwind), e verificar que `npm run lint` passa no scaffold e falha, em arquivos temporários, com: `<img>` sem `alt`, número mágico, `console.log`, `/* eslint-disable */` e `className="text-[15px]"`
- [ ] 2.2 Configurar o `knip` e os scripts `typecheck`, `lint` e `knip`, e verificar que os três passam no scaffold

## 3. Ambiente local (infra)

- [ ] 3.1 Criar `docker-compose.yml` com `mysql:8.4` (volume nomeado, healthcheck) e `axllent/mailpit` (portas 1025 e 8025, versão fixada), e verificar que `docker compose up -d` deixa os dois serviços `healthy`/`running`
- [ ] 3.2 Adicionar `docker/mysql/init.sql`, que cria `auth_dev` e `auth_test` em `utf8mb4`, e verificar com `docker compose exec mysql mysql -e "SHOW DATABASES"` que os dois existem e que a interface do Mailpit abre em `http://localhost:8025`
- [ ] 3.3 Criar `.env.example` com todas as variáveis da D5 documentadas em pt-BR, e verificar que todas as variáveis lidas em `lib/env.ts` constam nele

## 4. Base de testes unitários (qa)

- [ ] 4.1 Instalar `vitest` e criar `vitest.config.ts` com `projects` (`unit`, `integration`, `contract`, `a11y`), alias `@/` e os scripts `test:unit`, `test:integration`, `test:contract` e `test:a11y`, e verificar que `npm run test:unit` roda um teste trivial

## 5. Configuração e bases transversais (dev-next)

- [ ] 5.1 Implementar `lib/env.ts` (schema Zod da D5) que lança erro com os nomes das variáveis inválidas e sem os valores, e verificar com testes em `tests/unit/` (escritos antes, vistos falhando) os casos de variável ausente, segredo com menos de 32 caracteres e mensagem de erro sem o valor secreto · alto risco
- [ ] 5.2 Implementar `lib/logger.ts` (JSON de uma linha com `level`, `event`, `timestamp`; `maskEmail`, `maskPhone`), e verificar com testes unitários o formato da linha, o mascaramento e que o `npm run lint` acusa `console.*` em qualquer outro arquivo
- [ ] 5.3 Criar `lib/errors/` (`codes.ts` com `UNEXPECTED` e `VALIDATION_FAILED`, `messages.ts` com lookup table `satisfies Record<ErrorCode, string>` em pt-BR, `action-result.ts`), `lib/routes.ts` (`ROUTES.HOME`) e `lib/constants/auth.ts` (constantes de sessão da D2), e verificar com teste unitário que todo código tem mensagem e com `npm run typecheck` que um código sem mensagem não compila

## 6. Banco de dados (dev-db)

- [ ] 6.1 Instalar `drizzle-orm`, `drizzle-kit` e `mysql2` (versões fixadas, com dependências pedidas ao infra), criar `db/index.ts` (pool `mysql2/promise` com `server-only`, `casing: "snake_case"`) e `drizzle.config.ts` (`casing: "snake_case"`), e verificar que `npx drizzle-kit check` roda sem erro
- [ ] 6.2 Adicionar os scripts `db:generate`, `db:migrate` e `db:studio`, e verificar que `npm run db:studio` conecta ao `auth_dev`

## 7. Better Auth e sessão (dev-next + dev-db)

- [ ] 7.1 (dev-next) Instalar `better-auth` (versão fixada) e criar `lib/auth.ts` com o adapter Drizzle/MySQL, a configuração de sessão da D2 (constantes de `lib/constants/auth.ts`), `rateLimit.storage = "database"`, `useSecureCookies`, atributos de cookie explícitos e o plugin `nextCookies()`, e verificar que `npm run typecheck` passa · alto risco
- [ ] 7.2 (dev-db) Gerar `db/schema/auth.ts` com `npx @better-auth/cli generate`, gerar a migração com `npm run db:generate`, ler o SQL gerado, aplicar com `npm run db:migrate` e verificar que as tabelas `user`, `session`, `account`, `verification` e `rate_limit` existem no `auth_dev` com colunas em snake_case (ex.: `email_verified`, `user_id`, `expires_at`)
- [ ] 7.3 (dev-next) Criar `app/api/auth/[...all]/route.ts` com `toNextJsHandler` e `lib/auth-client.ts`, e verificar que `GET /api/auth/get-session` sem cookie responde 200 com `null`

## 8. Base de testes de integração e contrato (qa)

- [ ] 8.1 Configurar o `globalSetup` dos projetos `integration` e `contract` (migrar o `auth_test`, truncar tabelas entre arquivos, `fileParallelism: false`) e o helper `tests/helpers/db.ts`, e verificar que `npm run test:integration` roda e que a contagem de linhas do `auth_dev` fica igual antes e depois
- [ ] 8.2 Escrever testes de integração para a spec `sessao` (expiração após 30 dias, renovação após 1 dia de uso, ausência de renovação antes de 1 dia, sessão removida e token inválido tratados como não autenticados, atributos `HttpOnly`/`Secure`/`SameSite=Lax`/`Path=/` no cookie) e verificar que passam
- [ ] 8.3 Criar o schema Zod de `get-session` em `tests/contract/schemas/` e o teste de contrato que chama `auth.handler` com e sem sessão, e verificar que passa e que falha se o formato da resposta mudar (alterando o schema temporariamente)

## 9. Notificações (dev-next + qa)

- [ ] 9.1 (dev-next) Criar as interfaces `EmailSender` e `SmsSender` e a factory baseada em `EMAIL_PROVIDER`/`SMS_PROVIDER` em `lib/notifications/`, e verificar com teste unitário que a factory devolve a implementação correta para cada valor
- [ ] 9.2 (qa) Criar as suítes de contrato `describeEmailSenderContract` e `describeSmsSenderContract` em `tests/contract/interfaces/` (envio válido, rejeição de destinatário inválido, erro genérico em falha do transporte), e verificar que rodam contra um dublê de teste
- [ ] 9.3 (dev-next) Implementar `ConsoleSmsSender` com validação E.164, escrevendo pelo `lib/logger.ts` o evento `sms_sent_dev`, e verificar que passa na suíte de contrato de `SmsSender` e que o teste unitário confere a linha JSON com `event`, `to` e `text`
- [ ] 9.4 (dev-next) Instalar `nodemailer`, `@react-email/components` e `@react-email/render`, criar um template de exemplo em `emails/` e implementar `SmtpEmailSender` (HTML e texto, falha de SMTP registrada no log e lançada como erro genérico), e verificar que passa na suíte de contrato de `EmailSender`
- [ ] 9.5 (qa) Criar o helper `tests/helpers/mailpit.ts` (buscar o último e-mail de um destinatário, limpar a caixa) e um teste de integração que envia pelo `SmtpEmailSender` e confere no Mailpit o assunto, o HTML e o texto, e verificar que passa

## 10. UI base (uiux)

- [ ] 10.1 Rodar `shadcn init` e adicionar os componentes `button`, `input`, `label`, `card` e `form`, e verificar que `npm run build` passa
- [ ] 10.2 Definir `<html lang="pt-BR">`, a fonte via `next/font`, os tokens semânticos claro/escuro em `app/globals.css` e uma página inicial em português em `app/page.tsx` usando `Card` e `Button` só com utilitários semânticos, e verificar no navegador que `/` responde 200 com o texto em pt-BR e que `npm run lint` não acusa valor arbitrário

## 11. Acessibilidade (qa)

- [ ] 11.1 Instalar `@testing-library/react`, `jsdom` e `vitest-axe`, configurar o projeto `a11y` do Vitest e escrever um teste para `Button` e `Input` com `Label`, e verificar que passa e que falha com um `Input` sem rótulo
- [ ] 11.2 Instalar `@playwright/test` (só Chromium) e `@axe-core/playwright`, criar `playwright.config.ts` (com `webServer` apontando para o `auth_test`) e `a11y/home.spec.ts` (tags WCAG 2.2 AA), e o script `a11y:pages`, e verificar que `/` passa sem violações e que `lang="pt-BR"` está presente

## 12. Mutação (qa)

- [ ] 12.1 Instalar `@stryker-mutator/core` e `@stryker-mutator/vitest-runner`, criar `stryker.config.mjs` (`mutate: lib/**/*.ts` exceto `lib/auth-client.ts` e arquivos só de tipos, `thresholds.break: 80`, `incremental: true`) e o script `qa:mutation`, e verificar que roda sobre `lib/env.ts`, `lib/logger.ts`, `lib/errors/` e `lib/notifications/` com score ≥ 80%, adicionando testes para os mutantes sobreviventes relevantes

## 13. Portão de qualidade e documentação (infra)

- [ ] 13.1 Criar o script `qa` (`typecheck` → `lint` → `knip` → `test:unit` → `test:integration` → `test:contract` → `test:a11y` → `a11y:pages`, parando no primeiro que falhar), e verificar que passa e que retorna código diferente de 0 ao introduzir temporariamente um erro de tipo
- [ ] 13.2 Criar o `Makefile` (D8) com os alvos `help` (padrão), `setup` (sobe os serviços, cria `.env.local` a partir do `.env.example` só se não existir, aplica migrações), `up`, `down`, `logs`, `dev`, `build`, `db-generate`, `db-migrate`, `db-studio`, `lint`, `typecheck`, `test`, `qa` e `qa-mutation`, todos `.PHONY` e delegando a scripts npm ou ao `docker compose`, sem alvo destrutivo, e verificar no Windows (`winget install ezwinports.make`) que `make help` lista todos os alvos com descrição e que `make up`, `make qa` e `make down` funcionam
- [ ] 13.3 Escrever o README em pt-BR com pré-requisitos (Node, Docker Desktop e, opcionalmente, GNU Make via `winget install ezwinports.make`), o início rápido (`make setup` → `make dev`, com os comandos npm/docker equivalentes para quem não usa `make`), a tabela de portões de qualidade (`make qa`/`npm run qa`, `make qa-mutation`/`npm run qa:mutation`) e o roadmap das changes, e verificar seguindo os passos num clone limpo

## 14. Verificação integrada

- [ ] 14.1 Com o ambiente recém-subido (`make down` + `make up`, sem apagar volumes), rodar `make build`, `make qa` e `make qa-mutation`, e verificar que todos passam

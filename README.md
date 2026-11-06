# Sistema de autenticação Next.js

Projeto de estudo e portfólio: autenticação com Next.js 16 (App Router, Server Actions), Better Auth, Drizzle ORM, MySQL 8.4 e Docker. Roda **apenas localmente**; não há deploy. Interface e URLs em pt-BR, código em inglês. O planejamento fica em [`openspec/`](openspec/) (uma change por capacidade) e as convenções, em [`docs/`](docs/README.md).

## Pré-requisitos

- Node.js 22 ou superior
- Docker Desktop (Windows 11) em execução
- Opcional: GNU Make. No Windows: `winget install ezwinports.make` (reabra o terminal depois). Sem o Make, use os comandos equivalentes abaixo.

## Início rápido

Com Make:

```sh
npm install
make setup   # sobe o MySQL e o Mailpit, cria o .env.local, aplica as migrações e instala o Chromium
make dev     # http://localhost:3000
```

Sem Make (mesmos passos):

```sh
npm install
docker compose up -d --wait
npm run env:init
npm run db:migrate
npx playwright install chromium
npm run dev
```

Serviços locais: MySQL em `127.0.0.1:3306` (bancos `auth_dev` e `auth_test`), Mailpit com SMTP em `127.0.0.1:1025` e caixa de e-mails em <http://localhost:8025>.

O `.env.local` é gerado por `npm run env:init` a partir do `.env.example` e nunca é versionado. Para parar a stack, use `make down` ou `docker compose down` (os dados ficam nos volumes nomeados).

## Comandos

`make help` lista os alvos. Cada alvo chama um script do `package.json` ou o `docker compose`.

| Make | Equivalente | O que faz |
|---|---|---|
| `make up` | `docker compose up -d --wait` | Sobe a stack |
| `make down` | `docker compose down` | Para a stack, mantendo os volumes |
| `make logs` | `docker compose logs -f` | Logs da stack |
| `make dev` | `npm run dev` | Servidor de desenvolvimento |
| `make build` | `npm run build` | Build de produção |
| `make db-generate` | `npm run db:generate` | Gera migração a partir do schema |
| `make db-migrate` | `npm run db:migrate` | Aplica as migrações |
| `make db-studio` | `npm run db:studio` | Drizzle Studio |
| `make lint` | `npm run lint` | ESLint |
| `make typecheck` | `npm run typecheck` | TypeScript |
| `make test` | `npm run test:unit`, `test:integration`, `test:contract`, `test:a11y` | Suítes de teste |

## Portões de qualidade

| Comando | Cobre |
|---|---|
| `make qa` / `npm run qa` | tipos, lint, knip, testes unitários, de integração, de contrato e de acessibilidade, e acessibilidade das páginas (Playwright + axe). Para no primeiro que falhar. Exige a stack no ar. |
| `make qa-mutation` / `npm run qa:mutation` | testes de mutação (Stryker) em `lib/` e `services/`, com mínimo de 80%. Lento; roda no fim de cada change. |

## Roadmap das changes

As changes ficam em `openspec/changes/`, numeradas na ordem de implementação; cada uma começa com o `proposal.md`, e o design, as specs e as tarefas são escritos na sessão dela.

1. `setup-fundacao` (arquivada): base do projeto: app, Docker, banco, Better Auth, envio de e-mail/SMS, testes e portões.
2. `0002-cadastro-login-email-senha`: cadastro, verificação de e-mail, login e logout com e-mail e senha; limites de tentativas.
3. `0003-recuperacao-senha`: redefinição de senha por link enviado por e-mail.
4. `0004-magic-link`: entrada por link de acesso enviado por e-mail.
5. `0005-telefone-otp`: verificação de telefone e login por código SMS (OTP).
6. `0006-minha-conta`: visualização e manutenção dos dados da conta.
7. `0007-sessoes`: lista e revogação das sessões ativas.
8. `0008-auditoria`: registro e consulta dos eventos de segurança.

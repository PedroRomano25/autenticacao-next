# Proposal

## Why

O projeto está vazio, mas já tem um roteiro de oito changes de autenticação (cadastro/login, recuperação de senha, magic link, telefone, minha conta, sessões, auditoria). Todas dependem da mesma base: app Next.js, banco MySQL, Better Auth com sessões no banco, envio de e-mail/SMS e infraestrutura de testes. Construir essa base uma única vez, antes dos fluxos, evita que cada change reinvente configuração e mantém as próximas focadas só no comportamento.

## What Changes

- Criar o app Next.js 16 (App Router, Server Actions, TypeScript) com Tailwind CSS, shadcn/ui e Zod. A interface fica só em pt-BR.
- Adicionar `docker compose` com MySQL (desenvolvimento e teste) e Mailpit. O app roda com `next dev` fora do Docker.
- Configurar Drizzle ORM com `mysql2`, com migrações versionadas.
- Configurar o Better Auth com adapter Drizzle/MySQL e sessões persistidas no banco: duração de 30 dias, renovação deslizante a cada 1 dia, cookie cache de 5 minutos, cookies `httpOnly`, `Secure` e `SameSite=Lax`. Gerar o schema das tabelas de autenticação pela CLI do Better Auth.
- Expor o handler do Better Auth em `/api/auth/*`, sem nenhum método de login habilitado ainda.
- Criar a abstração de envio de e-mail (`EmailSender`), com implementação SMTP para o Mailpit e templates em React Email.
- Criar a abstração de envio de SMS (`SmsSender`), com implementação que escreve no console do servidor.
- Validar as variáveis de ambiente na inicialização com Zod e documentá-las em `.env.example`.
- Configurar os portões de qualidade, com um exemplo funcional de cada tipo: análise estática (`tsc` strict, ESLint com `jsx-a11y`, `knip`), testes unitários e de integração com Vitest (banco MySQL de teste isolado e helper para ler e-mails pela API do Mailpit), testes de contrato (respostas da API e interfaces de envio), acessibilidade de componente (`vitest-axe`) e de página (Playwright + axe, só para varredura, sem E2E de fluxo) e testes de mutação com Stryker sobre `lib/`. Os comandos são agregados em `npm run qa` e `npm run qa:mutation`.
- Documentar no README como subir o ambiente local e rodar os testes.

## Capabilities

### New Capabilities
- `sessao`: ciclo de vida e atributos das sessões de autenticação (persistência no banco, duração, renovação, atributos do cookie).
- `notificacoes`: entrega de mensagens transacionais por e-mail e SMS, com destinos de desenvolvimento observáveis (caixa do Mailpit e console).
- `ambiente-local`: como o desenvolvedor sobe, configura e testa o sistema na máquina local, incluindo a validação de configuração na inicialização.

### Modified Capabilities
<!-- Nenhuma: não há specs existentes. -->

## Impact

- **Código:** cria toda a estrutura inicial do repositório (`app/`, `lib/`, `db/`, `emails/`, `tests/`, `a11y/`).
- **Dependências novas:** `next`, `react`, `tailwindcss`, componentes shadcn/ui, `zod`, `drizzle-orm`, `drizzle-kit`, `mysql2`, `better-auth`, `nodemailer`, `@react-email/components`; para qualidade, `vitest`, `@testing-library/react`, `vitest-axe`, `@playwright/test`, `@axe-core/playwright`, `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`, `typescript-eslint`, `eslint-plugin-jsx-a11y`, `@eslint-community/eslint-plugin-eslint-comments` e `knip`.
- **Convenções:** o código segue as skills `convencoes-de-codigo`, `boas-praticas-servidor` e `boas-praticas-interface`; esta change cria as bases que elas exigem (logger, catálogo de erros, `ROUTES`, constantes de autenticação, regras de ESLint).
- **Sem testes E2E de fluxo:** os fluxos são cobertos por testes de integração; o Playwright serve apenas para a varredura de acessibilidade das páginas.
- **Infraestrutura:** Docker Desktop passa a ser pré-requisito do desenvolvimento local.
- **Fora de escopo:** fluxos de cadastro/login (change `cadastro-login-email-senha` em diante), adapters de produção (Resend/Twilio), deploy, papéis/admin, 2FA e OAuth.

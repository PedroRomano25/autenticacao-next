# Proposal

## Why

A fundação deixou o Better Auth, as sessões e o envio de e-mail prontos, mas nenhum método de entrada está habilitado: ninguém consegue criar conta nem entrar. Cadastro e login com e-mail e senha são o fluxo de que todas as outras changes dependem (recuperação de senha, minha conta, sessões, auditoria), então vêm primeiro.

## What Changes

- Habilitar `emailAndPassword` no Better Auth, com política de senha num lugar só (`lib/constants/auth.ts`) e e-mail normalizado (minúsculas, sem espaços nas pontas).
- Tela `/cadastro`: nome, e-mail e senha. Ao cadastrar, envia um e-mail de verificação (template React Email) e não abre sessão até o e-mail ser confirmado.
- Rota de confirmação do e-mail: o link valida o token, marca o e-mail como verificado e leva o usuário para `/entrar`.
- Tela `/entrar`: e-mail e senha. Conta com e-mail não verificado recebe a orientação de confirmar (com opção de reenviar o e-mail), sem abrir sessão.
- Sair (logout) encerrando a sessão no servidor.
- Respostas que não revelam se a conta existe (mensagens e tempo equivalentes para e-mail cadastrado e não cadastrado, no cadastro e no login).
- Limites de tentativas por rota (login, cadastro, reenvio de verificação), por IP e por identificador normalizado, já com a regra da fundação de não confiar em `X-Forwarded-For`.
- Proteção de rotas: `requireSession` no servidor (considerando `cacheComponents: true`) e redirecionamento de quem não tem sessão para `/entrar`; a página inicial passa a apontar para entrar/cadastrar.
- Remover `session.token` da resposta de `get-session` (pendência de segurança da fundação) e atualizar o contrato.

## Capabilities

### New Capabilities
- `autenticacao-email-senha`: cadastro com e-mail e senha, verificação do e-mail, login, logout, política de senha e respostas sem enumeração de contas.
- `limite-de-tentativas`: limites de tentativas por rota de autenticação, como a origem do cliente é identificada e o que acontece quando o limite é atingido.

### Modified Capabilities
- `sessao`: o endpoint de consulta da sessão deixa de expor o token da sessão; rotas protegidas exigem sessão válida.

## Impact

- **Código:** `lib/auth.ts` (emailAndPassword, verificação, rate limit por rota), `actions/`/`services/` de cadastro e login, `schemas/` Zod, `app/(auth)/cadastro` e `app/(auth)/entrar`, componentes de formulário (uiux), template de e-mail de verificação, `lib/routes.ts` (`SIGN_IN`, `SIGN_UP`), catálogo de erros.
- **Banco:** provavelmente sem tabela nova (as tabelas do Better Auth já existem); confirmar no design se algum campo novo é necessário.
- **Dependências:** nenhuma prevista.
- **Fora de escopo:** recuperação de senha (0003), magic link (0004), telefone (0005), edição de conta (0006), lista de sessões (0007), OAuth, 2FA e papéis.

## Perguntas em aberto (para o design)

- Política de senha: tamanho mínimo e máximo, checagem contra senhas vazadas (exigiria dependência ou API externa) ou só tamanho.
- Tempo de validade do link de verificação e regra de reenvio.
- Login automático depois de confirmar o e-mail, ou só redirecionar para `/entrar`.
- Valores dos limites de tentativas por rota.

# Proposal

## Why

Com cadastro e login por senha (0002), quem esquece a senha fica sem acesso à conta. A recuperação por e-mail é o caminho padrão para recuperar o acesso sem intervenção manual e precisa existir antes de o sistema ter usuários de verdade.

## What Changes

- Tela `/recuperar-senha`: o usuário informa o e-mail e recebe um link de redefinição (template React Email). A resposta é a mesma para e-mail cadastrado e não cadastrado.
- Tela de nova senha, acessada pelo link: valida o token (uso único, com validade curta), aplica a mesma política de senha do cadastro e grava o novo hash.
- Depois da redefinição, todas as sessões existentes da conta são encerradas e o usuário é levado a entrar com a senha nova.
- E-mail de aviso de que a senha foi alterada, enviado ao endereço da conta.
- Limites de tentativas para o pedido de redefinição e para a troca da senha.

## Capabilities

### New Capabilities
- `recuperacao-de-senha`: pedido de redefinição por e-mail, validade e uso único do link, troca da senha e encerramento das sessões existentes.

### Modified Capabilities
- `limite-de-tentativas`: novas regras para o pedido de redefinição e para a troca da senha.

## Impact

- **Código:** `lib/auth.ts` (`sendResetPassword`, `revokeSessionsOnPasswordReset`), actions e schemas da recuperação, telas `/recuperar-senha` e de nova senha, dois templates de e-mail, `lib/routes.ts`.
- **Banco:** usa a tabela `verification` existente; sem migração prevista.
- **Dependências:** nenhuma.
- **Depende de:** 0002 (política de senha, limites de tentativas, telas de autenticação).
- **Fora de escopo:** troca de senha com a sessão aberta (fica em 0006), recuperação por SMS (0005).

## Perguntas em aberto (para o design)

- Validade do link (ex.: 15 ou 60 minutos).
- Se a redefinição também marca o e-mail como verificado, já que o usuário provou acesso à caixa.
- Se o usuário entra automaticamente depois de redefinir ou precisa fazer login.

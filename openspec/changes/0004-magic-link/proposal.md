# Proposal

## Why

Parte dos usuários prefere não criar nem lembrar uma senha. O magic link permite entrar só com acesso à caixa de e-mail, reaproveitando o envio de e-mail e as sessões que já existem, e reduz pedidos de recuperação de senha.

## What Changes

- Habilitar o plugin `magicLink` do Better Auth.
- Na tela `/entrar`, opção "Receber link de acesso por e-mail": o usuário informa o e-mail e recebe um link de uso único e validade curta (template React Email). A resposta é a mesma para e-mail cadastrado e não cadastrado.
- Ao abrir o link válido, a sessão é criada e o usuário segue para a área autenticada; link expirado, já usado ou adulterado leva a uma tela de erro com a opção de pedir outro.
- Entrar por magic link conta como prova de acesso ao e-mail (marca o e-mail como verificado).
- Limites de tentativas para o pedido de link.

## Capabilities

### New Capabilities
- `magic-link`: pedido do link por e-mail, validade e uso único, criação da sessão ao abrir o link e tratamento de link inválido.

### Modified Capabilities
- `limite-de-tentativas`: nova regra para o pedido de magic link.

## Impact

- **Código:** `lib/auth.ts` (plugin `magicLink` antes do `nextCookies()`), action e schema do pedido, ajuste da tela `/entrar` (uiux), tela de erro do link, template de e-mail, `lib/routes.ts`.
- **Banco:** usa a tabela `verification`; regenerar o schema do Better Auth caso o plugin exija campos novos (dev-db).
- **Dependências:** nenhuma (o plugin faz parte do `better-auth`).
- **Depende de:** 0002 (tela de entrada, limites de tentativas).
- **Fora de escopo:** link por SMS, login sem senha por passkey.

## Perguntas em aberto (para o design)

- E-mail sem conta: o magic link cria a conta (cadastro sem senha) ou só funciona para contas existentes?
- Validade do link (ex.: 10 ou 15 minutos).
- Se o link precisa ser aberto no mesmo navegador em que foi pedido.

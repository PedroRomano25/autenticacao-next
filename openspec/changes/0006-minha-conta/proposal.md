# Proposal

## Why

Depois de entrar, o usuário não tem onde ver nem alterar os próprios dados. Uma área "Minha conta" concentra a manutenção da conta (nome, e-mail, senha, telefone) e evita que essas alterações dependam de fluxos de recuperação ou de intervenção manual.

## What Changes

- Tela `/minha-conta` (rota protegida): mostra nome, e-mail (e se está verificado) e telefone (e se está verificado).
- Alterar o nome.
- Trocar a senha com a sessão aberta: exige a senha atual, aplica a política de senha e permite encerrar as outras sessões.
- Trocar o e-mail: o novo endereço só passa a valer depois de confirmado por link; o endereço antigo recebe um aviso.
- Vincular, trocar ou remover o telefone, reaproveitando a verificação por OTP de 0005.
- Excluir a conta, com confirmação explícita (senha ou reautenticação) e encerramento de todas as sessões.

## Capabilities

### New Capabilities
- `minha-conta`: visualização e manutenção dos dados da conta pelo próprio usuário (nome, e-mail, senha, telefone) e exclusão da conta.

### Modified Capabilities
<!-- A confirmar no design: se a troca de e-mail ou de telefone alterar requisitos de `autenticacao-email-senha` ou `autenticacao-por-telefone`, eles entram aqui. -->

## Impact

- **Código:** `lib/auth.ts` (`changeEmail`, `deleteUser` e afins), actions, services e schemas da conta, tela `/minha-conta` e seus formulários (uiux), templates de e-mail (confirmação do novo e-mail, aviso ao antigo, aviso de senha alterada), `lib/routes.ts` (`ACCOUNT`).
- **Banco:** sem tabela nova prevista; a exclusão apaga em cascata as sessões e as contas vinculadas (conferir as FKs).
- **Dependências:** nenhuma.
- **Depende de:** 0002 (sessão, política de senha), 0003 (aviso de senha alterada) e 0005 (verificação de telefone).
- **Fora de escopo:** foto de perfil, lista e revogação de sessões (0007), histórico de eventos (0008).

## Perguntas em aberto (para o design)

- Exclusão imediata ou com prazo de carência para desfazer.
- Exigir reautenticação recente (sessão "fresca") para ações sensíveis, e por quanto tempo.
- Se trocar o e-mail encerra as outras sessões.

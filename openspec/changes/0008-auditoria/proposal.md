# Proposal

## Why

Hoje os eventos de segurança só passam pelo log do servidor, que não é consultável pelo usuário e não serve de histórico. Um registro de auditoria persistente dos eventos de autenticação permite ao usuário reconhecer acessos indevidos e dá base para investigar incidentes.

## What Changes

- Tabela de eventos de auditoria: tipo do evento, usuário, data, user agent e IP quando disponível, e metadados mínimos (sem senha, token, OTP, link ou e-mail/telefone sem máscara).
- Registro dos eventos: cadastro, e-mail verificado, login com sucesso e com falha (por método), logout, redefinição e troca de senha, troca de e-mail e de telefone, sessão revogada, conta excluída e limite de tentativas atingido.
- Seção "Atividade recente" em `/minha-conta`, com os eventos da própria conta em ordem cronológica e datas no fuso do usuário.
- Retenção definida: eventos mais antigos que o prazo são apagados.
- Falha ao gravar um evento não pode quebrar o fluxo de autenticação (registra no logger e segue).

## Capabilities

### New Capabilities
- `auditoria`: quais eventos de segurança são registrados, o que cada registro guarda (e o que nunca guarda), retenção e consulta pelo próprio usuário.

### Modified Capabilities
<!-- Nenhuma prevista: os fluxos passam a emitir eventos sem mudar seus requisitos. Confirmar no design. -->

## Impact

- **Código:** `services/audit` (gravação e consulta), ganchos nos fluxos (hooks do Better Auth e actions das changes 0002–0007), componente "Atividade recente" (uiux), formatação de datas.
- **Banco:** nova tabela `audit_event` com índices por usuário e data, e nova migração (dev-db).
- **Dependências:** nenhuma prevista.
- **Depende de:** 0002 a 0007 (eventos a registrar) e 0006 (tela da conta).
- **Fora de escopo:** painel de administração, exportação de logs, alertas em tempo real.

## Perguntas em aberto (para o design)

- Prazo de retenção (ex.: 90 dias) e como a limpeza roda localmente (tarefa agendada ou limpeza na escrita).
- Se tentativas de login em e-mail inexistente são registradas, e como, já que não há usuário associado.
- Se o usuário recebe e-mail de alerta em eventos críticos (novo dispositivo, senha trocada).

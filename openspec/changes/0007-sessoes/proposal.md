# Proposal

## Why

As sessões já são persistidas no servidor, mas o usuário não tem como ver onde está conectado nem encerrar um acesso que não reconhece (dispositivo perdido, computador compartilhado). Listar e revogar sessões dá controle ao usuário e limita o estrago de uma sessão comprometida.

## What Changes

- Seção "Sessões ativas" em `/minha-conta`: lista as sessões da conta com dispositivo/navegador (a partir do user agent), data de criação e último uso, destacando a sessão atual.
- Encerrar uma sessão específica, encerrar todas as outras e encerrar todas (inclusive a atual).
- Sessão revogada deixa de autenticar em até 5 minutos (janela do cookie cache, já definida na spec `sessao`).
- Exibição do IP com cuidado: como o sistema não confia em `X-Forwarded-For` (regra da fundação), o IP pode não estar disponível localmente; a lista não depende dele.

## Capabilities

### New Capabilities
<!-- Nenhuma: o comportamento pertence à capacidade `sessao`. -->

### Modified Capabilities
- `sessao`: o usuário pode listar as próprias sessões ativas e revogar uma, as outras ou todas.

## Impact

- **Código:** actions e services de sessões (`auth.api.listSessions`, `revokeSession`, `revokeOtherSessions`, `revokeSessions`), componente de lista na tela da conta (uiux), parser de user agent para exibição.
- **Banco:** usa a tabela `session` existente; sem migração prevista.
- **Dependências:** talvez um parser de user agent (ex.: `ua-parser-js`), a decidir no design.
- **Depende de:** 0006 (tela "Minha conta").
- **Fora de escopo:** alerta de novo dispositivo por e-mail (avaliar em 0008), localização por IP.

## Perguntas em aberto (para o design)

- Parser de user agent: dependência nova ou exibição simplificada sem dependência.
- Se encerrar a sessão atual leva direto para `/entrar`.
- Se a revogação deve valer na hora (desligando o cookie cache para essa checagem) ou aceitar a janela de 5 minutos.

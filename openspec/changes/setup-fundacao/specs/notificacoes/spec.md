# Spec Delta

## Purpose

Garante que o sistema consiga entregar mensagens transacionais (links e códigos de autenticação) por e-mail e SMS, com destinos de desenvolvimento que o desenvolvedor e os testes automatizados consigam observar.

## ADDED Requirements

### Requirement: Envio de e-mail transacional
O sistema SHALL enviar e-mails transacionais com assunto, corpo HTML e corpo em texto puro, em pt-BR, a partir de um remetente configurável.

#### Scenario: E-mail entregue no ambiente de desenvolvimento
- **WHEN** o sistema envia um e-mail transacional rodando em desenvolvimento
- **THEN** a mensagem aparece na caixa do Mailpit com destinatário, assunto, versão HTML e versão em texto puro

#### Scenario: Falha no servidor de e-mail
- **WHEN** o servidor SMTP está indisponível no momento do envio
- **THEN** o envio falha com um erro registrado no log do servidor, sem expor detalhes internos ao usuário final

### Requirement: Envio de SMS transacional
O sistema SHALL enviar mensagens SMS curtas para números no formato E.164. Em desenvolvimento, o SMS MUST ser escrito no console do servidor, com destinatário e conteúdo, sem chamar nenhum serviço externo.

#### Scenario: SMS em desenvolvimento
- **WHEN** o sistema envia um SMS rodando em desenvolvimento
- **THEN** o console do servidor mostra uma linha identificável como SMS, com o número de destino e o texto da mensagem

#### Scenario: Número fora do padrão E.164
- **WHEN** o sistema tenta enviar um SMS para um número fora do formato E.164
- **THEN** o envio é rejeitado com erro de validação e nada é enviado

### Requirement: Destino de entrega selecionado por configuração
A escolha da implementação de e-mail e de SMS SHALL ser feita por configuração de ambiente, sem mudança no código dos fluxos que enviam mensagens.

#### Scenario: Troca de implementação
- **WHEN** a variável de ambiente que seleciona o provedor de SMS aponta para o console
- **THEN** todos os fluxos que enviam SMS usam o console, sem alteração no código deles

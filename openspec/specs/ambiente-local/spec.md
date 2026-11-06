# ambiente-local Specification

## Purpose

Define como um desenvolvedor sobe, configura e testa o sistema na máquina local de forma reproduzível, incluindo a validação de configuração que impede o app de iniciar mal configurado.

## Requirements

### Requirement: Serviços locais sobem com um comando
O repositório SHALL fornecer uma configuração de contêineres que sobe, com um único comando, o banco MySQL de desenvolvimento, o banco MySQL de teste e o servidor de e-mail de desenvolvimento com interface web.

#### Scenario: Subida do ambiente
- **WHEN** o desenvolvedor executa o comando de subida dos serviços com o Docker em execução
- **THEN** os bancos de desenvolvimento e de teste aceitam conexões e a interface web do Mailpit fica acessível no navegador

### Requirement: Banco de teste isolado
Os testes automatizados MUST rodar contra um banco separado do banco de desenvolvimento, e a execução dos testes MUST NOT alterar dados do banco de desenvolvimento.

#### Scenario: Testes não tocam o banco de desenvolvimento
- **WHEN** a suíte de testes de integração é executada
- **THEN** apenas o banco de teste é migrado e modificado

### Requirement: Validação de configuração na inicialização
O sistema SHALL validar as variáveis de ambiente obrigatórias ao iniciar e MUST recusar a inicialização quando alguma estiver ausente ou inválida, informando quais variáveis estão com problema e sem imprimir valores secretos.

#### Scenario: Variável obrigatória ausente
- **WHEN** o app é iniciado sem o segredo de autenticação configurado
- **THEN** a inicialização falha com uma mensagem que nomeia a variável ausente

#### Scenario: Segredo curto demais
- **WHEN** o segredo de autenticação tem menos de 32 caracteres
- **THEN** a inicialização falha indicando que o segredo é inválido, sem exibir o valor

### Requirement: Migrações versionadas do banco
O schema do banco SHALL ser aplicado por migrações versionadas no repositório, e aplicar as migrações num banco vazio MUST produzir todas as tabelas necessárias para a autenticação.

#### Scenario: Banco vazio
- **WHEN** o desenvolvedor aplica as migrações num banco recém-criado
- **THEN** as tabelas de usuários, sessões, contas, verificações e rate limit passam a existir

### Requirement: Portão de qualidade único
O repositório SHALL fornecer um comando que executa, em sequência, a análise estática, os testes unitários, de integração e de contrato e as verificações de acessibilidade de componentes e páginas, falhando se qualquer etapa falhar. Um comando separado SHALL executar os testes de mutação e falhar com score abaixo de 80%.

#### Scenario: Tudo verde
- **WHEN** o desenvolvedor executa o portão de qualidade com o ambiente local no ar e o código sem problemas
- **THEN** todas as etapas rodam e o comando termina com código de saída 0

#### Scenario: Violação de acessibilidade
- **WHEN** uma página tem uma violação WCAG 2.2 AA detectável automaticamente (por exemplo, campo sem rótulo)
- **THEN** o portão de qualidade falha e aponta a página e a regra violada

#### Scenario: Mutação abaixo do mínimo
- **WHEN** o score de mutação do código em `lib/` e `services/` fica abaixo de 80%
- **THEN** o comando de mutação termina com falha e lista os mutantes sobreviventes

### Requirement: Página inicial em pt-BR
O app SHALL servir uma página inicial em pt-BR, com o atributo `lang="pt-BR"` no documento.

#### Scenario: Acesso à raiz
- **WHEN** o usuário acessa `/` com o app rodando localmente
- **THEN** a página carrega com status 200, texto em português e `<html lang="pt-BR">`

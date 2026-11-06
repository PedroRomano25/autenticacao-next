# Spec Delta

## Purpose

Define o ciclo de vida e os atributos das sessões de autenticação: onde ficam guardadas, quanto tempo duram, como são renovadas e como o cookie de sessão é protegido no navegador.

## ADDED Requirements

### Requirement: Sessões persistidas no servidor
O sistema SHALL guardar cada sessão no banco de dados e identificá-la no navegador por um token opaco. Além do token, o navegador MAY guardar uma cópia assinada da sessão (cache) válida por no máximo 5 minutos; fora dessa janela, o banco MUST ser a fonte da verdade.

#### Scenario: Sessão revogada no banco deixa de valer
- **WHEN** um registro de sessão é removido do banco
- **THEN** requisições seguintes com o cookie dessa sessão são tratadas como não autenticadas, em até 5 minutos (janela do cookie cache)

#### Scenario: Cookie adulterado
- **WHEN** uma requisição chega com um token de sessão inexistente ou com assinatura inválida
- **THEN** o sistema trata a requisição como não autenticada

### Requirement: Duração e renovação deslizante da sessão
Uma sessão SHALL expirar 30 dias após sua última renovação. Quando a sessão é usada e já passou 1 dia desde a última renovação, o sistema SHALL estender a expiração para 30 dias a partir do momento do uso.

#### Scenario: Sessão expirada
- **WHEN** uma sessão não é usada por mais de 30 dias
- **THEN** o sistema a trata como inválida e a requisição como não autenticada

#### Scenario: Renovação por uso
- **WHEN** uma sessão válida, renovada há mais de 1 dia, é usada numa requisição
- **THEN** a nova data de expiração passa a ser 30 dias após essa requisição

#### Scenario: Uso dentro de 1 dia não renova
- **WHEN** uma sessão renovada há menos de 1 dia é usada
- **THEN** a data de expiração não muda

### Requirement: Atributos do cookie de sessão
O cookie de sessão MUST ser emitido com `HttpOnly`, `Secure`, `SameSite=Lax` e `Path=/`.

#### Scenario: Cookie inacessível ao JavaScript
- **WHEN** o servidor emite o cookie de sessão
- **THEN** o cabeçalho `Set-Cookie` contém `HttpOnly`, `Secure`, `SameSite=Lax` e `Path=/`

### Requirement: Endpoint de consulta da sessão
O sistema SHALL expor um endpoint de autenticação que retorna a sessão atual e o usuário quando autenticado, e um resultado vazio quando não autenticado, sem erro 5xx.

#### Scenario: Sem sessão
- **WHEN** um cliente sem cookie de sessão consulta a sessão atual
- **THEN** o sistema responde com sucesso e indica ausência de sessão

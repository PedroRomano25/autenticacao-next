---
name: boas-praticas-servidor
description: Boas práticas de servidor do projeto (camadas actions/services/db, validação Zod, Drizzle/MySQL, Better Auth, segurança, ActionResult e catálogo de erros, logger, testes com MySQL real, migrações). Use ao escrever ou revisar Server Actions, services, lib/, db/ ou emails/.
---

# Boas práticas de servidor

> **Escopo:** código que roda no servidor: `actions/`, `services/`, `schemas/`, Route Handlers, `lib/` (auth, notificações, env, logger, erros), `db/` e `emails/`. Estrutura de pastas por tipo: ver [`boas-praticas-interface`, seção 1](../boas-praticas-interface/SKILL.md#1-estrutura). Seguem: `dev-next` e `dev-db` (seções 3 e 9). Cobra: `tech-lead`.
> **Parte de:** skill [`convencoes-de-codigo`](../convencoes-de-codigo/SKILL.md), que vale inteiro aqui.
> **Stack:** Next.js 16 (App Router, Server Actions), Better Auth, Drizzle ORM + `mysql2`, MySQL 8.4, Zod, Vitest.

---

## 1. Camadas

| Camada | Onde | Faz | Não faz |
|---|---|---|---|
| Rota | `app/**/page.tsx`, `layout.tsx` | lê parâmetros, chama `requireSession()` quando a página é protegida, compõe componentes da feature | regra de negócio, consulta ao banco |
| Server Action | `actions/<fluxo>.ts` | valida a entrada com Zod, chama o Better Auth (`auth.api.*`) ou um serviço, devolve `ActionResult` | montar SQL, formatar mensagem de UI |
| Serviço | `services/<fluxo>.ts` | orquestra o caso de uso, abre transação | conhecer `FormData` ou componentes |
| Acesso a dados | `db/` (schema e queries do dev-db) ou funções `find*`/`insert*` no serviço | consultas e gravações tipadas | regra de negócio |

Crie `services/<fluxo>.ts` só quando a action fizer mais que validar e chamar o Better Auth (ex.: transação em várias tabelas); senão, a action chama `auth.api` direto.

- Toda Server Action começa com `'use server'`; todo módulo só de servidor importa `server-only`.
- **Uma regra, um lugar:** política de senha, normalização de identificadores e constantes de expiração moram em `lib/` e são importadas pelos fluxos e pelos hooks do Better Auth.
- **NUNCA** devolva linha do banco ou objeto do Better Auth direto para o cliente: monte um objeto só com os campos que a tela usa (nunca hash, token ou campos técnicos).

## 2. Validação

- **SEMPRE** valide a entrada de toda Server Action e Route Handler com um schema Zod (`safeParse`) antes de qualquer outra coisa. O código interno confia em dados já validados.
- Schemas compartilhados entre formulário e action ficam em `schemas/<fluxo>.ts`. A validação do servidor é a que vale; a do cliente é só para feedback.
- Regras que precisam valer também em chamadas diretas a `/api/auth/*` (política de senha) ficam **também** em hooks `before` do Better Auth, importando o mesmo schema.
- Normalize antes de validar e comparar: e-mail com `trim()` + minúsculas; telefone em E.164.

## 3. Dados (Drizzle + MySQL)

- **SEMPRE** use o schema do `dev-db`. Precisa de tabela, coluna, índice ou restrição? Peça a ele; **NUNCA** altere `db/schema/` nem crie migração.
- O Drizzle usa `casing: "snake_case"`: código em camelCase, banco em snake_case.
- **SEMPRE** use `db.transaction` quando a operação mexer em mais de uma tabela ou em várias linhas que precisam mudar juntas (ex.: trocar e-mail e invalidar verificações pendentes).
- **NUNCA** faça consultas N+1: carregue relações de uma vez (`with`/`join`).
- **SEMPRE** use a API tipada do Drizzle. SQL bruto só com o template `sql\`...\`` parametrizado, **NUNCA** com texto concatenado (`sql.raw` com entrada do usuário é proibido).
- **NUNCA** rode operação destrutiva fora do `auth_test`; confirme antes o `DATABASE_URL`.

## 4. Better Auth

- A instância fica só em `lib/auth.ts`; o cliente só em `lib/auth-client.ts`. Nenhum outro arquivo cria instância.
- Plugins novos exigem: atualizar `lib/auth.ts`, pedir ao `dev-db` a regeneração do schema (`@better-auth/cli generate`) e uma migração nova.
- **Sessão no servidor:** `requireSession()` (em `lib/session.ts`) usa `auth.api.getSession({ headers: await headers() })` e redireciona para `ROUTES.SIGN_IN` se não houver sessão. Use-o em toda página, layout e action protegidos. O `proxy.ts` só faz checagem otimista de cookie e **nunca** é a única proteção.
- **NUNCA** leia ou escreva o cookie de sessão à mão; use as APIs do Better Auth (com o plugin `nextCookies()` nas actions).
- Configurações de segurança (rate limit, expirações, cookies, `trustedOrigins`) usam constantes nomeadas em `lib/constants/auth.ts`.

## 5. Segurança

- **Hash de senha:** o padrão do Better Auth (scrypt). **NUNCA** guarde, logue ou devolva senha, hash, token, OTP ou link de verificação.
- **Respostas indistinguíveis:** login, cadastro, magic link, reset e reenvio respondem com a mesma mensagem, o mesmo formato e um tempo semelhante para conta existente e inexistente.
- **Rate limit:** os limites ficam em constantes e valem para as rotas sensíveis (login, magic link, OTP, reset, reenvio). O identificador é normalizado antes de contar.
- **Redirecionamentos:** `callbackURL` e redirects só para caminhos internos de `ROUTES` ou origens em `trustedOrigins`; nada de open redirect.
- **Variáveis de ambiente:** lidas **só** via `lib/env.ts` (validadas no boot). Variável nova vai para o schema de `lib/env.ts` (dev-next) e para o `.env.example` (pedido ao `infra`). Segredos **NUNCA** vão para o git.
- **NUNCA** use `dangerouslySetInnerHTML` com dado do usuário. Templates de e-mail usam componentes do React Email, que escapam o conteúdo.

## 6. Erros

- Toda Server Action devolve um `ActionResult<T>`:

```ts
// lib/errors/action-result.ts
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; fieldErrors?: Record<string, string[]> };
```

- Os códigos ficam num catálogo único, `lib/errors/codes.ts` (`UPPER_SNAKE_CASE`, `as const`). A mensagem em pt-BR de cada código fica numa lookup table tipada (`satisfies Record<ErrorCode, string>`) em `lib/errors/messages.ts`.
- Erros do Better Auth (`APIError`) são traduzidos para o catálogo **num único ponto** (`lib/errors/from-auth-error.ts`), com a tabela `código do Better Auth → ErrorCode`. Códigos desconhecidos viram `UNEXPECTED`.
- **NUNCA** vaze detalhes internos: nada de stack trace, SQL, mensagem do driver ou caminho de arquivo na resposta. O detalhe vai só para o log.
- Erros inesperados são registrados no log com `code` e contexto e devolvidos como `UNEXPECTED`. **NUNCA** engula um erro com `catch` vazio.

## 7. Logs

- **SEMPRE** use `lib/logger.ts` (`logger.info|warn|error(event, fields)`), que escreve JSON de uma linha com `level`, `event`, `timestamp` e campos estruturados. É o único arquivo onde `console.*` é permitido (ESLint `no-console`). O `ConsoleSmsSender` escreve pelo logger.
- `event` é um nome fixo em `snake_case` (`email_send_failed`), nunca texto montado.
- **NUNCA** registre senha, hash, token, OTP, link de verificação, cookie ou segredo. E-mail e telefone só mascarados (`p***@gmail.com`, `+55******1234`) via `maskEmail`/`maskPhone` de `lib/logger.ts`.
- **Pode:** ids internos, `code` de erro, resultado, duração.
- Exceção de desenvolvimento: o `ConsoleSmsSender` mostra o texto do SMS (spec `notificacoes`), só com `SMS_PROVIDER=console`.

## 8. Testes (Vitest, MySQL real)

### TDD
- **SEMPRE** escreva o teste antes do código, a partir do cenário da spec (`WHEN`/`THEN`), e veja-o **falhar pelo motivo esperado** (não por erro de compilação ou configuração) antes de implementar.
- **SEMPRE** corrija defeito começando por um teste que o reproduz.

### O que testar
- **Regras puras** (`lib/`): testes unitários com os casos de borda (senha com exatamente 8 e 128 caracteres, cada classe de caractere faltando, e-mail com maiúsculas e espaços, telefone em formatos variados).
- **Server Actions e Better Auth:** testes de integração com **MySQL real** (`auth_test`), cobrindo caminho feliz, cada `code` de erro e as respostas indistinguíveis.
- **Tempo:** expirações de sessão, token e OTP com `vi.useFakeTimers()` / `vi.setSystemTime()`. **NUNCA** `sleep` real.
- **Transações:** para cada `db.transaction`, um teste prova que uma falha intermediária não deixa alteração parcial.
- **Ausência no log:** toda afirmação de que algo **não** aparece no log (ex.: `not.toContain(senha)`) vem acompanhada, no mesmo teste, de uma afirmação positiva sobre o **mesmo** log capturado (uma linha que a operação certamente escreveu). Sem isso, uma captura vazia passa em verde sem provar nada.
- **Nome dos testes:** todo teste que cobre um cenário cita a capability e o cenário: `it('[sessao] Sessão expirada', ...)`.

### Dublês
- Testes **unitários** podem usar dublês para isolar a regra.
- Testes de **integração** usam **sempre** MySQL real e Mailpit real. **NUNCA** banco em memória nem mock do Drizzle ou do Better Auth.

## 9. Migrações (dev-db)

- Toda mudança de schema gera migração com `drizzle-kit generate`. **SEMPRE** leia o SQL gerado antes de commitar: `DROP COLUMN`, `DROP TABLE`, `RENAME`, mudança de tipo e `NOT NULL` em coluna existente são destrutivas e tornam a tarefa de alto risco.
- Renomear no código sem mudar o banco: mapeie o nome da coluna no schema; nunca deixe o Drizzle gerar `DROP` + `ADD`.
- Projeto só local, sem dados de produção: mudança destrutiva direta é aceita **se** o `design.md` a declarar em "Migration Plan".
- **NUNCA** edite migração já commitada.

## 10. Simplicidade

- Implemente o que a tarefa pede, nada além. Nada do roadmap futuro (2FA, OAuth, papéis) antes da change dele.
- **NUNCA** crie interfaces, classes base ou wrappers genéricos com um único uso (exceção já decidida: `EmailSender`/`SmsSender`).

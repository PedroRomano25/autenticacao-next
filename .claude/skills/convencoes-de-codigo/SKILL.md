---
name: convencoes-de-codigo
description: Convenções de código obrigatórias do projeto (regras gerais, nomenclatura, constantes/SSOT, lookup tables, DRY, TypeScript, commits por tarefa, simplificação, depuração pela causa raiz, quando parar e formato do relatório). Use ao escrever, revisar ou simplificar qualquer código do projeto e ao orquestrar agentes.
---

# Convenções de código: regras comuns

> **Escopo:** obrigatórias para todo código TypeScript do projeto (`app/`, `components/`, `hooks/`, `actions/`, `services/`, `schemas/`, `types/`, `lib/`, `db/`, `emails/`, `tests/`, `a11y/`; estrutura por tipo descrita em [`boas-praticas-interface`, seção 1](../boas-praticas-interface/SKILL.md#1-estrutura)). As regras específicas ficam em skill [`boas-praticas-servidor`](../boas-praticas-servidor/SKILL.md) e skill [`boas-praticas-interface`](../boas-praticas-interface/SKILL.md), que partem deste documento.
> **Dono:** agente `tech-lead`. Os agentes que escrevem código seguem; o `tech-lead` cobra na revisão.
> **Precedência:** as specs e o `design.md` da change ativa (`openspec/changes/<change>/`) e as specs principais (`openspec/specs/`) prevalecem sobre este documento. Se uma regra daqui impedir a tarefa, **PARE**: o agente reporta `BLOQUEADO` com a pergunta.

---

## 1. Regras gerais

- **SEMPRE** leia os arquivos existentes da área antes de criar algo novo. Reutilize antes de criar.
- **NUNCA** invente tipos, nomes de campos, rotas ou estruturas de dados. Se não existirem no código, no `design.md` ou na tarefa, PERGUNTE.
- **NUNCA** adicione dependências novas sem que estejam no `design.md` ou sem aprovação explícita.
- **NUNCA** refatore fora do escopo da tarefa. Melhorias identificadas vão para o fim do relatório, como sugestão.
- **SEMPRE** prefira a solução mais simples que atende o requisito (KISS / YAGNI).
- **NUNCA** deixe `console.*` fora de `lib/logger.ts`, código comentado ou TODO sem contexto.

---

## 2. Nomenclatura

Código em inglês; textos da interface e URLs em pt-BR.

| Estilo | Exemplo | Uso |
|---|---|---|
| **camelCase** | `expiresAt`, `sendVerificationEmail` | variáveis, funções, métodos, propriedades |
| **PascalCase** | `EmailSender`, `SignInForm` | tipos, interfaces, enums e componentes React |
| **UPPER_SNAKE_CASE** | `SESSION_MAX_AGE_SECONDS`, `INVALID_CREDENTIALS` | constantes de valor fixo, variáveis de ambiente e códigos de erro |
| **kebab-case** | `sign-in-form.tsx`, `smtp-email-sender.ts`, `/recuperar-senha` | arquivos, pastas e URLs |
| **snake_case** | `email_verified`, `user_id` | só no banco: tabelas e colunas (mapeadas pelo Drizzle com `casing: "snake_case"`) |

- **Booleanos:** prefixos `is`, `has`, `can`, `should` (`isVerified`, `hasPassword`).
- **Funções:** começam por verbo (`createSession`, `normalizePhone`).
- **Siglas** seguem o estilo do nome: `userId`, `SmtpEmailSender`, `parseUrl` (nunca `userID`, `SMTPEmailSender`).
- **NUNCA** abrevie sem necessidade. Exceções consagradas: `id`, `url`, `otp`, `env`, `db`.
- Na dúvida, copie a convenção de um arquivo parecido do projeto.

---

## 3. Constantes e fonte única de verdade

### Sem valores mágicos
- **NUNCA** use *magic numbers* ou *magic strings*: literal com significado vira constante com nome (`OTP_LENGTH`, não `6`).
- Dispensam constante: `0`, `1`, `-1`, `''` e índices de array.
- Constante que vem de uma decisão da spec cita a origem: `// spec sessao: Duração e renovação deslizante`.
- O ESLint aplica `no-magic-numbers` (config do `infra`), sem valer para arquivos de teste.

### Cada valor em um lugar só
- **SEMPRE** defina cada valor uma vez e importe-o onde for usado.
- Constante usada por um único arquivo fica no topo dele. Usada por mais de um, vai para `lib/constants/<assunto>.ts` (ex.: `lib/constants/auth.ts`).
- Use `as const` para manter os valores literais.

### Rotas centralizadas
- **SEMPRE** escreva as rotas das telas no mapa `ROUTES` em `lib/routes.ts`, com *route builders* para rotas com parâmetro. **NUNCA** escreva caminho de tela solto em componente ou action.

```ts
// lib/routes.ts
export const ROUTES = {
  HOME: '/',
  SIGN_IN: '/entrar',
  SIGN_UP: '/cadastro',
  PASSWORD_RESET: '/recuperar-senha',
  ACCOUNT: '/minha-conta',
} as const;
```

- Os endpoints do Better Auth ficam sob `/api/auth/*` e são chamados só pelo `authClient` ou por `auth.api`, nunca por URL escrita à mão.

---

## 4. Lookup tables no lugar de `if`/`switch`

Quando uma cadeia de `if`/`switch` só mapeia um valor para outro, use um objeto chave → valor.

❌ Evite:
```ts
if (code === 'INVALID_CREDENTIALS') return 'E-mail ou senha incorretos.';
if (code === 'EMAIL_NOT_VERIFIED') return 'Confirme seu e-mail para entrar.';
return 'Não foi possível concluir. Tente novamente.';
```

✅ Prefira:
```ts
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  EMAIL_NOT_VERIFIED: 'Confirme seu e-mail para entrar.',
  UNEXPECTED: 'Não foi possível concluir. Tente novamente.',
} as const satisfies Record<ErrorCode, string>;
```

- **SEMPRE** tipe a tabela com `satisfies Record<Chave, Valor>`: chave nova no tipo sem entrada na tabela não compila.
- Valores que são funções formam uma *dispatch table*. Use para casos curtos e independentes (ex.: a factory de `EmailSender`/`SmsSender` por provedor).
- **Chave vinda de fora** (entrada do usuário, resposta de biblioteca): confira com `Object.hasOwn(TABELA, chave)` ou use `Map`. **NUNCA** use `as` para forçar a chave (seção 6):

```ts
function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(ERROR_MESSAGES, value);
}
```

- **Valor padrão:** prefira `??` a `||`.
- **Não use** lookup table quando a decisão combina várias condições ou faixas de valor: aí o `if` é mais claro.

---

## 5. DRY: sem repetição, sem abstração precipitada

- **SEMPRE** aplique a *Rule of Three*: mesma lógica em 3 lugares → extraia. Em 2 → mantenha duplicado.
- **NUNCA** crie abstração "para o futuro" (parâmetros, generics ou configurações que nenhum caso atual usa). Exceção já decidida: as interfaces `EmailSender`/`SmsSender` (design da `setup-fundacao`, D4).
- **NUNCA** abstraia duas coisas só porque *parecem* iguais. Se mudam por motivos diferentes, mantenha separadas.
- Cada regra de autenticação (política de senha, normalização de e-mail/telefone, tempo de expiração) mora em um único lugar e é importada.

---

## 6. TypeScript

- **NUNCA** use `any`. Use `unknown` + narrowing.
- **NUNCA** use `as` para silenciar erro de tipo; corrija na origem. (`as const` é permitido.)
- **NUNCA** use `@ts-ignore`. Se inevitável, `@ts-expect-error` com justificativa.
- **NUNCA** desative o ESLint para arquivo ou bloco. Se inevitável, uma linha só: `// eslint-disable-next-line <regra> -- <motivo>`.
- **SEMPRE** derive tipos em vez de duplicar (`Pick`, `Omit`, `ReturnType`, `typeof`, `z.infer`). Tipos de tabelas vêm de `$inferSelect`/`$inferInsert` do Drizzle; tipos de sessão vêm de `typeof auth.$Infer.Session`.
- **SEMPRE** `strict: true` no `tsconfig`.
- **SEMPRE** trate dados de fora do processo (formulário, query string, variável de ambiente, resposta de biblioteca externa) como não confiáveis e valide-os com Zod em um único ponto da fronteira.

---

## 7. Commits na branch da change

- Cada change tem sua branch `change/<nome-da-change>`, criada pela sessão principal a partir da `main`.
- **SEMPRE** commite cada tarefa ao concluí-la, com os testes da tarefa verdes e lint/tipos passando nos arquivos tocados. Um commit nunca mistura tarefas de agentes diferentes.
- **SEMPRE** commite por caminho, só os arquivos da sua tarefa:

```sh
git add -- <arquivos novos da tarefa>
git commit -F - -- <todos os arquivos da tarefa> <<'MSG'
wip(<change>): tarefa X.Y [agente] <resumo no imperativo>
MSG
```

- **NUNCA** use `git add -A`, `git add .`, `git commit -a` ou commit sem caminhos. Se o git acusar `index.lock`, espere e tente de novo; **NUNCA** apague o lock.
- **NUNCA** use `--amend`, `rebase`, `reset`, `stash`, nem `checkout`/`restore` em arquivo de outro agente. Para corrigir um commit seu, faça outro commit.
- **NUNCA** commite arquivo de outro agente. Arquivos compartilhados:
  - `package.json` e `package-lock.json`: no commit da tarefa de quem instalou. Não instale com outro agente trabalhando em paralelo: peça à sessão principal para serializar.
  - `openspec/changes/<change>/tasks.md`: só a sessão principal marca e commita, a partir dos relatórios.
- **Mensagens:**

| Situação | Mensagem |
|---|---|
| Tarefa concluída (ou parte, com testes verdes) | `wip(<change>): tarefa X.Y [agente] <resumo>` |
| Passada de simplificação (`/simplify`) | `wip(<change>): simplificação` |
| Corte de contexto com teste vermelho (única exceção) | `wip(<change>)!: vermelho tarefa X.Y [agente] <o que falta>` |
| Correção de achado de revisão | `wip(<change>): corrige <achado> [agente]` |
| Marcação do `tasks.md` (sessão principal) | `wip(<change>): marca tarefas X.Y, X.Z` |

- O próximo agente do mesmo dono começa pelo commit vermelho e só commita outra coisa depois de deixá-lo verde.
- **NUNCA** use `--no-verify` nem faça push. O merge na `main` é feito pelo usuário, após a revisão final.
- **NUNCA** commite segredo, `.env.local` ou artefatos (`coverage/`, `reports/`, `test-results/`, `.stryker-tmp/`, `.next/`). Segredo commitado é achado crítico.
- **NUNCA** edite uma migração já commitada; crie outra.
- Registre no relatório o SHA e a mensagem de cada commit (campo `COMMITS`).

---

## 8. Simplificação (`/simplify`)

Feita pela sessão principal, uma vez por change, depois que `npm run qa` passa (passo 7 do [`CLAUDE.md`](../../../CLAUDE.md)). Commit próprio: `wip(<change>): simplificação`.

- **Escopo:** só o código de produção que a change introduziu (`git diff main...HEAD`). Código anterior vira sugestão no relatório. Antes de tirar algo, entenda por que existe; se não souber, não mexa. **Nunca** em migrações nem em `db/schema/auth.ts` (gerado).
- **O que procurar:** aninhamento profundo (troque por retorno antecipado), ternários encadeados, função com mais de uma responsabilidade, abstração sem uso, código morto, nome genérico (`data`, `item`, `handle`, `util`), repetição dentro da change (seção 5).
- **Invariantes:** o comportamento não muda; exports, tipos e props de `lib/` e `components/ui/` ficam iguais; **nenhum** arquivo de teste é alterado. Teste que falhou depois de uma simplificação desfaz **a simplificação**, nunca o teste.
- **NUNCA:** trocar `??` por `||`; tirar `return await` de dentro de `try`/`catch` ou de transação; juntar ramos de erro com códigos diferentes; mudar a ordem das validações (ex.: rate limit antes da checagem de credencial); alterar respostas que precisam ser idênticas para conta existente/inexistente; mudar a forma ou a quantidade de consultas ao banco; criar abstração sem três usos; adicionar dependência.
- **Como:** uma simplificação por vez, com os testes afetados rodando depois de cada uma. No fim, `npm run qa`; se tocou `lib/`, `npm run qa:mutation` com score ≥ 80% e nenhum mutante sobrevivente nas linhas simplificadas, ou desfaça.
- **Limite:** cerca de 50 linhas alteradas. Passou disso, registre o restante como sugestão.

---

## 9. Depuração pela causa raiz e prova do defeito

Vale para todo agente que escreve código ou testes.

- **Pare a linha:** quando teste, build, lint, tipos ou portão quebram, a tarefa para até a quebra ser entendida. Não empilhe código sobre vermelho.
- **Passos:**
  1. **Reproduzir:** o comando exato que falha, de forma determinística. Em falha intermitente, fixe tempo (`vi.useFakeTimers()`), fuso (`TZ`) e dados antes de concluir algo.
  2. **Isolar:** camada, arquivo e commit em que o comportamento muda (compare com o último commit verde via `git diff`, sem trocar de commit na árvore).
  3. **Reduzir:** o menor caso que ainda falha. Ele vira o teste.
  4. **Corrigir a causa, não o sintoma:** sem `catch` que engole erro, sem retentativa, sem aumentar timeout, sem `sleep`, sem condição especial para o caso do teste.
  5. **Proteger com teste:** o caso reduzido fica na suíte.
  6. **Verificar:** a suíte completa e o cenário original.
- **NUNCA** altere um teste para fazê-lo passar. O teste só muda quando contradiz a spec, e o relatório cita o cenário que justifica. Afrouxar asserção, aumentar timeout ou desativar teste é proibido.
- **Sem causa ou sem correção dentro da tarefa:** devolva `BLOQUEADO` com o comando que reproduz, as hipóteses testadas e o que cada uma descartou.
- **Prova do defeito:** todo defeito (do `qa`, do `security`, do `tech-lead` ou achado durante a tarefa) ganha **primeiro** um teste que falha e o reproduz, no nível mais baixo possível; só depois a correção. A falha observada antes da correção entra no relatório.

---

## 10. Quando parar no `/opsx:apply`

Parar é devolver o relatório à sessão principal, que leva a pendência ao usuário.

- **Devolva `BLOQUEADO` e não siga** quando:
  - um teste não passa e a correção não é óbvia depois da depuração (seção 9);
  - a spec ou o `design.md` são ambíguos, ou a tarefa exige uma decisão que nenhum artefato cobre;
  - a tarefa pede ação irreversível que ela não descreve por inteiro: migração destrutiva, apagar volume do Docker, troca ou exposição de segredo.
- **Tarefa de alto risco:** a que toca sessão e cookies, rate limit, geração/validação de tokens, magic links e OTPs, política e hash de senha, migração destrutiva ou segredos. É marcada com `· alto risco` no `tasks.md`; se você perceber o risco numa tarefa sem a marca, trate-a como marcada e avise no relatório. Faça-a **sozinha**, commite e devolva o relatório **sem começar a próxima** (`PARADA: alto risco X.Y`). A sessão principal chama o `security` para pré-revisar a tarefa; os achados voltam a você antes da próxima.

---

## 11. Relatório final de todo agente

Campos, nesta ordem: `STATUS` (`CONCLUÍDO`, `BLOQUEADO` ou `PARADA: alto risco X.Y`), `TAREFAS`, `ARQUIVOS`, `COMMITS` (SHA + mensagem), `VERIFICAÇÃO` (comandos e resultados), `TDD` (teste que falhou antes da implementação ou da correção), `PENDÊNCIAS` (para outros agentes), `SUGESTÕES` (fora do escopo).

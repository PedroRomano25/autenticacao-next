# Sistema de autenticação Next.js

Projeto de estudo/portfólio: autenticação com Next.js 16 (App Router, Server Actions), Better Auth, Drizzle ORM, MySQL 8.4 e Docker, rodando apenas localmente. Interface, URLs e artefatos OpenSpec em pt-BR; código em inglês. Planejamento em `openspec/` (uma change por capacidade).

## Convenções de código

As convenções moram em skills do projeto (fonte única) e são pré-carregadas em cada agente pelo campo `skills:` do frontmatter:
- `convencoes-de-codigo` (`.claude/skills/convencoes-de-codigo/SKILL.md`): regras comuns, commits, simplificação, depuração, paradas e formato do relatório. Todos os agentes.
- `boas-praticas-servidor` (`.claude/skills/boas-praticas-servidor/SKILL.md`): Server Actions, Better Auth, Drizzle, erros, logs, segurança, testes. dev-next, dev-db, qa, security, tech-lead.
- `boas-praticas-interface` (`.claude/skills/boas-praticas-interface/SKILL.md`): estrutura por tipo, componentes, estado, acessibilidade, tokens, datas. dev-next, uiux, qa, tech-lead.

A sessão principal recebe as convenções comuns por import (necessárias para branch, commits, marcação do `tasks.md`, `/simplify` e leitura dos relatórios):

@.claude/skills/convencoes-de-codigo/SKILL.md

## Fluxo agêntico

A sessão principal orquestra; os agentes em `.claude/agents/` executam. Subagentes não chamam outros subagentes.

| Agente | Papel | Escreve em |
|---|---|---|
| `tech-lead` | Revisa o planejamento e, no fim, a aderência às specs e às convenções (somente leitura); dono dos docs de convenções | — |
| `infra` | Docker, `.env.example`, dependências, tooling (ESLint, `tsconfig`, `knip`), `Makefile` | `docker/`, `docker-compose.yml`, `package.json`, `Makefile`, configs |
| `dev-db` | Schema Drizzle, migrações, schema do Better Auth | `db/`, `drizzle/` |
| `dev-next` | Lógica: rotas, Server Actions, Better Auth, erros, logger, e-mail/SMS | `app/`, `actions/`, `services/`, `schemas/`, `types/`, `lib/`, `emails/`, `proxy.ts`, hooks de fluxo, `components/**/*-container.tsx` |
| `uiux` | Componentes, telas, acessibilidade, textos, tokens de design | `components/` (Presentational), hooks visuais, marcação de `app/`, `app/globals.css` |
| `qa` | Testes estáticos, unitários, integração, contrato, mutação e acessibilidade (sem E2E de fluxo) | `tests/`, `a11y/` |
| `security` | Auditoria de abuso dos fluxos e pré-revisão de tarefas de alto risco (somente leitura) | — |

### Ordem por change
1. `/opsx:propose` cria os artefatos → `tech-lead` (Modo 1) revisa → ajustar até aprovar.
2. A sessão principal cria a branch `change/<nome>` a partir da `main`.
3. `/opsx:apply`: para cada grupo de `tasks.md`, acionar o responsável: `infra` → `dev-db` → `dev-next` e `uiux` (em paralelo só quando não houver dependência nem instalação de pacotes) → `qa`. Cada agente commita sua tarefa; a sessão principal marca o `tasks.md` a partir dos relatórios e commita (`wip(<change>): marca tarefas ...`).
4. Tarefa `· alto risco` (ou relatório com `PARADA: alto risco`): a sessão principal chama o `security` para pré-revisar só aquela tarefa; os achados voltam ao autor antes da próxima.
5. Relatório `BLOQUEADO`: levar a pergunta ao usuário; não decidir por ele.
6. Achados de `qa` voltam para o agente dono do código (com teste que reproduz primeiro); repetir até `npm run qa` passar.
7. Com os testes passando, a sessão principal roda `/simplify` seguindo a seção 8 das convenções (escopo, invariantes, limite de ~50 linhas, nenhum teste alterado) e commita `wip(<change>): simplificação`; o `qa` roda `npm run qa` de novo e depois `npm run qa:mutation` (≥ 80% em `lib/` e `services/`). Se algo quebrar, desfazer a simplificação.
8. `security` audita a change → correções pelos donos → `tech-lead` (Modo 2) dá o veredito.
9. Só com **APROVADO** do tech-lead e nenhum achado Crítico/Alto do security: `/opsx:archive`. O merge na `main` é do usuário; ninguém faz push.

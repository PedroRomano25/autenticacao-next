# Documentação

As convenções de código são skills do projeto (fonte única), pré-carregadas pelos agentes em `.claude/agents/`:

| Skill | Arquivo | Assunto |
|---|---|---|
| `convencoes-de-codigo` | [`.claude/skills/convencoes-de-codigo/SKILL.md`](../.claude/skills/convencoes-de-codigo/SKILL.md) | regras gerais, nomenclatura, constantes, lookup tables, DRY, TypeScript, commits, simplificação, depuração, paradas, relatório |
| `boas-praticas-servidor` | [`.claude/skills/boas-praticas-servidor/SKILL.md`](../.claude/skills/boas-praticas-servidor/SKILL.md) | camadas, validação, Drizzle/MySQL, Better Auth, segurança, erros, logs, testes, migrações |
| `boas-praticas-interface` | [`.claude/skills/boas-praticas-interface/SKILL.md`](../.claude/skills/boas-praticas-interface/SKILL.md) | estrutura por tipo, composição, estado, mobile first, estados de UI, acessibilidade, testes, performance, tokens, datas |

Para mudar uma regra, edite a skill (dono: agente `tech-lead`). O fluxo agêntico está no [`CLAUDE.md`](../CLAUDE.md); o planejamento, em [`openspec/`](../openspec/).

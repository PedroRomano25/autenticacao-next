---
name: boas-praticas-interface
description: Boas práticas de interface do projeto (estrutura por tipo e direção de importação, composição, Container/Presentational, estado, mobile first, estados de UI, acessibilidade WCAG 2.2 AA, testes de componente, performance, tokens de design, datas). Use ao escrever ou revisar componentes, hooks, páginas e estilos.
---

# Boas práticas de interface

> **Escopo:** componentes e telas: `components/`, `hooks/`, marcação de `app/**/page.tsx` e `layout.tsx`, `app/globals.css`. Seguem: `uiux` e, na parte cliente, `dev-next`. Cobra: `tech-lead`.
> **Parte de:** skill [`convencoes-de-codigo`](../convencoes-de-codigo/SKILL.md), que vale inteiro aqui.
> **Stack:** Next.js 16 (App Router, Server Components, Server Actions), React 19, Tailwind CSS v4, shadcn/ui, Zod, Vitest + Testing Library + `vitest-axe`, Playwright + axe (só varredura de páginas).

---

## 0. Regras gerais

- "Leia antes de criar": procure em `components/`, `components/ui/`, `hooks/` e `lib/` antes de criar componente, hook ou util.
- **NUNCA** use `<script>` inline, `dangerouslySetInnerHTML`, `eval` ou `new Function`, nem script de terceiros.

## 1. Estrutura

Organização **por tipo** (type-based): cada pasta guarda um tipo de arquivo; dentro dela, um arquivo por fluxo ou por componente.

```
app/                         # rotas finas: lêem params e compõem componentes
components/
  ui/                        # primitivos do shadcn/ui (uiux)
  auth/                      # componentes dos fluxos de autenticação (sign-in-form.tsx, password-field.tsx...)
  layout/                    # cabeçalho, rodapé, shell de página
  *-container.tsx            # Containers ficam junto do Presentational, com sufixo -container (dev-next)
hooks/                       # custom hooks (use-*.ts)
actions/                     # Server Actions, um arquivo por fluxo (sign-in.ts, sign-up.ts...)
services/                    # casos de uso do servidor, um arquivo por fluxo
schemas/                     # schemas Zod compartilhados entre formulário e action
types/                       # tipos compartilhados que não derivam de schema, tabela ou auth
lib/                         # infraestrutura compartilhada (auth, env, logger, errors, routes, constants, notifications, utils)
db/                          # cliente e schema Drizzle
emails/                      # templates React Email
```

- **Direção de importação** (uma camada só importa das de baixo):

| Camada | Pode importar |
|---|---|
| `app/` | `components/`, `actions/`, `lib/`, `schemas/`, `types/` |
| `components/` | `components/ui/`, `hooks/`, `actions/` (só referência à Server Action, em Container), `lib/` (utils de cliente, `routes`, `errors/messages`), `schemas/`, `types/` |
| `hooks/` | `lib/`, `schemas/`, `types/` |
| `actions/` | `services/`, `lib/`, `schemas/`, `types/` |
| `services/` | `db/`, `lib/`, `schemas/`, `types/` |
| `lib/`, `db/` | `lib/`, `types/` (nunca camadas acima) |
| `schemas/`, `types/` | só bibliotecas externas e `lib/constants/` |

- **NUNCA** importe `services/`, `db/` ou `lib/auth.ts` em `components/` ou `hooks/`; o cliente só fala com o servidor via Server Action ou `authClient`.
- Arquivos dentro da mesma pasta de tipo podem importar uns dos outros só quando forem genéricos (ex.: `components/auth/sign-in-form.tsx` usa `components/auth/password-field.tsx`). Um fluxo não importa a action ou o service de outro fluxo; o que for comum sobe para `lib/`.
- Rotas em `app/` ficam **finas**: sem lógica, sem marcação extensa.
- **Server x Client Components:** Server Component por padrão; `'use client'` só onde houver interação ou estado no navegador, o mais baixo possível na árvore (ex.: o formulário, não a página).

## 2. DRY

| O que se repete | Para onde extrair |
|---|---|
| Lógica com estado/efeitos | custom hook em `hooks/` |
| Função pura (formatação) | `lib/` |
| Marcação visual genérica | componente em `components/` (ou `components/ui/` se for primitivo shadcn) |

- **NUNCA** crie props, generics ou variações que nenhum caso atual usa.
- Regras de autenticação (política de senha, mensagens de erro) **não** são reescritas na interface: o schema Zod e o catálogo de mensagens vêm de `schemas/` e `lib/errors/`.

## 3. Composição

- **SEMPRE** prefira composição a props booleanas. **NUNCA** mais de ~3 props booleanas de variação visual; use composição ou uma prop `variant` (com `cva`, como o shadcn).
- Use os subcomponentes do shadcn (`Card`, `CardHeader`, `CardContent`, `CardFooter`) em vez de props de configuração.
- **SEMPRE** use `children` ou slots nomeados para conteúdo variável. **NUNCA** herança de componentes.

## 4. Responsabilidade única

- Um componente, uma responsabilidade.
- Separe **Container** (chama a Server Action com `useActionState`, lê `useRouter`/`useSearchParams`, decide o fluxo) de **Presentational** (recebe props, só renderiza). Presentational **NUNCA** chama action, `fetch`, `authClient` ou o router.
- Divida um componente quando passar de ~150 linhas, tiver mais de um `useEffect` com objetivos diferentes ou misturar dados com marcação extensa.
- **SOLID adaptado ao React:**
  - *Single Responsibility:* um componente renderiza, um hook guarda lógica de estado, um util formata.
  - *Open/Closed:* estenda por composição (`children`, slots, `variant`), não por `if` novo dentro do componente.

## 5. Estado

- **Formulários:** `useActionState` + Server Action, com `useFormStatus` para o estado pendente. **NUNCA** copie o resultado da action para outro `useState`; derive dele.
- Estado de UI local com `useState`; suba só quando outro componente precisar.
- **URL** (search params) para o que deve sobreviver a reload ou ser compartilhável (ex.: `?enviado=1` após pedir o magic link, `callbackURL`).
- **NUNCA** guarde em estado o que pode ser calculado de props ou de outro estado.
- Sessão no cliente só via `authClient.useSession()`, e apenas onde a tela precisa reagir a ela; páginas protegidas leem a sessão no servidor.

## 6. Mobile first

- Classes base para mobile; breakpoints (`sm:`, `md:`, `lg:`) para telas maiores. Nada de `max-md:` para "consertar" desktop-first.
- Área de toque de pelo menos 44×44 px nos elementos interativos.
- **NUNCA** largura fixa em px para containers; use `max-w-*` + `w-full`.
- Sem rolagem horizontal em 320 px de largura.

## 7. Estados de UI obrigatórios

Todo formulário trata:

| Estado | Obrigatório |
|---|---|
| Inicial | campos com rótulo, `autocomplete` correto, botão habilitado |
| Pendente | botão desabilitado + indicador; sem envio duplicado |
| Erro de campo | mensagem junto do campo (`aria-invalid` + `aria-describedby`) |
| Erro geral | mensagem genérica do catálogo (`role="alert"`), sem revelar se a conta existe |
| Sucesso | confirmação ou redirecionamento |

Componentes com dados assíncronos tratam também carregamento, vazio e erro. **NUNCA** renderize tela em branco ou `undefined` em algum estado.

## 8. Acessibilidade (WCAG 2.2 AA)

Verificada em três camadas pelo `qa`: `eslint-plugin-jsx-a11y` (estático), `vitest-axe` (componentes) e Playwright + axe (páginas).

- HTML semântico: `button` para ação, `a`/`Link` para navegação, `form` com `label`.
- **NUNCA** `div`/`span` com `onClick` como botão.
- Todo input com `label` associado (visível ou `sr-only`); `autocomplete` correto (`email`, `tel`, `current-password`, `new-password`, `one-time-code`).
- Botão só com ícone tem `aria-label` (ex.: mostrar/ocultar senha, com `aria-pressed`).
- Foco visível (`focus-visible:`) e navegação completa por teclado; ao exibir erro geral, mova o foco ou anuncie com `role="alert"`.
- **NUNCA** comunique informação só por cor (ex.: o checklist de senha usa ícone + texto, não só verde/vermelho).
- Um `h1` por página, `<main>` como landmark, `<title>` descritivo por rota (`metadata`).

## 9. TypeScript

- Props tipadas com `type` nomeado: `type SignInFormProps = { ... }`.
- Tipos de entrada vêm de `z.infer<typeof schema>`; tipos de sessão de `typeof auth.$Infer.Session`. **NUNCA** redigite à mão.
- O retorno das actions é `ActionResult<T>` (`lib/errors/action-result.ts`); a interface trata os dois ramos.

## 10. Testes (Vitest + Testing Library + `vitest-axe`)

### Quando usar TDD
- **SEMPRE** para: utils e funções puras, hooks com lógica, comportamentos descritos nos cenários da spec (ex.: checklist de senha, estado pendente), correção de bug.
- Componentes puramente visuais: o teste vem junto da implementação.

### Como testar
- Teste comportamento, não implementação: o que o usuário vê e faz.
- Busque por `getByRole` > `getByLabelText` > `getByText`; `getByTestId` só em último caso.
- **NUNCA** teste estado interno, classes CSS ou chamadas de hooks.
- **SEMPRE** `userEvent`, nunca `fireEvent`.
- Para Container, substitua a Server Action por uma função de teste que devolve `ActionResult` no formato exato (`{ ok: false, code: 'INVALID_CREDENTIALS' }`). **NUNCA** mocke o React ou o `useActionState`.
- Todo componente de formulário tem um teste `vitest-axe` em cada estado da seção 7.
- Rode os testes afetados antes de concluir a tarefa e reporte o resultado.

## 11. Performance

- **NUNCA** `useMemo`, `useCallback` ou `memo` por padrão; só com problema medido ou dependência referencial necessária. (O React Compiler, se habilitado, já cuida disso.)
- `next/dynamic` só para peças pesadas fora do conteúdo principal (ex.: um diálogo). **NUNCA** no conteúdo principal da rota.
- `key` estável e única em listas (ex.: id da sessão na lista de sessões); nunca o índice em listas que mudam.
- **NUNCA** defina componentes dentro de outros componentes.
- Fontes via `next/font` (seção 12.1); imagens via `next/image`.

## 12. Nomenclatura e estilo

- Componentes em `PascalCase`, arquivo em `kebab-case` (`SignInForm` em `sign-in-form.tsx`). Hooks `useCamelCase`. Handlers `handleX` no componente, `onX` nas props.
- Navegue e monte links só pelo `ROUTES` (`lib/routes.ts`).
- Lookup table para mapear `code` de erro → mensagem (`lib/errors/messages.ts`) e variantes → classes.
- `cn()` para classes condicionais.
- Textos da interface em pt-BR, curtos e neutros. Textos de erro só do catálogo.

### 12.1 Tokens de design (dono: `uiux`)

Os valores visuais são os tokens semânticos do shadcn/ui, definidos **uma vez** em `app/globals.css` (claro e escuro). O tema escuro é automático, sem botão de alternar: `@custom-variant dark (@media (prefers-color-scheme: dark));` para o variant `dark:` **e** os tokens escuros em `@media (prefers-color-scheme: dark) { :root { ... } }`. Nenhum seletor `.dark` no projeto; ao adicionar componente do shadcn, mova os tokens que ele injetar sob `.dark` para esse bloco.

- **NUNCA** escreva cor, raio, sombra, tamanho de texto ou peso soltos: nada de hexadecimal, `rgb()`, `oklch()` ou valor arbitrário (`bg-[#…]`, `rounded-[10px]`, `text-[15px]`) em classe, `style` ou CSS de componente.
- **SEMPRE** use utilitários semânticos: `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `text-muted-foreground`, `border-border`, `border-input`, `ring-ring`, `bg-destructive`, `text-destructive`, `bg-card`, `rounded-md`/`rounded-lg`/`rounded-full`.
- **NUNCA** use a paleta padrão do Tailwind (`red-500`, `gray-*`, `white`, `black`) em componente. Um papel novo (ex.: `success`) entra como token em `globals.css` pelo `uiux`, com o par claro/escuro e contraste AA conferido.
- **Espaçamento:** a escala padrão do Tailwind (`p-4`, `gap-6`). Nada de valor arbitrário.
- **Fontes:** uma família só (`font-sans`), carregada por `next/font` **apenas** em `app/layout.tsx` (e em `app/global-error.tsx`, se existir, porque ele renderiza o próprio `<html>`). **NUNCA** carregue fonte por `<link>` ou `@import` externo.
- **`cn()` e tokens novos:** classes condicionais só pelo `cn()` (`lib/utils.ts`, com `tailwind-merge`). Se o `uiux` criar um papel próprio de tipografia, raio, sombra ou largura (`text-<papel>`, `rounded-<papel>`…), ele é registrado no `extendTailwindMerge` do `cn` na mesma tarefa, com um teste provando que o papel convive com uma cor e substitui outro papel do mesmo grupo. Sem isso, o `tailwind-merge` pode remover a classe. **NUNCA** chame `twMerge` direto nem crie um segundo `cn`.
- **Efeitos:** visual sóbrio. **NUNCA** use `backdrop-filter`, `blur`, degradê (inclusive em texto) nem sombra colorida ou de halo; sombra só no que flutua (diálogo, popover).
- **Elementos fixos:** `fixed`/`sticky` encostado numa borda (ex.: toast) respeita a área segura do celular com `env(safe-area-inset-*)` dentro de uma variável CSS em `globals.css`, nunca direto na classe.
- **SVG e ícones:** cor por `currentColor` ou `var(--<token>)`, nunca hexadecimal.

## 13. Datas e horários

- Datas exibidas (ex.: "criada em" e "último acesso" na lista de sessões, data de um evento de auditoria) vêm do servidor como ISO 8601 e são formatadas pelo **utilitário único** `lib/format-date.ts` (`Intl.DateTimeFormat` em `pt-BR`, fuso `America/Sao_Paulo`). **NUNCA** formate data com `toLocaleString` solto nem monte texto de data à mão.
- **NUNCA** use o relógio do navegador (`Date.now()`, `new Date()` sem argumentos) para decidir algo exibido, como "expirado" ou "ativo agora": esse estado vem calculado do servidor. Uso sem efeito em regra (ex.: contagem regressiva do reenvio de código) é permitido com comentário justificando.
- **NUNCA** crie timer para detectar expiração de sessão ou virada do dia; a próxima requisição ao servidor resolve.

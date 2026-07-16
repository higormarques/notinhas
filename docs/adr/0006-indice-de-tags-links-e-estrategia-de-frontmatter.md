# 0006 — Índice de tags/links reaproveitando o índice de busca; frontmatter separado do editor

- **Status:** aceita
- **Data:** 2026-07-16

## Contexto

A Fase 7 precisa de duas coisas novas: (a) um índice navegável de `#tag`/`[[link]]` (painel de
tags, painel de backlinks) e (b) propriedades de frontmatter por nota (`criado`/`atualizado` +
chave-valor customizada), persistidas dentro do próprio arquivo markdown.

Para (a), havia dois caminhos: estender `shared/search/searchIndex.ts` (Fase 6 — já faz varredura
completa + manutenção incremental de conteúdo por nota via `IndexingStorageAdapter`) ou construir
um terceiro mecanismo de indexação paralelo. O `command-palette` já tem sua própria listagem
recursiva (`listNotesRecursively`, só path/nome, sem conteúdo) — um precedente de duplicação que
este ADR decide não repetir, já que tags/links precisam exatamente da mesma infraestrutura de
leitura de conteúdo por nota que o índice de busca já mantém.

Para (b), o editor é Tiptap (WYSIWYG) — frontmatter (`---\nchave: valor\n---`) não é algo que
faça sentido renderizar como conteúdo editável do documento, então era preciso decidir onde ele
vive em relação ao corpo editado pelo Tiptap.

## Decisão

**(a) Tags/links reaproveitam `searchIndex.ts`.** `SearchIndexEntry` ganhou `tags: string[]` e
`links: string[]`, computados a partir do corpo (frontmatter já removido) em `rebuildIndex` e
`upsertEntry` — os mesmos dois pontos que já liam o conteúdo completo de cada nota. `renameSubtree`
carrega `tags`/`links` inalterados via spread, sem re-leitura. Novas funções de consulta
(`listTagsWithCounts`, `notesForTag`, `buildTitleIndex`, `notesLinkingTo`) resolvem `[[link]]`
contra o título **atual** de cada nota a cada chamada, em vez de guardar um path resolvido no
momento da indexação.

**(b) Frontmatter é removido do conteúdo antes de entrar no editor Tiptap.** `useNoteEditor.ts`
parseia o frontmatter do arquivo bruto (`parseFrontmatter`) no watcher de `fileQuery.data`, envia
só o corpo (`body`) para `editor.commands.setContent`, e mantém o frontmatter parseado numa ref
local. No autosave (`flushAutosave`), o frontmatter é recomposto com o corpo atual
(`serializeNote`) antes de gravar — `atualizado` é sempre re-carimbado, `criado` só na primeira
vez que a nota é salva pelo notinhas (`stampTimestamps`). O painel de Propriedades
(`note-properties`) tem seu próprio ciclo independente de leitura/escrita sobre a mesma query key
(`['file', path]`), reconciliado com o editor via `invalidateQueries` — sem lock entre os dois.

**(c) Efeito colateral descoberto durante a implementação:** `editor.getMarkdown()` (extensão
oficial `@tiptap/markdown`) faz backslash-escape de colchetes (`[`/`]`) em texto plano, para não
ambiguar com sintaxe de link real numa releitura futura. Como o app não tem uma extensão de link
real registrada, um `[[Nota]]` digitado pelo usuário sairia serializado como `\[\[Nota\]\]` —
`unescapeDocLinkMarkdown` (`entities/DocLink.ts`) desfaz especificamente esse escape de colchete
duplo antes de gravar, para que a sintaxe de doclink sobreviva ao autosave como texto literal.

## Motivo

- Tags e links precisam do conteúdo completo de cada nota, exatamente como a busca full-text —
  reaproveitar a mesma varredura/manutenção incremental evita um terceiro mecanismo de scan do
  workspace e a divergência entre dois índices que deveriam concordar sobre o mesmo arquivo.
- Resolver `[[link]]` contra o título atual (em vez de guardar o path resolvido) evita ter que
  reindexar o conteúdo de quem linka toda vez que a nota-alvo é renomeada — só o mapa
  título→path muda, e ele já é reconstruído a cada consulta.
- Separar frontmatter do corpo do editor evita ter que ensinar o Tiptap a ignorar/renderizar um
  bloco YAML como se fosse conteúdo da nota — mais simples do que qualquer alternativa de
  Node/Mark customizado para isso.
- Reconciliar editor e painel de Propriedades via `invalidateQueries` (em vez de um lock/token de
  versão) segue a mesma filosofia já aceita na ADR 0004 (eventual consistency via refetch, não
  sincronização em tempo real) — apropriado para um app local-first de usuário único, onde editar
  a mesma nota simultaneamente em dois painéis é um caso raro, não o caminho principal.

## Consequências

- **Colisão de título**: duas notas com o mesmo título em pastas diferentes resolvem
  `[[link]]`/backlinks de forma ambígua — "o último indexado ganha" em `buildTitleIndex`. Não há
  suporte a links qualificados por caminho (`[[Pasta/Nota]]`) nesta fase.
- **Rename quebra links antigos**: renomear a nota-alvo de um `[[link]]` não reescreve o texto do
  link em quem aponta para ela — o link para o título antigo simplesmente para de resolver
  (vira um link "não-resolvido" visualmente) até o usuário atualizar o texto manualmente. Não há
  cascata de rename automática.
- **`criado` não é a data real de criação do arquivo**: File System Access API/OPFS não expõem
  essa metadata de forma confiável entre navegadores — `criado` reflete a primeira vez que o
  notinhas gravou frontmatter naquele arquivo, o que deve ficar claro na UI (rótulo/tooltip) para
  não virar uma expectativa equivocada do usuário.
- **Sem lock entre `useNoteEditor` e o painel de Propriedades**: editar o corpo (autosave, debounce
  de 300ms) e uma propriedade customizada no mesmo instante, para a mesma nota, pode perder uma
  das duas escritas. Aceito como limitação de escopo — revisitar só se virar um bug relatado de
  uso real, não construir preventivamente um mecanismo de lock/versionamento.
- Qualquer novo código que precise saber "quais tags/links uma nota tem" deve ler
  `SearchIndexEntry.tags`/`.links` em vez de re-parsear o arquivo — a extração já acontece uma
  única vez por escrita, em `searchIndex.ts`.

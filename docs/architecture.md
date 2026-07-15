# Arquitetura técnica — notinhas

Referência técnica profunda. Para as regras rígidas e o resumo do que é permitido/proibido,
veja `CLAUDE.md` primeiro — este documento detalha o _como_, aquele define o _o que não fazer_.

## Camada de storage

### Contrato `StorageAdapter`

```ts
interface StorageAdapter {
  listDirectory(path: string): Promise<DirectoryEntry[]>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  createDirectory(path: string): Promise<void>
  deleteFile(path: string): Promise<void>
  rename(fromPath: string, toPath: string): Promise<void>
}
```

`createDirectory` foi adicionado na Fase 2 para suportar "Nova pasta" na árvore de arquivos sem
o workaround de escrever um arquivo placeholder dentro dela (ver ADR 0005). `deleteFile` serve
tanto para arquivo quanto pasta (usa `removeEntry(name, { recursive: true })` por baixo) — não
existe `deleteDirectory` separado. `rename` também cobre mover (origem e destino podem estar em
diretórios diferentes); mover uma pasta é O(N) arquivos via cópia recursiva + delete, não é
atômico.

Vive em `src/shared/storage/StorageAdapter.ts` (chega na Fase 1). Duas implementações,
selecionadas por feature-detection no boot da aplicação (`'showDirectoryPicker' in window`):

- **`FileSystemAccessAdapter`** (`src/shared/storage/FileSystemAccessAdapter.ts`) —
  `showDirectoryPicker()` retorna um `FileSystemDirectoryHandle`; esse handle é persistido via
  IndexedDB (`idb-keyval`) para ser recuperado entre reloads sem novo prompt de seleção de pasta
  (ainda é necessário um re-prompt de _permissão_, já que o browser não persiste a permissão de
  escrita indefinidamente).
- **`OPFSAdapter`** (`src/shared/storage/OPFSAdapter.ts`) — fallback via
  `navigator.storage.getDirectory()` para navegadores sem File System Access API (Firefox,
  Safari). Os arquivos ficam restritos ao sandbox do navegador — um banner de UI deve deixar
  isso explícito ao usuário quando esse adapter for escolhido.

Nenhum outro código do app (features, stores, composables) deve tocar
`showDirectoryPicker`/`navigator.storage` diretamente — sempre através do `StorageAdapter`
injetado a partir de `shared/storage`.

### O que é fonte de verdade e o que é cache derivado

- **Fonte de verdade**: o conteúdo da nota vive exclusivamente nos arquivos, acessados via
  `StorageAdapter`.
- **Cache derivado (nunca fonte de verdade)**: árvore de pastas, metadados, índice de busca —
  tudo isso é reconstruível a partir dos arquivos e vive no cache do TanStack Query (e, quando
  necessário, espelhado em IndexedDB para persistência entre reloads).
- **Config global do app** (workspace ativo, tema, preferências) — um store IndexedDB pequeno,
  equivalente ao `.store.dat` do Octarine original.

## Convenção de query keys (TanStack Query)

| Key                   | Uso                                    |
| --------------------- | -------------------------------------- |
| `['directory', path]` | listagem de uma pasta                  |
| `['file', path]`      | conteúdo de um arquivo/nota            |
| `['daily', date]`     | nota diária de uma data (`YYYY-MM-DD`) |
| `['notes-index']`     | lista achatada e recursiva de todas as notas do workspace, usada pela paleta de comandos (Fase 3) para "ir para nota"/"nova nota" |

Toda mutation que escreve/renomeia/apaga invalida a(s) query key(s) afetada(s). Refetch
automático em foco/visibilidade da aba (`refetchOnWindowFocus`/`refetchOnReconnect` do Vue
Query) é o mecanismo que substitui a ausência de filesystem watch nativo — ver ADR 0004.

`['notes-index']` é uma solução provisória — percorre `listDirectory` recursivamente a partir da
raiz a cada abertura da paleta (`staleTime: 0`, habilitada só enquanto a paleta está aberta), sem
cache incremental. Isso é aceitável para o volume de notas esperado até aqui; a Fase 6 substitui
essa listagem por um índice real (título + conteúdo) atualizado incrementalmente a cada escrita.

## Pinia stores

| Store                                              | Responsabilidade única                                                                                                                                                                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useUiStore` (`shared/stores/ui.ts`)               | painéis abertos (esquerdo/direito) em breakpoints tablet/desktop. Já implementado na Fase 0.                                                                                                                                              |
| `useWorkspaceStore` (chega na Fase 1)              | workspace ativo (referência ao handle/adapter escolhido), estado de conexão/permissão.                                                                                                                                                    |
| `useNotesStore` (`shared/stores/notes.ts`, Fase 2) | nota ativa (`activeNotePath`) — compartilhada entre `file-tree` (abre/fecha) e `note-editor` (lê); nunca guarda conteúdo de arquivo, só o caminho.                                                                                        |
| `useThemeStore`/`useTheme` composable              | tema claro/escuro — hoje é um composable simples (`shared/composables/useTheme.ts`) com estado em módulo + persistência em `localStorage`; só vira store Pinia se precisar ser injetado em múltiplos contextos de teste de forma isolada. |

Nenhuma store guarda conteúdo de arquivo, resultado de busca ou árvore de diretórios — isso é
sempre responsabilidade do cache do TanStack Query.

## Componentes de UI (shadcn-vue)

- **Sempre adicionar via CLI**: `pnpm dlx shadcn-vue@latest add <componente>` (ver skill
  `octarine-ui-component`). Nunca escrever um primitivo de UI à mão — isso quebra a consistência
  de tokens de tema e o comportamento de acessibilidade/teclado que o gerador já traz.
- Aliases configurados em `components.json`: `ui`/`components` → `@/shared/ui`,
  `lib`/`utils` → `@/shared/lib`, `composables` → `@/shared/composables` (desviado do padrão
  `@/components/ui` do shadcn-vue para caber na estrutura de pastas deste projeto).
  `src/shared/ui/**` está fora do escopo do ESLint e do Prettier (código gerado).
- Tema claro/escuro via classe `.dark` na raiz do documento (CSS variables em `src/style.css`,
  geradas pelo `shadcn-vue init`), alternado por `useTheme()`.

## Teclado e responsividade (implementação de referência)

- `useBreakpoint()` (`shared/composables/useBreakpoint.ts`) — `matchMedia` reativo, breakpoints
  em 768px (tablet) e 1280px (desktop), alinhados aos viewports de teste
  (375/768/1280 em `playwright.config.ts`).
- `AppShell.vue` + `useAppShell.ts` (`src/app/`) é a referência de como a view+composable
  colocado deve se comportar por breakpoint: desktop usa `ResizablePanelGroup` (3 painéis),
  tablet usa painéis colapsáveis in-place (`isLeftPanelOpen`/`isRightPanelOpen` no
  `useUiStore`), mobile usa `Sheet` como overlay disparado por botão.
- Roving tabindex na árvore de arquivos (`src/features/file-tree/useFileTree.ts`, Fase 2):
  `role="tree"`/`role="treeitem"` com árvore renderizada em lista achatada (sem componente
  recursivo — cada linha carrega sua própria profundidade), só um item com `tabindex="0"` por
  vez, navegação com setas/Enter/F2/Delete tratada em `handleTreeKeydown`.
- `useShortcuts` (`shared/composables/useShortcuts.ts`, Fase 3) — registro **global** de
  atalhos, fora do escopo de uma única árvore/feature: `register`/`unregister` mantêm um mapa
  reativo (`id → { keys, description, handler }`) consultável futuramente pela tela de Settings
  (Fase 8); um único listener de `keydown` em `window` é anexado lazily no primeiro `register`.
  `trigger(id)` executa o handler de um atalho já registrado, usado por botões de UI que
  replicam a mesma ação do atalho (ex.: o botão de busca do header aciona o mesmo handler que
  Cmd/Ctrl+K). Segue o mesmo padrão de composable simples com estado em módulo já usado por
  `useTheme` — só vira store Pinia se precisar ser injetado em múltiplos contextos de teste de
  forma isolada.
- `command-palette` (`src/features/command-palette/`, Fase 3) — paleta Cmd/Ctrl+K via
  `CommandDialog` do shadcn-vue: "Nova nota" (aparece só quando o texto digitado não corresponde
  a nenhuma nota existente, cria sempre na raiz do workspace), "Ir para nota" (busca sobre
  `['notes-index']`, filtragem via `contains` embutido do componente `Command`), "Alternar
  tema". O texto digitado é capturado via delegação do evento nativo `input` (bubbling do
  `<input>` interno do `CommandInput`) em vez de um `v-model` direto, para não depender de
  comportamento de merge de listeners do Reka UI.
- `note-editor` (`src/features/note-editor/`, Fase 4) — editor WYSIWYG via Tiptap v3
  (`@tiptap/vue-3` + `@tiptap/starter-kit`), substituindo a textarea da Fase 2:
  - **Markdown como fonte de verdade**: a extensão oficial `@tiptap/markdown` (não o pacote
    comunitário `tiptap-markdown`, descontinuado a favor da oficial desde o Tiptap 3.7.0) provê
    `editor.getMarkdown()` e `setContent(md, { contentType: 'markdown' })`. Headings, listas
    (incluindo task lists) e tabelas fazem o round-trip nativamente porque `@tiptap/extension-list`
    e `@tiptap/extension-table` já declaram `parseMarkdown`/`renderMarkdown` nos próprios nodes;
    `CodeBlockLowlight` herda o suporte a markdown do `CodeBlock` base via `.extend()`.
  - **Extensões registradas**: StarterKit (com `codeBlock: false` e `heading: { levels: [1,2,3] }`),
    `CodeBlockLowlight` (lowlight + bundle `common`), `TaskList`/`TaskItem` de
    `@tiptap/extension-list`, `TableKit` de `@tiptap/extension-table` (`resizable: false`),
    `Markdown`, e a extensão própria `FindInNote`.
  - **Busca dentro da nota** (`findInNoteExtension.ts`) é escrita à mão: o único pacote de
    search/replace para Tiptap é `@sereneinserenade/tiptap-search-and-replace`, que é licença
    proprietária e alvo do Tiptap v2 — incompatível com o v3 usado aqui. A extensão própria usa um
    `Plugin` do ProseMirror com `Decoration.inline` para destacar ocorrências e comandos
    `setSearchTerm`/`goToSearchResult`/`clearSearchTerm` armazenados em `editor.storage.findInNote`.
  - **Reatividade da toolbar**: `useEditor()` do `@tiptap/vue-3` (v3) não força reatividade
    automática do Vue a cada transação da doc (diferente do comportamento assumido na v2). Os
    estados ativos da toolbar (negrito/heading/lista ativa, `canUndo`/`canRedo`, contagem de
    resultados de busca) são `computed` que leem um `updateTick` incrementado no callback
    `onTransaction` do editor — sem isso os botões da toolbar não atualizariam o estado
    pressionado/ativo ao mover o cursor ou editar.
  - **Autosave** segue o mesmo padrão da Fase 2 (`watchDebounced` + `lastSavedContent`), só que a
    fonte do `content` ref agora é `editor.getMarkdown()` chamado em `onUpdate`; trocar de nota
    chama `setContent(data, { contentType: 'markdown', emitUpdate: false })` para não disparar
    autosave espúrio ao carregar.

## Testes

- Unitário (Vitest + @vue/test-utils): co-localizado com o composable/store que testa
  (`useTheme.test.ts` ao lado de `useTheme.ts`). `vitest.setup.ts` mocka `window.matchMedia`
  (jsdom não implementa).
- E2E (Playwright): `e2e/*.spec.ts`, 3 projects (`mobile`/`tablet`/`desktop`) com os viewports
  fixos do plano. Todo teste de fluxo de teclado usa só `page.keyboard.press`, nunca `.click()`.
  `@axe-core/playwright` roda em toda página nova para checar violações críticas de
  acessibilidade.

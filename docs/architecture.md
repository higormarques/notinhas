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

`createStorageAdapter.ts` sempre envolve a implementação concreta (File System Access ou OPFS)
com `IndexingStorageAdapter` (`src/shared/storage/IndexingStorageAdapter.ts`, Fase 6) antes de
atribuí-la a `activeAdapter` — um decorator que mantém `shared/search/searchIndex.ts` sincronizado
a cada `writeFile`/`deleteFile`/`rename`. Ver seção "Índice de busca" abaixo.

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
| `['directory', path]` | listagem de uma pasta (inclui `['directory', 'Daily']`, usada pelo Daily Desk — Fase 5) |
| `['file', path]`      | conteúdo de um arquivo/nota (inclui notas diárias, via `dailyNotePath(date)` — Fase 5) |
| `['notes-index']`     | lista achatada e recursiva de todas as notas do workspace, usada pela paleta de comandos (Fase 3) para "ir para nota"/"nova nota" |

Toda mutation que escreve/renomeia/apaga invalida a(s) query key(s) afetada(s). Refetch
automático em foco/visibilidade da aba (`refetchOnWindowFocus`/`refetchOnReconnect` do Vue
Query) é o mecanismo que substitui a ausência de filesystem watch nativo — ver ADR 0004.

`['notes-index']` segue sendo uma solução provisória — percorre `listDirectory` recursivamente a
partir da raiz a cada abertura da paleta (`staleTime: 0`, habilitada só enquanto a paleta está
aberta), sem cache incremental nem conteúdo dos arquivos (só path/nome, o suficiente para "ir
para nota"/"nova nota"). A Fase 6 **não** substituiu essa listagem — criou um índice separado
(`shared/search/searchIndex.ts`, fora do TanStack Query, ver seção "Índice de busca" abaixo) só
para a busca full-text, que precisa do conteúdo de cada nota e de atualização incremental
persistida. São dois mecanismos com necessidades diferentes o suficiente para não valer a pena
unificar agora.

A chave `['daily', date]` cogitada antes da Fase 5 não foi implementada como chave separada: uma
nota diária é só um arquivo em `Daily/YYYY-MM-DD.md`, então reaproveitar `['file', path]` (via
`dailyNotePath(date)`) e `['directory', 'Daily']` (para saber quais dias têm nota) evita duplicar
o mesmo dado sob duas chaves diferentes.

## Índice de busca (Fase 6)

Fora do TanStack Query de propósito: precisa persistir entre reloads (`idb-keyval`, mesmo padrão
do handle do workspace) e ser atualizado por um único ponto central (`IndexingStorageAdapter`,
ver "Camada de storage" acima) em vez de por invalidação de query key espalhada por feature.

- `src/shared/search/searchIndex.ts` — `Map<path, {title, content}>` reativo (estado em módulo,
  mesmo padrão de `useShortcuts`/`useTheme`) espelhado no IndexedDB (chave
  `notinhas:search-index`). `ensureIndexReady(adapter)` hidrata do IndexedDB uma vez por sessão
  e, se não houver nada utilizável, faz `rebuildIndex` (varredura recursiva completa via
  `listDirectory`+`readFile`) — chamado só quando a busca é aberta pela primeira vez numa sessão,
  não no boot do workspace, para não gastar tempo varrendo o disco se o usuário nunca abrir a
  busca.
- Depois da primeira varredura, o índice nunca mais precisa de outra varredura completa:
  `IndexingStorageAdapter.writeFile` chama `upsertEntry` (recebe o conteúdo direto, sem reler),
  `deleteFile` chama `removeSubtree` (remove por prefixo de caminho — cobre arquivo único ou
  pasta inteira, já que `StorageAdapter.deleteFile` também cobre os dois casos), e `rename` chama
  `renameSubtree` (remapeia as entradas já indexadas por prefixo, sem reler conteúdo — não muda
  numa renomeação/movimentação).
- `search(query)` é substring case-insensitive sobre título+conteúdo, síncrono (não é uma query
  assíncrona — o índice já está todo em memória). Resultados com match no título vêm antes dos
  que só batem no conteúdo; o snippet é recortado ao redor da primeira ocorrência no conteúdo.
- `forgetPersistedWorkspace` chama `resetSearchIndex` (memória + apaga a chave do IndexedDB) —
  sem isso, trocar de workspace faria `ensureIndexReady` hidratar dados do workspace anterior.
- A pasta `Daily/` (escondida da árvore de arquivos, Fase 5) **é** indexada normalmente — só a
  visibilidade na árvore é filtrada, a busca cobre notas diárias como qualquer outra nota.

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
  - **Autosave com debounce de 300ms via `setTimeout` manual, não `watchDebounced` do VueUse**:
    a versão original (Fase 2/4) usava `watchDebounced(content, ...)`, observando o ref `content`
    e lendo `activeNotePath.value` só na hora em que o callback debounced disparava. Isso tinha
    um bug real: se o usuário trocasse de nota antes do debounce dos 300ms disparar, o callback
    rodava com o **path novo** (já trocado) mas o **conteúdo antigo** (editado na nota anterior),
    gravando a edição de uma nota no arquivo de outra — ou, dependendo de quão rápido a nota nova
    carregava, achatava o timer pendente sem nunca salvar a edição original. `scheduleAutosave`/
    `flushAutosave` capturam `path` e `value` como parâmetros no momento da edição (dentro do
    próprio `onUpdate`), nunca lidos de `activeNotePath`/`content` de dentro do timer — o mesmo
    autosave sempre grava no arquivo a que pertence, não importa quando ele efetivamente dispare.
  - **Troca de nota**: `watch(activeNotePath, (newPath, oldPath) => ...)` dá *flush* imediato de
    qualquer autosave pendente da nota antiga (não espera os 300ms) e limpa o editor
    (`setContent('', { emitUpdate: false })`) na hora — sem isso, o conteúdo da nota anterior
    continuava na tela até o `fileQuery` da nota nova resolver. `onBeforeUnmount` também faz
    flush de um autosave pendente em vez de descartá-lo silenciosamente.
  - A fonte do `content` ref é `editor.getMarkdown()` chamado em `onUpdate`; trocar de nota chama
    `setContent(data, { contentType: 'markdown', emitUpdate: false })` para não disparar autosave
    espúrio ao carregar.
- `daily-desk` (`src/features/daily-desk/`, Fase 5) — Dialog acionado por `mod+j` (registrado em
  `useShortcuts`) com um calendário para abrir/criar a nota diária de um dia:
  - **Composição manual do calendário**: usa `CalendarRoot` (importado direto de `reka-ui`, mesmo
    padrão do `Calendar.vue` gerado) e as peças já geradas em `shared/ui/calendar/`
    (`CalendarGrid`/`CalendarCell`/`CalendarCellTrigger`/etc.), em vez do componente composto
    `Calendar.vue` — este último não expõe slot por célula, e o Daily Desk precisa injetar um
    indicador de "tem nota" e um `Tooltip` de preview em cada dia.
  - **`prevent-deselect`**: sem essa prop, selecionar o dia já selecionado (tipicamente "hoje",
    que começa pré-selecionado) dispara um deselect e emite `undefined` em vez do `DateValue` —
    quebrava silenciosamente o fluxo mais comum (abrir a nota de hoje).
  - `CalendarCellTrigger.vue` (`shared/ui/calendar/`) ganhou `defineSlots` tipado: o componente
    gerado por `shadcn-vue add calendar` não tipava o scoped slot por célula que o primitivo Reka
    UI subjacente já expõe (`dayValue`/`selected`/`today`/etc.), então usá-lo via
    `#default="{ dayValue }"` falhava no `vue-tsc`. Edição mínima no componente gerado para expor
    o que o primitivo já fornece, não uma reescrita.
  - **Criação/migração compartilhada**: `openOrCreateDailyNote` (`dailyNoteWriter.ts`, módulo
    plano, não composable) é usada tanto pelo Daily Desk quanto por "Ir para data" na paleta de
    comandos, para não duplicar a lógica de migração. Só migra tarefas incompletas (`- [ ]`/
    `* [ ]`, extraídas via regex sobre o markdown bruto em `entities/DailyNote.ts`, sem precisar
    de uma instância do Tiptap) quando a data sendo criada é **hoje**; notas de outras datas são
    criadas vazias.
  - **Smart Dates**: `parseSmartDate` (`entities/DailyNote.ts`) usa `chrono-node` (import `pt` —
    locale português, modo `casual`) para resolver "hoje"/"ontem"/"próxima sexta"/datas
    explícitas. A paleta de comandos mostra "Ir para data" como um `ListboxItem` cru (mesmo motivo
    de "Criar nota" — o rótulo muda a cada tecla digitada e o índice de busca do `Command` fica
    uma tecla atrasado).
  - **Invalidação de cache dupla**: criar a primeira nota diária também cria a pasta `Daily/` em
    si; por isso a mutation de criação invalida `['directory', 'Daily']` **e**
    `['directory', '']` — só a segunda faz a árvore de arquivos descobrir a pasta nova.
  - **Pasta `Daily/` escondida da árvore de arquivos**: `useFileTree.ts` filtra a entrada `Daily`
    (constante `DAILY_DIRECTORY` de `entities/DailyNote.ts`) fora da listagem raiz — a navegação
    por notas diárias é feita pelo Daily Desk e pela paleta ("ir para data"), não pela árvore. O
    filtro é local à listagem raiz (não afeta uma subpasta aninhada chamada "Daily" nem outros
    consumidores de `['directory', path]`, como o `notes-index` da paleta).
- `search` (`src/features/search/`, Fase 6) — Dialog acionado por `mod+shift+f` com busca
  full-text sobre `shared/search/searchIndex.ts` (ver seção "Índice de busca" acima):
  - **`ListboxRoot`/`ListboxFilter`/`ListboxContent`/`ListboxItem` direto de `reka-ui`, não
    `CommandDialog`/`Command` do shadcn-vue**: `CommandInput.vue` liga seu texto digitado ao
    `filterState` do `Command` via `provide`/`inject` (`useCommand()`), só alcançável por um
    componente **descendente** de `<Command>`. Como `useSearch()` roda no `setup()` de
    `Search.vue` — antes/fora da árvore onde `<Command>` sequer existe ainda no template — não
    haveria como a lógica em `useSearch.ts` consumir esse contexto sem violar a regra de
    View+Composable colocado (lógica teria que morar num componente filho do `<Command>`, não no
    composable). Usar os primitivos "crus" (mesmo padrão já usado para "Criar nota"/"Ir para
    data" na paleta) evita o problema: o `query` bind direto a `ListboxFilter` via `v-model` é
    gerenciado inteiramente por `useSearch.ts`.
  - **Nenhum item vem destacado por padrão** ao abrir ou digitar — a primeira seta move o
    destaque para o primeiro resultado da coleção. Isso reflete o próprio enunciado da Fase 6
    ("atalho → digitar → **setas** → Enter") e é diferente do Daily Desk (que sempre tem "hoje"
    pré-selecionado) e da paleta de comandos (cujo `Command` do shadcn-vue destaca a primeira
    nota que bate com a busca automaticamente).
  - **Índice construído sob demanda**: `open()` dispara `ensureIndexReady` sem aguardar — o
    status do índice é reativo (`getIndexStatus()`), então a UI ("Construindo índice de busca…")
    atualiza sozinha conforme o progresso, sem bloquear a abertura do diálogo.
  - `useCommandPalette.ts` ganhou "Buscar em notas" no grupo "Aplicativo" (aciona
    `trigger('search:open')`, mesmo padrão de "Ir para Daily Desk").

## Testes

- Unitário (Vitest + @vue/test-utils): co-localizado com o composable/store que testa
  (`useTheme.test.ts` ao lado de `useTheme.ts`). `vitest.setup.ts` mocka `window.matchMedia`
  (jsdom não implementa).
- E2E (Playwright): `e2e/*.spec.ts`, 3 projects (`mobile`/`tablet`/`desktop`) com os viewports
  fixos do plano. Todo teste de fluxo de teclado usa só `page.keyboard.press`, nunca `.click()`.
  `@axe-core/playwright` roda em toda página nova para checar violações críticas de
  acessibilidade.

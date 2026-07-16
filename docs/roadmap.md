# Roadmap — notinhas

Espelha as fases de `PLANO.md`. **Antes de começar qualquer trabalho, confira aqui qual é a
fase atual** — não adiante escopo de fases futuras nem retrabalhe fases já concluídas sem que o
usuário peça explicitamente.

Legenda: ✅ concluída · 🚧 em andamento · ⬜ não iniciada

## Fase 0 — Fundação do projeto e guardrails — ✅ concluída

Scaffold Vite+Vue3+TS, Tailwind + shadcn-vue (tema claro/escuro), Pinia, vue-router,
`@tanstack/vue-query`, ESLint+Prettier+vue-tsc, Vitest, Playwright+axe-core. Shell responsivo
vazio (3 painéis que colapsam corretamente por breakpoint). `CLAUDE.md`, `docs/architecture.md`,
`docs/roadmap.md`, ADRs iniciais, skills em `.claude/skills/`, CI (GitHub Actions).

- [x] Scaffold Vite + Vue 3 + TS, git init
- [x] Tailwind CSS 4 + shadcn-vue init (tema claro/escuro via classe `.dark`)
- [x] Pinia, vue-router, `@tanstack/vue-query` instalados e plugados em `main.ts`
- [x] ESLint (flat config) + Prettier + `vue-tsc` — regra de lint anti-lógica-em-`.vue` incluída
- [x] Vitest + @vue/test-utils configurados, com teste de exemplo (`useUiStore`, `useTheme`)
- [x] Playwright + `@axe-core/playwright`, 3 projects (mobile/tablet/desktop), suíte
      `e2e/shell.spec.ts` passando
- [x] Shell responsivo vazio (`src/app/AppShell.vue` + `useAppShell.ts`) validado nos 3
      breakpoints
- [x] `CLAUDE.md`
- [x] `docs/architecture.md`
- [x] `docs/roadmap.md` (este arquivo)
- [x] ADRs 0001–0004
- [x] Skills em `.claude/skills/` (`octarine-architecture-guardrail`, `octarine-new-feature`,
      `octarine-ui-component`, `octarine-adr`)
- [x] CI (GitHub Actions) rodando lint/typecheck/test/build/e2e
- [x] Verificação final: `pnpm dev` nos 3 breakpoints + skills testadas manualmente
      (lint/typecheck/test/test:e2e passando; `octarine-architecture-guardrail` invocada e
      confirmada carregando corretamente)

_Pronto quando:_ `pnpm dev` mostra o shell vazio correto nos 3 breakpoints; lint/typecheck/test
passam; skills carregam corretamente ao serem invocadas.

## Fase 1 — Conexão com workspace local — 🚧 em andamento

`StorageAdapter` + `FileSystemAccessAdapter` + `OPFSAdapter`. Fluxo "escolher pasta", permissão
persistida via IndexedDB, reconexão com re-prompt de permissão no reload. Banner de fallback
OPFS. `useWorkspaceStore` (Pinia).

- [x] Contrato `StorageAdapter` (`src/shared/storage/StorageAdapter.ts`) + tipo `Workspace`
      (`src/entities/Workspace.ts`)
- [x] `FileSystemAccessAdapter` + `OPFSAdapter`, compartilhando a implementação comum via
      `DirectoryHandleStorageAdapter` (ambos operam sobre `FileSystemDirectoryHandle`)
- [x] Persistência do handle via IndexedDB (`idb-keyval`), best-effort — se a persistência
      falhar, a sessão atual continua funcionando (só a lembrança entre reloads é afetada)
- [x] Reconexão no boot com verificação de permissão (`queryPermission`) e ação explícita de
      re-prompt (`requestPermission`) quando necessário
- [x] Banner de fallback OPFS (componente `Alert` do shadcn-vue) quando o navegador não suporta
      File System Access API
- [x] `useWorkspaceStore` (Pinia) — status de conexão + workspace ativo
- [x] Feature `workspace-connect` (`WorkspaceConnect.vue` + `useWorkspaceConnect.ts`), gate
      renderizado pelo `AppShell` enquanto não há workspace conectado
- [x] Teste unitário do composable (`useWorkspaceConnect.test.ts`) cobrindo reconexão
      automática, re-prompt de permissão, fallback OPFS e cancelamento do picker
- [x] Teste Playwright (`e2e/workspace-connect.spec.ts`) cobrindo o fluxo por teclado com
      `showDirectoryPicker` mockado, nos 3 breakpoints, com checagem `@axe-core/playwright`
- [x] `e2e/shell.spec.ts` atualizado para passar pelo fluxo de conexão mockado antes de
      verificar o shell
- [ ] Verificação manual: escolher uma pasta real no Finder/Explorer via `pnpm dev` num
      navegador de verdade, confirmar que o app lembra dela entre reloads e que nada no disco
      foi corrompido (não automatizável — `showDirectoryPicker` exige gesto real do usuário)

_Pronto quando:_ usuário escolhe uma pasta real, o app lembra dela entre reloads; teste
Playwright cobre o fluxo mockando a API; conferência manual no Finder de que nada foi corrompido.

## Fase 2 — Árvore de arquivos + CRUD de notas Markdown — ✅ concluída

Queries TanStack sobre o `StorageAdapter`. Árvore de arquivos navegável por teclado (roving
tabindex). Criar/renomear/excluir/mover nota e pasta via menu de contexto **e**
atalhos/paleta. Textarea simples com autosave (debounce).

- [x] `StorageAdapter.createDirectory` adicionado ao contrato (ADR 0005) + implementado em
      `DirectoryHandleStorageAdapter` + testes unitários (`DirectoryHandleStorageAdapter.test.ts`
      cobrindo list/read/write/createDirectory/delete/rename, arquivo e pasta)
- [x] `useNotesStore` (Pinia) — nota ativa (`activeNotePath`), compartilhada entre `file-tree` e
      `note-editor`, com teste
- [x] Feature `file-tree` (`FileTree.vue` + `useFileTree.ts`) — árvore lazy por nível via
      `useQueries` sobre `['directory', path]`, roving tabindex (setas/Enter/F2/Delete/N/Shift+N),
      toolbar "Nova nota"/"Nova pasta" sempre alcançável por teclado, menu de contexto
      (ContextMenu) como via alternativa, diálogos de criar/renomear-mover/excluir, com teste
      unitário do composable
- [x] Feature `note-editor` (`NoteEditor.vue` + `useNoteEditor.ts`) — textarea com autosave
      debounced (`watchDebounced` do VueUse) sobre `['file', path]`, status
      salvando/salvo/erro, com teste unitário do composable
- [x] `AppShell` atualizado: placeholders da Fase 0/1 substituídos por `<FileTree />` e
      `<NoteEditor />` nos 3 breakpoints (desktop resizable, tablet aside/main, mobile
      Sheet/main)
- [x] Mock de `FileSystemDirectoryHandle` completo em `e2e/mockWorkspace.ts` (entries/
      getFileHandle/getDirectoryHandle/removeEntry/createWritable) para exercitar CRUD real via
      Playwright
- [x] `e2e/file-tree-crud.spec.ts` — criar/editar/renomear(mover)/excluir nota, criar pasta +
      nota aninhada, navegar com setas, tudo via `page.keyboard.press` (sem clique), nos 3
      breakpoints, com checagem `@axe-core/playwright`
- [x] `e2e/shell.spec.ts` e `e2e/workspace-connect.spec.ts` atualizados para os textos reais da
      UI (placeholders da Fase 2 removidos)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` passando

_Pronto quando:_ criar/renomear/excluir uma nota inteiramente via teclado (script Playwright
keyboard-only); check responsivo; testes unitários do adapter e das queries.

**Revisado depois da Fase 7** (fora de qualquer fase formal, correção de bug + extensão pedida
pelo usuário em uso real):

- Bug real: `defaultParentPath()` usava o item focado como pasta-alvo mesmo quando colapsado —
  depois de criar a 1ª pasta na raiz, o foco migrava para ela e a 2ª pasta acabava nascendo
  **dentro** da 1ª em vez de como irmã na raiz, tornando impossível criar mais de uma
  pasta/nota na raiz via toolbar/atalhos sem manobra manual de foco. Corrigido: uma pasta só é
  tratada como "diretório atual" (novo item nasce dentro dela) quando está **expandida**; pasta
  colapsada ou arquivo focado → novo item nasce como irmã (no pai do item focado).
- Reorganização via drag-and-drop adicionada à árvore de arquivos: `moveEntry()` extraído de
  `submitRename` e reaproveitado por handlers de `dragstart`/`dragover`/`drop`/`dragend` em
  `useFileTree.ts` (mesma mutation `rename` do `StorageAdapter`, sem mudança de contrato).
  Dropar sobre uma pasta move para dentro dela (`dropTargetFor`, independente de estar
  expandida — diferente de `defaultParentPath`, que rege onde criar, não onde dropar); dropar
  sobre um arquivo ou na área vazia da árvore move para o mesmo diretório desse arquivo/para a
  raiz. `canDropInto` bloqueia soltar uma pasta dentro de si mesma/de um descendente e no-ops
  quando o destino já é o local atual. Interação por mouse; o caminho equivalente por teclado
  (F2 → editar caminho) já existia e segue coberto pelo teste keyboard-only — drag-and-drop é
  um atalho adicional, não um fluxo novo sem alternativa por teclado.
- `useFileTree.test.ts`: testes novos para criação de dois itens irmãos na raiz e para os
  handlers de drag-and-drop (mover para pasta, mover de volta pra raiz, bloqueio de
  auto-aninhamento, no-op no mesmo lugar). `e2e/file-tree-crud.spec.ts`: teste novo
  `reorganizes notes and folders via drag-and-drop` (`page.dragTo`, nos 3 breakpoints, com
  checagem `@axe-core/playwright`) — não keyboard-only de propósito, já que exercita a
  interação por mouse.

## Fase 3 — Paleta de comandos + sistema global de atalhos — ✅ concluída

Command (shadcn-vue) como paleta Cmd/Ctrl+K: nova nota (cria a partir do texto digitado quando
não há nota com esse nome), ir para nota (busca nas notas existentes), alternar tema. Registro
central `useShortcuts` (mapa de atalho → handler, consultável por features futuras).

**Escopo reduzido deliberadamente** (decisão tomada com o usuário ao iniciar esta fase): "ir
para data"/"ir para daily desk" dependem do parser de datas e da convenção
`Daily/YYYY-MM-DD.md`, que só chegam na Fase 5 — essas entradas de paleta são adicionadas junto
com a própria Fase 5. "Lista de atalhos documentada em Settings" é adicionada junto com a tela
de Settings na Fase 8, consumindo o registro `useShortcuts` já pronto desde esta fase.

- [x] `useShortcuts` (`shared/composables/useShortcuts.ts`) — registro global `id → {keys,
      description, handler}`, um único listener de `keydown` em `window` anexado lazily,
      `trigger(id)` para acionar programaticamente o mesmo handler de um atalho (usado pelo
      botão de busca do header), com teste unitário
- [x] Feature `command-palette` (`CommandPalette.vue` + `useCommandPalette.ts`) — paleta
      Cmd/Ctrl+K via `CommandDialog` do shadcn-vue: "Ir para nota" (busca sobre nova query key
      `['notes-index']`, listagem recursiva via `StorageAdapter`), "Nova nota" (só aparece
      quando o texto digitado não corresponde a nenhuma nota existente e a listagem de notas já
      carregou — evita criar sobre uma nota existente por causa de uma corrida com o
      carregamento), "Alternar tema" — com teste unitário do composable
- [x] "Criar nota" implementado como `ListboxItem` do Reka UI usado diretamente (não o
      `CommandItem` do shadcn-vue): como o texto exibido muda a cada tecla digitada mas
      `Command.vue` registra o texto de busca de um item apenas uma vez no mount, o filtro
      embutido do Reka UI ficaria sempre uma tecla atrasada; `showCreateOption` já é a única
      fonte de verdade sobre a visibilidade desse item, então ele não precisa (nem deve) passar
      pelo índice de busca por texto do Reka UI
- [x] Notas existentes listadas antes da opção "Criar nota" na paleta — garante que, quando a
      busca já corresponde a uma nota real, ela seja o item destacado por padrão (evita um
      highlight "travado" na opção de criar no instante em que ela desaparece por já haver
      correspondência exata)
- [x] `AppShell` monta `<CommandPalette />` globalmente (fora dos blocos condicionais por
      breakpoint) e ganhou um botão "Abrir paleta de comandos" no header, que aciona o mesmo
      atalho via `useShortcuts().trigger`
- [x] `e2e/command-palette.spec.ts` — abrir com Cmd/Ctrl+K, ir para nota existente, criar nota
      nova, alternar tema, fechar com Escape, abrir via botão do header, tudo via
      `page.keyboard.press`, nos 3 breakpoints, com checagem `@axe-core/playwright`
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` passando (45 testes e2e)

_Pronto quando:_ toda ação da paleta é alcançável e executável sem mouse; teste Playwright
percorre o fluxo completo só de teclado.

## Fase 4 — Editor WYSIWYG (Tiptap) — ✅ concluída

Tiptap v3 (`@tiptap/vue-3` + `@tiptap/starter-kit`) substituindo a textarea da Fase 2, com a
extensão oficial `@tiptap/markdown` fazendo a serialização para/de markdown (preferida sobre o
pacote comunitário `tiptap-markdown`, descontinuado em favor da extensão oficial lançada no
Tiptap 3.7.0 — ver decisão abaixo).

- [x] `useNoteEditor.ts` reescrito em torno de `useEditor()`: extensões StarterKit (headings
      restritas a níveis 1–3, histórico/undo-redo, listas, blockquote), `CodeBlockLowlight`
      (`lowlight` + bundle `common` de linguagens) substituindo o `codeBlock` padrão do
      StarterKit, `TaskList`/`TaskItem` de `@tiptap/extension-list`, `TableKit` de
      `@tiptap/extension-table` (não resizable), extensão `Markdown` oficial e a extensão
      própria `FindInNote`
      - `Markdown` official extension escolhida em vez de `tiptap-markdown`: o próprio README do
        pacote comunitário recomenda migrar para a extensão oficial a partir da 3.7.0; ela já
        cobre round-trip de headings/listas/task lists/tabelas/code block nativamente (tabelas e
        listas declaram `parseMarkdown`/`renderMarkdown` diretamente nos pacotes
        `@tiptap/extension-table` e `@tiptap/extension-list`)
      - Autosave: `onUpdate` chama `editor.getMarkdown()` para o `content` ref; troca de nota usa
        `setContent(data, { contentType: 'markdown', emitUpdate: false })` para não disparar
        autosave espúrio ao carregar. **Revisado depois da Fase 6** (fora de qualquer fase
        formal, correção de bug reportada em uso real): o mecanismo original com
        `watchDebounced(content, ...)` (mesmo padrão da Fase 2) lia `activeNotePath.value` só na
        hora em que o callback debounced disparava, então trocar de nota antes dos 300ms de
        debounce podia gravar a edição da nota antiga no arquivo da nota nova, ou mostrar o
        conteúdo antigo na tela enquanto a nota nova carregava. Substituído por
        `scheduleAutosave`/`flushAutosave` (`setTimeout` manual em `useNoteEditor.ts`) que
        capturam path/conteúdo no momento da edição, mais um `watch(activeNotePath, ...)` que dá
        flush imediato do autosave pendente e limpa o editor na troca — ver
        `docs/architecture.md` para o detalhe completo. Testes de regressão em
        `useNoteEditor.test.ts` e `e2e/note-editor.spec.ts`
      - Estados ativos de toolbar (negrito/heading/lista ativa, canUndo/canRedo) e o contador de
        resultados de busca são `computed` que dependem de um `updateTick` incrementado em
        `onTransaction` — necessário porque `useEditor()` do `@tiptap/vue-3` v3 não força
        reatividade automática do Vue a cada transação da doc (diferente do comportamento da v2)
- [x] Extensão própria `findInNoteExtension.ts` (`FindInNote`) para "buscar dentro da nota"
      (Cmd/Ctrl+F): plugin ProseMirror com `Decoration.inline` para destacar ocorrências +
      comandos `setSearchTerm`/`goToSearchResult`/`clearSearchTerm`. Escrita à mão em vez de um
      pacote de busca de terceiros porque o único disponível
      (`@sereneinserenade/tiptap-search-and-replace`) é licença proprietária e alvo do Tiptap v2,
      incompatível com o v3 usado aqui
- [x] `NoteEditor.vue` reescrito: toolbar (undo/redo, H1–H3, negrito/itálico/tachado/código,
      citação, listas com marcadores/numerada/tarefas, bloco de código, inserir tabela, busca)
      com `Toggle`/`Button` do shadcn-vue — todos operáveis por teclado nativamente — e barra de
      busca com contador de resultados e navegação anterior/próximo
      - Componentes `toggle`/`toggle-group` adicionados via CLI do shadcn-vue (não existiam
        ainda) para os botões de estado ativo da toolbar
      - CSS do conteúdo do editor (`.note-editor-content`) em bloco `<style>` global do
        componente, usando as CSS custom properties de tema já definidas em `style.css`
        (`var(--border)`, `var(--muted)` etc.) — necessário porque o Tiptap renderiza elementos
        HTML brutos (`h1`, `ul`, `pre`, `table`) que não podem receber classes Tailwind via
        template
- [x] Teste unitário (`useNoteEditor.test.ts`) cobrindo: estado vazio, carregamento como
      markdown, autosave serializado de volta para markdown, round-trip de headings/listas,
      não-reescrita de conteúdo inalterado, busca (contagem/ciclo de resultados), limpeza da
      busca ao fechar
- [x] `e2e/note-editor.spec.ts` novo: formata uma nota com heading/listas/code block/tabela
      inteiramente por teclado, verifica que o conteúdo sobrevive a trocar de nota e voltar
      (fidelidade do round-trip markdown sem depender do fluxo de reconexão pós-reload da Fase 1,
      que segue não automatizado), busca com ciclo de resultados por teclado, checagem
      `@axe-core/playwright` — nos 3 breakpoints
- [x] `e2e/command-palette.spec.ts` e `e2e/file-tree-crud.spec.ts` atualizados: a nota agora é um
      `<div role="textbox" aria-label="Conteúdo da nota">` (contenteditable do Tiptap) em vez de
      uma `<textarea>` — locators trocados de `getByLabel(...).toHaveValue(...)` para
      `getByRole('textbox', { name: ... }).toHaveText(...)`
- [x] Verificação manual via `pnpm dev` num navegador real: formatação por teclado, autosave,
      busca com ciclo de resultados, e fidelidade do round-trip confirmada após reload completo
      da página lendo do disco real (não só do mock do Playwright)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` passando (42 testes unitários,
      54 testes e2e)

_Pronto quando:_ nota com headings/listas/code/tabela é escrita inteiramente por teclado; reload
confirma fidelidade do round-trip markdown; check responsivo mobile.

## Fase 5 — Daily Desk — ✅ concluída

Calendar (shadcn-vue/Reka UI) como superfície de navegação. Convenção `Daily/YYYY-MM-DD.md` com
criação automática ao navegar. Indicador visual de dias com nota + preview no hover/foco. Smart
Dates no palette via `chrono-node` (locale `pt`). Contador de tarefas por nota diária + migração
de tarefas incompletas. Inclui as entradas "ir para data" e "ir para daily desk" na paleta de
comandos (adiadas da Fase 3 por dependerem deste parser e desta convenção de arquivo).

- [x] `src/entities/DailyNote.ts` — funções puras de domínio: `dailyNotePath`/
      `dateFromDailyNoteFilename` (convenção `Daily/YYYY-MM-DD.md`), `formatIsoDate`,
      `mostRecentDateBefore`, `extractIncompleteTaskLines`/`countIncompleteTasks`/
      `removeIncompleteTaskLines` (parsing leve de `- [ ]`/`* [ ]` via regex sobre o markdown
      bruto, sem precisar instanciar um editor Tiptap), `buildMigratedNoteContent` e
      `parseSmartDate` (wrapper de `chrono-node`, locale `pt`, modo casual) — todas testadas em
      `DailyNote.test.ts` sem depender do `StorageAdapter`
- [x] `chrono-node` adicionado como dependência para o parser de Smart Dates ("hoje", "ontem",
      "próxima sexta", datas explícitas como `20/07/2026`) — locale `pt` escolhida por ser um app
      em português; decisão já estava pré-sancionada pelo próprio roadmap ("ex: chrono-node"), sem
      necessidade de ADR novo
- [x] `src/features/daily-desk/dailyNoteWriter.ts` — `listDailyDates`/`openOrCreateDailyNote`
      (não-composable, módulo plano) compartilhado entre `daily-desk` e `command-palette` para não
      duplicar a lógica de criação/migração; `openOrCreateDailyNote` só migra tarefas incompletas
      da nota diária anterior mais recente quando a data sendo criada é **hoje** — notas de
      outras datas são criadas vazias
- [x] Feature `daily-desk` (`DailyDesk.vue` + `useDailyDesk.ts`) — Dialog com um `CalendarRoot`
      (Reka UI, composto diretamente a partir das peças já geradas em `shared/ui/calendar/` — não
      o componente `Calendar.vue` completo, que não expõe slot por célula) com `prevent-deselect`
      (selecionar o dia já selecionado — tipicamente "hoje" — não pode virar um deselect que
      emite `undefined`), indicador (`data-selected`/ponto) para dias com nota via
      `['directory', 'Daily']`, preview em `Tooltip` no hover/foco (conteúdo via `['file', path]`
      sob demanda, só para a data focada) mostrando contagem de tarefas pendentes
- [x] `src/shared/ui/calendar/CalendarCellTrigger.vue` ganhou `defineSlots` tipado (faltava no
      componente gerado pelo `shadcn-vue add calendar`, apesar do primitivo Reka UI subjacente já
      expor esse scoped slot) — edição mínima e necessária no componente gerado, não uma reescrita
- [x] Atalho global `mod+j` (`daily-desk:open`) registrado via `useShortcuts`, mais botão
      "Abrir Daily Desk" no header do `AppShell`
- [x] `useCommandPalette.ts`: entradas "Ir para data" (aparece só quando o texto digitado resolve
      via `parseSmartDate`; mesmo padrão de `ListboxItem` cru já usado por "Criar nota", pelo
      mesmo motivo — rótulo muda a cada tecla) e "Ir para Daily Desk" (aciona
      `trigger('daily-desk:open')`) — ordem dos itens do grupo "Aplicativo" importa: "Alternar
      tema" continua primeiro para não quebrar o destaque padrão por teclado do item já existente
- [x] Mutations de criação de nota diária (`daily-desk` e `command-palette`) invalidam tanto
      `['directory', 'Daily']` quanto `['directory', '']` — a primeira nota diária criada também
      cria a pasta `Daily/` em si, que a árvore de arquivos só descobre reconsultando a raiz
- [x] Pasta `Daily/` escondida da árvore de arquivos (`useFileTree.ts` filtra a entrada na
      listagem raiz) — a navegação por notas diárias é feita pelo Daily Desk e pela paleta, não
      pela árvore; testado em `useFileTree.test.ts` e em `e2e/daily-desk.spec.ts`
- [x] `e2e/daily-desk.spec.ts` — cria/abre a nota de hoje, navega 30 dias só com `ArrowRight` +
      `Enter`, abre nota existente sem sobrescrevê-la, migração de tarefas ponta a ponta
      (verifica tanto a nota de hoje quanto a nota antiga), alcançável via atalho e via botão do
      header, fecha com Escape, checagem `@axe-core/playwright` — tudo via `page.keyboard.press`,
      nos 3 breakpoints; usa `page.clock.setFixedTime` para fixar "hoje" de forma determinística
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` passando (73 testes unitários,
      75 testes e2e)

_Pronto quando:_ navegar 30 dias só por teclado; nomes de arquivo no disco batem com a
convenção; teste de migração move um item não marcado de um dia antigo para o dia atual. ✅

## Fase 6 — Busca full-text — ✅ concluída

Índice client-side sobre o cache IndexedDB (título + conteúdo), atualizado incrementalmente a
cada escrita. Busca acessível via paleta + atalho dedicado, lista de resultados navegável por
teclado.

- [x] `src/shared/search/searchIndex.ts` — índice em memória (`Map<path, {title, content}>`,
      estado em módulo, mesmo padrão de `useShortcuts`/`useTheme`) espelhado no IndexedDB via
      `idb-keyval`: `ensureIndexReady`/`rebuildIndex` (varredura completa, usada só na primeira
      vez que a busca abre numa sessão sem índice persistido utilizável), `upsertEntry`/
      `removeSubtree`/`renameSubtree` (atualização incremental) e `search` (substring
      case-insensitive em título+conteúdo, título rankeado acima de conteúdo, com snippet
      recortado ao redor do match) — todas testadas em `searchIndex.test.ts` sem depender de um
      `StorageAdapter` real
- [x] `src/shared/storage/IndexingStorageAdapter.ts` — decorator que envolve qualquer
      `StorageAdapter` (File System Access ou OPFS) e mantém o índice sincronizado em
      `writeFile`/`deleteFile`/`rename`, sem exigir que cada feature (note-editor, file-tree,
      daily-desk, command-palette) lembre de atualizar o índice manualmente — como todo código já
      é obrigado a passar pelo `StorageAdapter`, decorá-lo é o único ponto que garante cobertura
      de 100% das escritas. `rename` remapeia as entradas já indexadas por prefixo de caminho em
      vez de reler o conteúdo do adapter (conteúdo não muda numa renomeação/movimentação — mesma
      ideia de `remapPath`/`remapExpandedAndActive` em `file-tree/useFileTree.ts`, Fase 2).
      Testado em `IndexingStorageAdapter.test.ts`; `createStorageAdapter.ts` passa a instanciar
      sempre a versão decorada
- [x] `forgetPersistedWorkspace` também reseta o índice (`resetSearchIndex`, memória + chave no
      IndexedDB) — trocar de workspace não pode deixar entradas do workspace anterior
      contaminando a busca do novo
- [x] Feature `search` (`Search.vue` + `useSearch.ts`) — Dialog acionado por `mod+shift+f`: usa
      `ListboxRoot`/`ListboxFilter`/`ListboxContent`/`ListboxItem` importados direto de `reka-ui`
      em vez do composto `CommandDialog`/`Command` do shadcn-vue — `CommandInput` liga seu
      `v-model` ao `filterState` do `Command` via `provide`/`inject`, que só é alcançável por um
      descendente do próprio `<Command>`; como a lógica de busca já vive inteiramente em
      `useSearch.ts` (chamado no `setup()` de `Search.vue`, antes/fora da árvore do `<Command>`
      que só existiria no template), essa injeção não seria alcançável sem violar a regra de
      View+Composable colocado. Índice construído sob demanda (`ensureIndexReady`) na primeira
      abertura da sessão; abertura do diálogo não bloqueia nisso graças à reatividade do status
      do índice (estado "construindo índice…" aparece sozinho)
- [x] `useCommandPalette.ts`/`CommandPalette.vue`: item "Buscar em notas" no grupo "Aplicativo"
      (depois de "Ir para Daily Desk") aciona `trigger('search:open')`, mesmo padrão de "Ir para
      Daily Desk"
- [x] Botão "Buscar em todas as notas" no header do `AppShell` (ícone `FileSearch`, distinto do
      ícone de lupa já usado pela paleta de comandos)
- [x] `e2e/search.spec.ts` — busca por conteúdo com ranking de título acima de conteúdo,
      navegação de resultados só com `ArrowDown` (nenhum item vem destacado por padrão — a
      primeira seta move o destaque para o primeiro resultado, refletindo exatamente o fluxo
      "atalho → digitar → setas → Enter" do enunciado desta fase), nota diária também é
      buscável, sem resultados, alcançável via atalho/botão do header/paleta, fecha com Escape,
      checagem `@axe-core/playwright` — tudo via `page.keyboard.press`, nos 3 breakpoints
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` passando (100 testes unitários,
      96 testes e2e)

_Pronto quando:_ busca retorna resultados corretos num workspace fixture; fluxo atalho → digitar
→ setas → Enter abre a nota, tudo por teclado. ✅

## Fase 7 — Organização: tags, doclinks, propriedades — ✅ concluída

Parsing de `#tag` inline + painel de tags. `[[links]]` entre notas com autocomplete e painel de
backlinks. Propriedades mínimas (frontmatter: criado/atualizado, chave-valor customizada).

- [x] Entidades puras novas (`src/entities/`, zero IO, mesmo padrão de `DailyNote.ts`):
      `markdownText.ts` (`stripCode`, usado por Tag/DocLink para não capturar `#`/`[[` dentro de
      código), `Tag.ts` (`extractTags`/`uniqueTagNames`, regex que exclui headings ATX — exige
      espaço nulo logo após `#` — e `foo#tag`/`##tag`), `DocLink.ts` (`extractDocLinks`/
      `docLinkTargets`/`resolveDocLinkTarget`, resolução case-insensitive via mapa título→path
      fornecido pelo caller; `unescapeDocLinkMarkdown` desfaz o backslash-escape de colchetes
      duplos que `@tiptap/markdown` aplica a texto plano — sem isso `[[Nota]]` não sobrevivia ao
      autosave), `Frontmatter.ts` (`parseFrontmatter`/`serializeNote`/`stampTimestamps`, parser
      linha-a-linha sem lib de YAML, escopo mínimo)
- [x] `shared/search/searchIndex.ts` estendido em vez de um 3º mecanismo de indexação (ADR 0006):
      `SearchIndexEntry` ganhou `tags`/`links`, computados a partir do corpo (frontmatter já
      removido) em `rebuildIndex`/`upsertEntry`; novas queries `listTagsWithCounts`/
      `notesForTag`/`buildTitleIndex`/`notesLinkingTo` — esta última resolve `[[link]]` contra o
      título **atual** de cada nota a cada chamada, não um path guardado no momento da indexação
- [x] `useNoteEditor.ts`: frontmatter separado do corpo antes de entrar no Tiptap
      (`parseFrontmatter` no watcher de `fileQuery.data`) e recomposto no autosave
      (`serializeNote`+`stampTimestamps` em `flushAutosave`) — `atualizado` sempre re-carimbado,
      `criado` só na primeira vez; duas novas extensões Tiptap somente-decoração no molde do
      `FindInNote` (Fase 4): `tagHighlightExtension.ts` (`#tag`, visual) e `docLinkExtension.ts`
      (`[[link]]` resolvido/não-resolvido, `handleClick` navega em link resolvido, comando
      `followDocLinkAtCursor` vinculado a `Mod-Enter` como equivalente por teclado do clique) +
      autocomplete via `@tiptap/suggestion` nova dependência (`docLinkSuggestionPopup.ts`, popup
      DOM puro posicionado por `props.mount`, já usa `@floating-ui/dom` internamente)
- [x] Bugs reais encontrados só ao exercitar o fluxo ponta a ponta (não pegos pelos testes
      unitários isolados): (1) `getSuggestions` precisou virar assíncrona — na primeira vez que o
      usuário digita `[[` numa sessão, o índice ainda não estava construído, mostrando sempre
      lista vazia; (2) título de uma palavra só (sem espaço) fazia o popup de autocomplete não
      fechar depois de selecionar, porque o texto recém-inserido continuava batendo com o padrão
      de gatilho do `@tiptap/suggestion` — corrigido chamando `exitSuggestion` explicitamente
      depois de inserir; (3) a nota ativa aparecia na sua própria lista de sugestões — excluída
      via path na filtragem; (4) `useTagsPanel.ts`/`useBacklinksPanel.ts` não inicializavam o
      roving-tabindex no mount (`watch(..., {immediate: true})` faltando), deixando a lista
      inteira com `tabindex="-1"` e inalcançável só por Tab até o primeiro clique
- [x] Features novas, todas View+Composable colocado: `file-navigator` (wrapper fino, Tabs
      "Arquivos"/"Tags" compondo `FileTree` inalterado + `TagsPanel` novo), `tags-panel` (lista
      de tags com contagem, Enter filtra notas com aquela tag, Escape volta), `note-context-panel`
      (wrapper fino espelhando `file-navigator`, Tabs "Backlinks"/"Propriedades"),
      `backlinks-panel` (`notesLinkingTo` reativo — `entries` é `reactive(Map)` do módulo, mesmo
      padrão de `useSearch.ts`), `note-properties` (ciclo de leitura/escrita independente do
      note-editor sobre a mesma query key `['file', path]`, reconciliado via
      `invalidateQueries` — sem lock entre os dois, ver ADR 0006)
- [x] Componente `Badge` adicionado via CLI shadcn-vue (chips de tag); `Tabs` (já presente desde a
      Fase 0, sem consumidor até agora) confirmado com navegação por teclado completa via Reka UI
      sem wiring extra
- [x] `AppShell.vue`: `<FileTree/>` → `<FileNavigator/>` e o placeholder "Painel contextual
      (backlinks/propriedades — Fase 7)" → `<NoteContextPanel/>`, nos 3 breakpoints
- [x] ADR 0006 — reaproveitamento do índice de busca para tags/links + estratégia de frontmatter
      (strip antes do editor, reassemble no autosave, reconciliação via `invalidateQueries`),
      documentando as limitações aceitas: colisão de título "último ganha", rename não reescreve
      links antigos (viram não-resolvidos), `criado` não é a data real do arquivo no SO, sem lock
      entre editor e painel de propriedades
- [x] `e2e/tags.spec.ts`, `e2e/doclinks.spec.ts`, `e2e/note-properties.spec.ts` novos — fluxos
      só de teclado, checagem `@axe-core/playwright`, nos 3 breakpoints; `e2e/shell.spec.ts`
      atualizado para a nova estrutura de abas do painel direito
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` passando (180 testes unitários,
      144 testes e2e)

_Pronto quando:_ notas linkadas mostram backlinks corretamente; filtro por tag funciona; criação
de link via autocomplete só por teclado. ✅

**Revisado depois da Fase 7** (fora de qualquer fase formal, feature pedida pelo usuário em cima
do MVP já entregue — não consta no `PLANO.md` original, documentada em ADR 0007):

- Abas de notas abertas: cada nota aberta (pela árvore, Daily Desk, paleta, busca, tags,
  backlinks ou um `[[doclink]]`) ganha sua própria aba; só uma fica visível por vez.
  `useNotesStore` ganhou `openTabs: string[]` além de `activeNotePath`; `openNote(path)` manteve
  a mesma assinatura (assim nenhum dos 7 consumidores existentes precisou mudar) — passou a
  adicionar a nota a `openTabs` (se ainda não estiver) e sempre focar essa aba. Funções novas:
  `closeTab(path)` (fecha, reativa a aba vizinha), `renameTab(fromPath, toPath)` (usada pelo
  `file-tree` ao mover/renomear um arquivo com aba aberta).
- Feature nova `note-tabs` (`NoteTabs.vue` + `useNoteTabs.ts`), montada acima do `NoteEditor` nos
  3 breakpoints: tira de abas com roving tabindex no mesmo padrão do `file-tree`
  (`ArrowLeft`/`ArrowRight` move o foco, `Enter`/`Espaço` ativa, `Delete`/`Backspace` fecha, sem
  diálogo de confirmação já que fechar não apaga o arquivo).
- `file-tree/useFileTree.ts`: apagar/mover uma pasta agora fecha/remapeia **toda** aba aberta
  dentro dela, não só a nota ativa (antes só `activeNotePath` era considerado).
- `e2e/note-tabs.spec.ts` novo — abrir notas em abas distintas, alternar só de teclado (seta move
  foco sem ativar, Enter ativa), fechar com Delete e cair na aba vizinha, fechar a última aba e
  voltar ao estado vazio, checagem `@axe-core/playwright`, nos 3 breakpoints.

## Fase 8 — Polimento MVP e checklist de release — ⬜ não iniciada

Passe completo de acessibilidade (axe-core zero violações críticas, roteiro de teclado cobrindo
cada tela). Passe responsivo nos breakpoints definidos + smoke test em dispositivo real.
Onboarding/estados vazios/erros. Tela de Settings consolidando tema, atalhos (lista lida do
registro `useShortcuts` da Fase 3), gestão de workspace. Teste de performance com fixture de
~500 notas.

_Pronto quando:_ regressão manual + automatizada completa passa; tag `v0.1.0-mvp`.

## Explicitamente fora do roadmap do MVP

Git Sync (ADR 0002), recursos de IA (ADR 0003), app iOS/nativo, tipos de nota/views
customizáveis, anotação de vídeo, diagramas Mermaid, LaTeX — podem virar milestones depois do
MVP validado, se o usuário decidir revisitar.

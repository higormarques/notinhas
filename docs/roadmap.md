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

## Fase 4 — Editor WYSIWYG (Tiptap) — ⬜ não iniciada

Tiptap + StarterKit + extensão markdown (serializa para/de markdown). Formatação: headings,
listas, code block com highlight, tabelas, task lists. Autosave, undo/redo, buscar dentro da
nota (Cmd/Ctrl+F).

_Pronto quando:_ nota com headings/listas/code/tabela é escrita inteiramente por teclado; reload
confirma fidelidade do round-trip markdown; check responsivo mobile.

## Fase 5 — Daily Desk — ⬜ não iniciada

Calendar (shadcn-vue) como superfície de navegação. Convenção `Daily/YYYY-MM-DD.md` com criação
automática ao navegar. Indicador visual de dias com nota + preview no hover/foco. Smart Dates no
palette via parser leve (ex: chrono-node). Contador de tarefas por nota diária + migração de
tarefas incompletas. Inclui as entradas "ir para data" e "ir para daily desk" na paleta de
comandos (adiadas da Fase 3 por dependerem deste parser e desta convenção de arquivo).

_Pronto quando:_ navegar 30 dias só por teclado; nomes de arquivo no disco batem com a
convenção; teste de migração move um item não marcado de um dia antigo para o dia atual.

## Fase 6 — Busca full-text — ⬜ não iniciada

Índice client-side sobre o cache IndexedDB (título + conteúdo), atualizado incrementalmente a
cada escrita. Busca acessível via paleta + atalho dedicado, lista de resultados navegável por
teclado.

_Pronto quando:_ busca retorna resultados corretos num workspace fixture; fluxo atalho → digitar
→ setas → Enter abre a nota, tudo por teclado.

## Fase 7 — Organização: tags, doclinks, propriedades — ⬜ não iniciada

Parsing de `#tag` inline + painel de tags. `[[links]]` entre notas com autocomplete e painel de
backlinks. Propriedades mínimas (frontmatter: criado/atualizado, chave-valor customizada).

_Pronto quando:_ notas linkadas mostram backlinks corretamente; filtro por tag funciona; criação
de link via autocomplete só por teclado.

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

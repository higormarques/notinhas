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

## Fase 2 — Árvore de arquivos + CRUD de notas Markdown — ⬜ não iniciada

Queries TanStack sobre o `StorageAdapter`. Árvore de arquivos navegável por teclado (roving
tabindex). Criar/renomear/excluir/mover nota e pasta via menu de contexto **e**
atalhos/paleta. Textarea simples com autosave (debounce).

_Pronto quando:_ criar/renomear/excluir uma nota inteiramente via teclado (script Playwright
keyboard-only); check responsivo; testes unitários do adapter e das queries.

## Fase 3 — Paleta de comandos + sistema global de atalhos — ⬜ não iniciada

Command (shadcn-vue) como paleta Cmd/Ctrl+K: nova nota, ir para nota, ir para data, alternar
tema, ir para daily desk. Registro central `useShortcuts`, lista de atalhos documentada em
Settings.

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
tarefas incompletas.

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
Onboarding/estados vazios/erros. Tela de Settings consolidando tema, atalhos, gestão de
workspace. Teste de performance com fixture de ~500 notas.

_Pronto quando:_ regressão manual + automatizada completa passa; tag `v0.1.0-mvp`.

## Explicitamente fora do roadmap do MVP

Git Sync (ADR 0002), recursos de IA (ADR 0003), app iOS/nativo, tipos de nota/views
customizáveis, anotação de vídeo, diagramas Mermaid, LaTeX — podem virar milestones depois do
MVP validado, se o usuário decidir revisitar.

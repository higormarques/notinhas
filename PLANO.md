# Plano: Clone do Octarine (Vite + Vue 3 + TS)

## Contexto

O usuário quer clonar as principais features do Octarine — app de notas/PKM local-first,
Markdown puro, editor WYSIWYG, journaling diário vinculado a calendário (Daily Desk) e Git
Sync — descritas em `analise-octarine.md` (já existente na raiz do projeto). O stack definido
é Vite + Vue 3 + TypeScript + TanStack Query + Pinia + shadcn-vue, com dois requisitos de UX
tratados como **pilares não-negociáveis desde o início**, não como polimento final:

1. **Navegável 100% por teclado** — toda a aplicação deve ser operável sem mouse.
2. **Totalmente responsivo** — mobile, tablet e desktop com o mesmo código, não telas separadas.

Decisões já tomadas com o usuário (ver seção "Decisões de arquitetura" abaixo): app é uma Web
SPA pura (sem Electron/Tauri) usando File System Access API com fallback OPFS; Git Sync fica
fora do MVP (milestone pós-MVP); recursos de IA ficam totalmente fora de escopo.

O pedido também exige um mecanismo explícito para **impedir que sessões futuras de IA fujam do
desenho original** — isso é tratado como entregável de primeira classe (Fase 0), não como nota
de rodapé, via `CLAUDE.md`, ADRs e skills dedicadas do Claude Code.

O plano é estruturado em fases pequenas e testáveis: cada fase termina em algo demonstrável e
verificável antes de avançar para a próxima, conforme pedido pelo usuário.

---

## Decisões de arquitetura (confirmadas com o usuário)

| Decisão        | Escolha                      | Motivo                                                                                                                                          |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Plataforma     | Web SPA (sem Tauri/Electron) | Mantém o stack pedido puro; usa File System Access API para pasta real no disco em Chrome/Edge, com fallback OPFS (sandboxed) em Firefox/Safari |
| Git Sync       | Pós-MVP                      | Peça mais arriscada/complexa (mesmo no original é "beta"); MVP foca no loop central de notas                                                    |
| Recursos de IA | Fora de escopo               | Todo esforço vai para os 4 pilares centrais + UX de teclado/responsividade                                                                      |

**Limitação conhecida e documentada:** ao contrário do Octarine desktop, o navegador não expõe
uma API de _filesystem watch_ real por segurança — não é possível refletir instantaneamente
edições feitas por fora do app (outro editor, sync de terceiros). O melhor substituto é
refetch em foco/visibilidade da aba via TanStack Query. Isso será registrado em ADR e no
`CLAUDE.md` para não virar uma expectativa equivocada em sessões futuras.

---

## Arquitetura técnica

**Stack:**

- Vite + Vue 3 (`<script setup>`, Composition API) + TypeScript estrito
- **Pinia** — estado de UI/cliente: workspace ativo, nota ativa, painéis abertos, tema, contexto de foco/teclado
- **TanStack Query** (`@tanstack/vue-query`) — camada assíncrona sobre o filesystem local, tratando leitura/escrita de arquivos como "chamadas de API": `['directory', path]`, `['file', path]`, `['daily', date]`, com cache, invalidação em mutations e refetch-on-focus
- **shadcn-vue** (sobre Reka UI) + Tailwind CSS — Command, Dialog, Calendar, Sheet, Resizable, ContextMenu, Tabs, Tooltip, Toast — componentes que já vêm com comportamento de teclado/a11y correto
- **Tiptap** (ProseMirror) + extensão de markdown — editor WYSIWYG que persiste markdown puro
- vue-router, pnpm, ESLint (flat config) + Prettier, Vitest + @vue/test-utils, Playwright + `@axe-core/playwright`

**Camada de storage (abstração central):**
Interface `StorageAdapter` (`listDirectory`, `readFile`, `writeFile`, `deleteFile`, `rename`)
com duas implementações, selecionadas por feature-detection no boot:

- `FileSystemAccessAdapter` — `showDirectoryPicker()` + `FileSystemDirectoryHandle`; handle
  persistido via IndexedDB (`idb-keyval`) para lembrar o workspace entre reloads
- `OPFSAdapter` — fallback via `navigator.storage.getDirectory()` para navegadores sem suporte,
  com banner avisando que os arquivos ficam restritos ao navegador

Espelha a separação do Octarine: config global do app (workspace, tema, prefs) em um store
IndexedDB pequeno equivalente ao `.store.dat`; árvore de pastas/metadados/índice de busca como
cache derivado (nunca fonte de verdade); o conteúdo da nota em si vive só nos arquivos via
`StorageAdapter`.

**Separação de responsabilidade (transversal, regra rígida desde a Fase 0):**

- Todo componente segue o padrão **View + Composable colocado**: o arquivo `.vue` contém
  apenas template e ligação mínima (`<script setup>` só chama o composable e desestrutura o que
  o template usa) — nenhuma regra de negócio, chamada a `StorageAdapter`, `useQuery`/`useMutation`
  ou manipulação de estado complexa dentro do `.vue`.
- Toda lógica (estado local, chamadas a queries/mutations do TanStack Query, acesso a stores
  Pinia, cálculo derivado, efeitos) vive num composable `useNomeDoComponente.ts` **colocado no
  mesmo diretório** do componente, ex: `FileTree.vue` + `useFileTree.ts`,
  `NoteEditor.vue` + `useNoteEditor.ts`.
- O composable expõe uma interface enxuta (refs/computed/funções) que o `.vue` apenas consome;
  isso torna a lógica testável em isolamento via Vitest sem precisar montar o componente.
- Essa convenção é registrada em `CLAUDE.md`/`docs/architecture.md` como regra obrigatória e
  entra no checklist de Definition of Done de cada fase (nenhum PR de feature é considerado
  pronto se tiver lógica de negócio dentro do `<script setup>` do `.vue`); a skill
  `octarine-new-feature` já gera o par view+composable colocado por padrão.

**Teclado (transversal, desde a Fase 0):**

- Registro central de atalhos (`useShortcuts`), paleta de comandos (Cmd/Ctrl+K) via shadcn-vue
  Command, roving tabindex na árvore de arquivos e lista de notas, focus trap em modais (já
  vem do Reka UI)
- Cada fase tem como critério de pronto um teste Playwright que percorre o fluxo inteiro só com
  `page.keyboard.press`, sem nenhum clique

**Responsividade (transversal, desde a Fase 0):**

- Mesma árvore de componentes com breakpoints Tailwind: mobile = single-pane com Sheet
  deslizante; tablet = sidebar recolhível; desktop = 3 painéis redimensionáveis (Resizable)
- Cada fase é validada em 375px / 768px / 1280px

**Estrutura de pastas proposta:**

```
src/
  app/            # shell, router, providers (Pinia, VueQuery)
  entities/       # tipos de domínio: Note, DailyNote, Workspace, Tag
  features/       # workspace-connect, file-tree, note-editor, command-palette,
                  # daily-desk, search, tags-links, settings
                  # cada feature: ComponentName.vue + useComponentName.ts colocados
  shared/
    storage/      # StorageAdapter + FileSystemAccessAdapter + OPFSAdapter
    ui/           # componentes shadcn-vue gerados
    composables/  # useBreakpoint, useShortcuts, useDebounce
    stores/       # Pinia stores transversais (workspace, ui)
docs/
  architecture.md
  roadmap.md
  adr/
.claude/
  skills/
CLAUDE.md
PLANO.md          # este arquivo
```

---

## Skills e guardrails para manter a IA alinhada ao desenho

Esta é uma entrega da Fase 0, não um extra:

1. **`CLAUDE.md`** (raiz) — fonte única de verdade: stack e versões, mapa de pastas, regra de
   fronteira Pinia vs TanStack Query, regra obrigatória de **View + Composable colocado**
   (`.vue` só template/ligação, lógica sempre em `useX.ts` ao lado), contrato do
   `StorageAdapter`, checklist de teclado/responsividade como Definition of Done, comandos
   (`pnpm dev/test/lint/typecheck`), e lista explícita de **fora de escopo agora** (Git Sync,
   IA) para a IA não adiantar trabalho.

2. **`docs/architecture.md`** — referência técnica mais profunda (contrato do StorageAdapter,
   convenção de query keys, lista de Pinia stores e responsabilidade única de cada um, convenção
   de sempre adicionar componentes via CLI do shadcn-vue em vez de escrever primitivos à mão).

3. **`docs/roadmap.md`** — espelha as fases deste plano, com Definition of Done por fase. A IA
   deve checar a fase atual antes de começar qualquer trabalho.

4. **`docs/adr/NNNN-titulo.md`** — Architecture Decision Records para as decisões já tomadas
   (`0001-web-spa-file-system-access-api.md`, `0002-git-sync-pos-mvp.md`,
   `0003-ia-fora-de-escopo.md`, `0004-sem-filesystem-watch-nativo.md`) e para decisões futuras,
   evitando que a mesma discussão se repita em sessões com contexto resetado.

5. **Skills customizadas em `.claude/skills/`:**
   - `octarine-architecture-guardrail` — lida no início de qualquer trabalho de feature; relê
     `CLAUDE.md` + `docs/architecture.md` + `docs/roadmap.md` e reafirma fase atual, DoD e
     restrições rígidas antes de qualquer código ser escrito. É o mecanismo principal
     anti-desvio.
   - `octarine-new-feature` — cria o esqueleto de uma nova fatia de feature seguindo o padrão de
     pastas estabelecido (view + composable colocados + testes) e exige o checklist de
     teclado/responsividade marcado antes de considerar a tarefa concluída.
   - `octarine-ui-component` — encapsula `pnpm dlx shadcn-vue@latest add <componente>`, para
     que primitivos de UI sempre venham do gerador oficial (mantém tokens de tema e a11y
     consistentes) em vez de serem escritos à mão.
   - `octarine-adr` — cria um novo ADR a partir de template quando uma decisão arquitetural não
     trivial surgir no meio do projeto.

6. **Hook opcional (`.claude/settings.json`)** — um hook de `Stop`/`PreToolUse` rodando
   `pnpm typecheck && pnpm lint` automaticamente, pego na Fase 0 junto com o CI, para reforçar
   no nível da ferramenta (não só na memória da IA) que o código não pode quebrar contrato.

---

## Fases de entrega (pequenas, testáveis, sequenciais)

**Fase 0 — Fundação do projeto e guardrails — ✅ concluída**
Scaffold Vite+Vue3+TS, Tailwind + shadcn-vue (init, tema claro/escuro), Pinia, vue-router,
`@tanstack/vue-query`, ESLint+Prettier+vue-tsc, Vitest, Playwright+axe-core. Shell responsivo
vazio (3 painéis que colapsam corretamente por breakpoint). `CLAUDE.md`, `docs/architecture.md`,
`docs/roadmap.md`, ADRs iniciais, skills em `.claude/skills/`, CI (GitHub Actions).
_Pronto quando:_ `pnpm dev` mostra o shell vazio correto nos 3 breakpoints; lint/typecheck/test
passam; skills carregam corretamente ao serem invocadas.

**Fase 1 — Conexão com workspace local — 🚧 em andamento**
`StorageAdapter` + `FileSystemAccessAdapter` + `OPFSAdapter`. Fluxo "escolher pasta", permissão
persistida via IndexedDB, reconexão com re-prompt de permissão no reload. Banner de fallback
OPFS. `useWorkspaceStore` (Pinia).
_Pronto quando:_ usuário escolhe uma pasta real, o app lembra dela entre reloads; teste
Playwright cobre o fluxo mockando a API; conferência manual no Finder de que nada foi corrompido.

**Fase 2 — Árvore de arquivos + CRUD de notas Markdown (texto puro, sem WYSIWYG ainda)**
Queries TanStack sobre o `StorageAdapter`. Árvore de arquivos navegável por teclado (roving
tabindex). Criar/renomear/excluir/mover nota e pasta via menu de contexto **e** atalhos/paleta.
Textarea simples com autosave (debounce).
_Pronto quando:_ criar/renomear/excluir uma nota inteiramente via teclado (script Playwright
keyboard-only); check responsivo; testes unitários do adapter e das queries.

**Fase 3 — Paleta de comandos + sistema global de atalhos**
Command (shadcn-vue) como paleta Cmd/Ctrl+K: nova nota (cria a partir do texto digitado quando
não há nota com esse nome), ir para nota (busca nas notas existentes), alternar tema. Registro
central `useShortcuts` (mapa de atalho → handler, consultável por features futuras).
**Escopo reduzido deliberadamente**: "ir para data" e "ir para daily desk" dependem do parser de
datas e da convenção `Daily/YYYY-MM-DD.md` que só chegam na Fase 5 — essas entradas de paleta
são adicionadas junto com a própria Fase 5, não aqui. Da mesma forma, "lista de atalhos
documentada em Settings" é adicionada junto com a tela de Settings na Fase 8 (consumindo o
registro `useShortcuts` já pronto desde a Fase 3).
_Pronto quando:_ toda ação da paleta é alcançável e executável sem mouse; teste Playwright
percorre o fluxo completo só de teclado.

**Fase 4 — Editor WYSIWYG (Tiptap) substituindo o textarea**
Tiptap + StarterKit + extensão markdown (serializa para/de markdown). Formatação: headings,
listas, code block com highlight, tabelas, task lists (checkboxes, usados na Fase 6). Autosave,
undo/redo, buscar dentro da nota (Cmd/Ctrl+F).
_Pronto quando:_ nota com headings/listas/code/tabela é escrita inteiramente por teclado; reload
confirma fidelidade do round-trip markdown; check responsivo mobile.

**Fase 5 — Daily Desk (journaling vinculado ao calendário)**
Calendar (shadcn-vue) como superfície de navegação (já navegável por setas via Reka UI).
Convenção `Daily/YYYY-MM-DD.md` com criação automática ao navegar. Indicador visual de dias com
nota + preview no hover/foco. Smart Dates no palette ("hoje", "ontem", "próxima sexta", datas
explícitas) via parser leve (ex: chrono-node). Contador de tarefas por nota diária + migração de
tarefas incompletas. **Inclui as entradas "ir para data" e "ir para daily desk" na paleta de
comandos** (adiadas da Fase 3 por dependerem deste parser e desta convenção de arquivo).
_Pronto quando:_ navegar 30 dias só por teclado; nomes de arquivo no disco batem com a
convenção; teste de migração move um item não marcado de um dia antigo para o dia atual.

**Fase 6 — Busca full-text**
Índice client-side sobre o cache IndexedDB (título + conteúdo), atualizado incrementalmente a
cada escrita. Busca acessível via paleta + atalho dedicado, lista de resultados navegável por
teclado.
_Pronto quando:_ busca retorna resultados corretos num workspace fixture; fluxo atalho → digitar
→ setas → Enter abre a nota, tudo por teclado.

**Fase 7 — Organização: tags, doclinks, propriedades (escopo reduzido do Octarine)**
Parsing de `#tag` inline + painel de tags. `[[links]]` entre notas com autocomplete e painel de
backlinks. Propriedades mínimas (frontmatter: criado/atualizado, chave-valor customizada) —
deliberadamente menor que "tipos de nota/views customizáveis" do original para caber no MVP.
_Pronto quando:_ notas linkadas mostram backlinks corretamente; filtro por tag funciona; criação
de link via autocomplete só por teclado.

**Fase 8 — Polimento MVP e checklist de release**
Passe completo de acessibilidade (axe-core zero violações críticas, roteiro de teclado cobrindo
cada tela). Passe responsivo nos breakpoints definidos + smoke test em dispositivo real.
Onboarding/estados vazios/erros (permissão negada, navegador sem suporte, workspace
desconectado). Tela de Settings consolidando tema, atalhos (lista lida do registro
`useShortcuts` da Fase 3), gestão de workspace. Teste de performance com fixture de ~500 notas.
_Pronto quando:_ regressão manual + automatizada completa passa; tag `v0.1.0-mvp`.

**Explicitamente fora do roadmap do MVP (documentado em `CLAUDE.md` + ADRs):**
Git Sync (milestone pós-MVP), recursos de IA (fora de escopo), app iOS/nativo, tipos de
nota/views customizáveis, anotação de vídeo, diagramas Mermaid, LaTeX — podem virar milestones
depois do MVP validado, se o usuário decidir.

---

## Verificação

- Cada fase tem seu próprio critério de "pronto" (acima), combinando teste automatizado
  (Vitest/Playwright/axe) + verificação manual.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` deve passar a cada fase antes de
  avançar.
- Testes de teclado são scripts Playwright que **não usam clique nenhum**, só
  `page.keyboard.press`, cobrindo o fluxo ponta a ponta da fase.
- Testes de responsividade rodam em viewports 375×667 (mobile), 768×1024 (tablet) e 1280×800
  (desktop).
- Ao final da Fase 0, a skill `octarine-architecture-guardrail` deve ser testada manualmente
  (invocada e conferido que ela de fato relê e reafirma o estado do roadmap).

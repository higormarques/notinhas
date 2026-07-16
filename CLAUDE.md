# CLAUDE.md — notinhas

Fonte única de verdade para qualquer sessão de IA trabalhando neste repositório. Leia isto
(e `docs/roadmap.md` para saber a fase atual) antes de escrever qualquer código. Em caso de
dúvida ou conflito, **este arquivo e `docs/architecture.md` têm precedência sobre suposições
genéricas** de como um projeto Vue costuma ser estruturado.

## O que é este projeto

Clone das principais features do Octarine (app de notas/PKM local-first, Markdown puro): editor
WYSIWYG, journaling diário vinculado a calendário (Daily Desk), navegação por árvore de arquivos,
paleta de comandos, busca, tags/links. Análise completa das features originais em
`analise-octarine.md`. Plano de fases completo em `PLANO.md`. Estado atual da entrega em
`docs/roadmap.md` — **sempre confira a fase atual ali antes de começar trabalho novo.**

## Stack e versões (ver `package.json` para exato)

- Vite + Vue 3 (`<script setup>`, Composition API) + TypeScript estrito
- Pinia 4 — estado de UI/cliente
- `@tanstack/vue-query` 5 — camada assíncrona sobre o filesystem local
- shadcn-vue (sobre Reka UI 2) + Tailwind CSS 4 — componentes gerados via CLI
- Tiptap 3 (ProseMirror) + `@tiptap/markdown` — editor WYSIWYG (Fase 4)
- `chrono-node` (locale `pt`) — parser de Smart Dates da paleta de comandos (Fase 5)
- vue-router 5, pnpm, ESLint (flat config) + Prettier, Vitest + @vue/test-utils,
  Playwright + `@axe-core/playwright`

## Comandos

```
pnpm dev            # servidor de desenvolvimento
pnpm build           # typecheck (vue-tsc) + build de produção
pnpm typecheck        # vue-tsc --noEmit
pnpm lint / lint:fix  # eslint
pnpm format / format:check  # prettier
pnpm test             # vitest run (unitário)
pnpm test:watch       # vitest em watch mode
pnpm test:e2e         # playwright (mobile/tablet/desktop configurados em playwright.config.ts)
```

`pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` deve passar antes de qualquer fase
ser considerada concluída.

## Mapa de pastas

```
src/
  app/            # shell (AppShell.vue), router, providers (Pinia, VueQuery montados em main.ts)
  entities/       # tipos/funções de domínio: Workspace (Fase 1), DailyNote (Fase 5 — path,
                  # parsing, migração de tarefas, Smart Dates). Tag chega na Fase 7 —
                  # árvore/CRUD de nota (Fase 2) usa DirectoryEntry do StorageAdapter, não
                  # precisou de um tipo Note dedicado
  features/       # workspace-connect, file-tree, note-editor, command-palette,
                  # daily-desk, search, tags-links, settings
                  # cada feature: ComponentName.vue + useComponentName.ts colocados
  shared/
    storage/      # StorageAdapter + FileSystemAccessAdapter + OPFSAdapter (chega na Fase 1)
    ui/           # componentes shadcn-vue gerados — NUNCA editar à mão além do necessário,
                  # regenerar/adicionar via `pnpm dlx shadcn-vue@latest add <componente>`
    composables/  # useBreakpoint, useTheme, useShortcuts (Fase 3+), useDebounce
    stores/       # Pinia stores transversais (ui, workspace na Fase 1)
docs/
  architecture.md
  roadmap.md
  adr/
.claude/
  skills/
```

## Regra rígida: View + Composable colocado

**Todo componente `.vue` contém apenas template e ligação mínima.** O bloco
`<script setup>` de um `.vue` só pode:

- importar e chamar um único composable `useNomeDoComponente()`
- desestruturar o que o template consome
- importar componentes de UI (shadcn-vue, ícones)

**Nunca dentro de um `.vue`:** chamadas a `useQuery`/`useMutation` do TanStack Query, acesso
direto a uma store Pinia, chamadas ao `StorageAdapter`, lógica de negócio, cálculo derivado
não trivial ou efeitos manuais.

Toda essa lógica vive em `useNomeDoComponente.ts`, **colocado no mesmo diretório** do
componente — ex: `FileTree.vue` + `useFileTree.ts`, `NoteEditor.vue` + `useNoteEditor.ts`,
`AppShell.vue` + `useAppShell.ts` (ver exemplo já implementado em `src/app/`). O composable
expõe uma interface enxuta (refs/computed/funções) que o `.vue` consome.

Isso é reforçado por lint (`eslint.config.js` bane `import ... from '@tanstack/vue-query'`,
`from 'pinia'` e `from '@/shared/storage/*'` dentro de arquivos `.vue`) e é item obrigatório do
checklist de Definition of Done de toda fase — nenhuma feature é considerada pronta com lógica
de negócio dentro do `<script setup>` do `.vue`.

## Fronteira Pinia vs TanStack Query

- **Pinia**: estado de UI/cliente que não vem do filesystem — workspace ativo, nota ativa,
  painéis abertos, tema, contexto de foco/teclado. Nunca guarda conteúdo de arquivo nem é fonte
  de verdade de dados.
- **TanStack Query**: toda leitura/escrita de arquivo é tratada como "chamada de API" via
  `StorageAdapter`, com query keys `['directory', path]`, `['file', path]`, `['daily', date]`.
  Cache, invalidação em mutations, refetch-on-focus/visibility (substituto de filesystem watch
  real — ver ADR 0004). Nunca duplicar esse estado numa store Pinia.

## Contrato do `StorageAdapter`

Interface única (`listDirectory`, `readFile`, `writeFile`, `createDirectory`, `deleteFile`,
`rename`) com duas implementações por feature-detection: `FileSystemAccessAdapter`
(`showDirectoryPicker` + `FileSystemDirectoryHandle`, handle persistido via
IndexedDB/`idb-keyval`) e `OPFSAdapter` (fallback via `navigator.storage.getDirectory()`, com
banner de aviso). Nenhum código de feature deve chamar a File System Access API ou OPFS
diretamente — sempre via `StorageAdapter` injetado/importado de `shared/storage`.
`createDirectory` foi adicionado na Fase 2 (ver ADR 0005) — `deleteFile` já serve tanto para
arquivo quanto pasta (`removeEntry` recursivo), não existe `deleteDirectory` separado. Detalhe
completo em `docs/architecture.md`.

## Definition of Done — teclado e responsividade (todas as fases, sem exceção)

- [ ] Todo fluxo novo é alcançável e operável 100% via teclado (roving tabindex em listas/árvores,
      focus trap em modais — Reka UI já cobre boa parte disso).
- [ ] Teste Playwright cobrindo o fluxo só com `page.keyboard.press`, sem clique nenhum.
- [ ] Testado/passa em 375×667 (mobile), 768×1024 (tablet) e 1280×800 (desktop) —
      `playwright.config.ts` já define esses 3 projects.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` passam.
- [ ] Nenhuma violação crítica no `@axe-core/playwright`.
- [ ] Nenhuma lógica de negócio dentro de um `.vue` (ver regra acima).
- [ ] **Não fazer verificação manual num navegador real** (não abrir `pnpm dev` num browser nem
      usar ferramentas de automação de browser para "conferir visualmente"). A cobertura de
      teclado/responsividade/acessibilidade é inteiramente via Vitest + Playwright automatizado
      (mockando `showDirectoryPicker` como já é feito em `e2e/mockWorkspace.ts`) — isso já é
      suficiente para considerar uma fase pronta.

## Fora de escopo agora — não adiantar trabalho

- **Git Sync**: milestone pós-MVP. Não implementar nem projetar a UI para isso ainda (ADR 0002).
- **Recursos de IA**: fora de escopo do clone inteiro (ADR 0003).
- App iOS/nativo, tipos de nota/views customizáveis, anotação de vídeo, diagramas Mermaid,
  LaTeX: podem virar milestones depois do MVP validado, não antes.
- Filesystem watch nativo: o navegador não expõe essa API por segurança. Não prometer
  atualização instantânea de edições externas — o substituto é refetch em foco/visibilidade da
  aba (ADR 0004). Não é um bug a ser "corrigido".

## Antes de escrever código

1. Confira a fase atual em `docs/roadmap.md`.
2. Se a tarefa é uma feature nova, use a skill `octarine-architecture-guardrail` primeiro.
3. Se precisar de um componente de UI novo, use a skill `octarine-ui-component` (nunca escreva
   primitivos de shadcn-vue à mão).
4. Se uma decisão arquitetural não trivial surgir, registre um ADR com a skill `octarine-adr`
   em vez de decidir silenciosamente.

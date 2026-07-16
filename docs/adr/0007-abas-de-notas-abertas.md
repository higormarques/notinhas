# 0007 — Abas de notas abertas (`useNotesStore` vira lista de abas)

- **Status:** aceita
- **Data:** 2026-07-16

## Contexto

Até aqui `useNotesStore` guardava só `activeNotePath: string | null` — uma única nota "ativa"
por vez. Abrir outra nota (pela árvore, Daily Desk, paleta, busca, backlinks, tags ou um
`[[doclink]]`) sempre substituía essa referência, sem histórico do que já tinha sido visitado.

O usuário pediu explicitamente uma feature de abas: cada nota aberta ganha sua própria aba,
permitindo alternar entre várias notas abertas simultaneamente, com só uma visível por vez. Essa
feature não consta em nenhuma fase do `PLANO.md`/`docs/roadmap.md` — é um pedido novo em cima do
MVP já entregue (Fases 0–7 concluídas), no mesmo espírito dos itens já registrados como
"revisado depois da Fase X" no roadmap (ex.: drag-and-drop na árvore de arquivos).

## Decisão

`useNotesStore` passa a expor `openTabs: string[]` (caminhos das notas abertas, na ordem em que
foram abertas) além de `activeNotePath: string | null` (qual aba está visível). Contrato novo:

- `openNote(path)` — comportamento estendido: se `path` já está em `openTabs`, só troca
  `activeNotePath`; senão, adiciona ao fim de `openTabs` **e** troca `activeNotePath`. Toda
  chamada existente (`file-tree`, `daily-desk`, `command-palette`, `search`, `tags-panel`,
  `backlinks-panel`, `docLinkExtension`) continua funcionando sem mudança de assinatura.
- `closeTab(path)` — nova função: remove `path` de `openTabs`; se era a aba ativa, ativa a aba
  vizinha (mesmo índice, ou a última restante), ou `null` se não sobrar nenhuma.
- `closeActiveNote()` — mantida como atalho para `closeTab(activeNotePath.value)`, usada quando
  o arquivo da nota ativa é apagado.
- `renameTab(fromPath, toPath)` — nova função: renomeia uma entrada de `openTabs` (e
  `activeNotePath`, se for o caso) sem reordenar a lista nem trocar qual aba está ativa.

Feature nova `note-tabs` (`NoteTabs.vue` + `useNoteTabs.ts`) renderiza a tira de abas acima do
`NoteEditor`, reaproveitando o padrão de roving tabindex já estabelecido em `file-tree`: um
`role="tablist"` com `role="tab"` por aba, um único `tabindex="0"` por vez, `ArrowLeft`/
`ArrowRight` move o foco, `Enter`/`Espaço` ativa a aba focada, `Delete`/`Backspace` fecha a aba
focada. Fechar não precisa de diálogo de confirmação — não apaga o arquivo, só remove a aba.

`file-tree/useFileTree.ts` (`confirmDelete`, `moveEntry`) passa a iterar **todas** as abas
abertas (`notesStore.openTabs`) que estão dentro do caminho apagado/renomeado, não só a nota
ativa — antes só a nota ativa era fechada/remapeada ao apagar/mover uma pasta; com abas, uma
nota aberta numa aba em background dentro dessa pasta também precisa ser fechada/remapeada.

## Motivo

- **`openNote(path)` manter a mesma assinatura**: evita tocar em 7 arquivos consumidores
  (`file-tree`, `daily-desk`, `command-palette`, `search`, `tags-panel`, `backlinks-panel`,
  `docLinkExtension`) só para acomodar abas — "abrir uma nota" continua sendo o mesmo verbo,
  agora com o efeito colateral de garantir que ela tem uma aba.
- **Reaproveitar o padrão de roving tabindex do `file-tree`** em vez do componente `Tabs`
  (shadcn-vue/Reka UI) já presente em `shared/ui/tabs/`: esse componente não tem um slot pronto
  para um botão de fechar por aba sem quebrar o padrão de foco por roving tabindex do próprio
  Reka UI Tabs (ativação automática ao mover seta, sem Enter) — inconsistente com o padrão de
  ativação manual (seta move foco, Enter ativa) já usado em `file-tree` e que este ADR decide
  manter para as abas de notas também, por consistência de interação dentro do app.
- **Fechar sem diálogo de confirmação**: diferente de excluir um arquivo (`file-tree`, que usa
  diálogo porque é destrutivo e irreversível), fechar uma aba não afeta o arquivo no disco — é
  puramente estado de UI, então uma confirmação seria fricção sem benefício.
- **Sem ADR bloqueando a falta de fase no roadmap**: a feature não estava planejada, mas não
  colide com nenhum item explicitamente fora de escopo (Git Sync — ADR 0002, IA — ADR 0003) nem
  antecipa uma fase futura formal; é aceita como extensão pós-MVP, documentada aqui e no
  roadmap.

## Consequências

- `docs/architecture.md`, tabela de stores Pinia: `useNotesStore` deixa de ser descrita como "só
  guarda o path da nota ativa" — passa a guardar `openTabs` (lista de paths) + `activeNotePath`
  (qual delas está visível). Continua **nunca** guardando conteúdo de arquivo.
- Qualquer código futuro que precise saber "quais notas estão abertas" (não só "qual está
  visível") deve ler `notesStore.openTabs`, não inventar um estado paralelo.
- `docs/roadmap.md` ganha uma entrada "revisado depois da Fase 7" documentando esta extensão,
  seguindo o padrão já usado para a Fase 2.

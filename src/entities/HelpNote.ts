/** Nota de ajuda do próprio app — sempre na raiz do workspace. Pertence ao "core" do app
 * (conteúdo embutido no bundle, ver `features/help/helpNoteWriter.ts`): escondida da árvore de
 * arquivos, mesmo tratamento de `DAILY_DIRECTORY` (`entities/DailyNote.ts`) para a pasta
 * `Daily/`. Ficar fora da árvore também é o que a torna impossível de apagar/renomear pela UI —
 * a única ação de excluir/renomear do app é a da árvore de arquivos. */
export const HELP_NOTE_PATH = 'Guia do notinhas.md'

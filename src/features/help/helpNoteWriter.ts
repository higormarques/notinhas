import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { HELP_NOTE_PATH } from '@/entities/HelpNote'
import helpGuideContent from '../../../docs/guia-do-usuario.md?raw'

export { HELP_NOTE_PATH }

async function noteExists(path: string): Promise<boolean> {
  try {
    await getStorageAdapter().readFile(path)
    return true
  } catch {
    return false
  }
}

/** Cria a nota de ajuda na raiz do workspace se ainda não existir (conteúdo embutido no bundle
 * via `docs/guia-do-usuario.md`, a mesma documentação mantida no repositório). Retorna o caminho
 * (existente ou recém-criado), pronto para `useNotesStore().openNote(path)` — mesmo padrão de
 * `openOrCreateDailyNote` em `daily-desk/dailyNoteWriter.ts`. Não sobrescreve uma nota já
 * existente: se o usuário editar ou apagar a nota de ajuda, ela só volta a ser recriada depois de
 * apagada. */
export async function openOrCreateHelpNote(): Promise<string> {
  if (await noteExists(HELP_NOTE_PATH)) return HELP_NOTE_PATH
  await getStorageAdapter().writeFile(HELP_NOTE_PATH, helpGuideContent)
  return HELP_NOTE_PATH
}

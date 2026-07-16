import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import {
  buildMigratedNoteContent,
  DAILY_DIRECTORY,
  dailyNotePath,
  dateFromDailyNoteFilename,
  extractIncompleteTaskLines,
  formatIsoDate,
  mostRecentDateBefore,
  removeIncompleteTaskLines,
} from '@/entities/DailyNote'

export { DAILY_DIRECTORY }

export async function listDailyDates(): Promise<string[]> {
  try {
    const entries = await getStorageAdapter().listDirectory(DAILY_DIRECTORY)
    return entries
      .filter((entry) => entry.kind === 'file')
      .map((entry) => dateFromDailyNoteFilename(entry.name))
      .filter((date): date is string => date !== null)
  } catch {
    return []
  }
}

async function noteExists(path: string): Promise<boolean> {
  try {
    await getStorageAdapter().readFile(path)
    return true
  } catch {
    return false
  }
}

/** Cria a nota diária de `date` se ainda não existir. Ao criar a nota de hoje, migra as tarefas
 * incompletas da nota diária anterior mais recente para dentro dela. Retorna o caminho da nota
 * (existente ou recém-criada), pronto para `useNotesStore().openNote(path)`. Compartilhado entre
 * `daily-desk` (seleção no calendário) e `command-palette` ("Ir para data") para não duplicar a
 * lógica de migração. */
export async function openOrCreateDailyNote(date: string): Promise<string> {
  const path = dailyNotePath(date)
  if (await noteExists(path)) return path

  let content = ''
  if (date === formatIsoDate()) {
    const existingDates = await listDailyDates()
    const priorDate = mostRecentDateBefore(existingDates, date)
    if (priorDate) {
      const priorPath = dailyNotePath(priorDate)
      const priorContent = await getStorageAdapter().readFile(priorPath)
      const migratedLines = extractIncompleteTaskLines(priorContent)
      if (migratedLines.length > 0) {
        await getStorageAdapter().writeFile(priorPath, removeIncompleteTaskLines(priorContent))
        content = buildMigratedNoteContent({
          targetContent: '',
          migratedTaskLines: migratedLines,
          fromDate: priorDate,
        })
      }
    }
  }

  await getStorageAdapter().writeFile(path, content)
  return path
}

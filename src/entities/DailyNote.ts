import { pt } from 'chrono-node'
import { parseFrontmatter } from './Frontmatter'

/** Pasta onde as notas diárias vivem — também usada para escondê-la da árvore de arquivos
 * (`file-tree`), já que a navegação por essas notas é feita pelo Daily Desk e pela paleta de
 * comandos, não pela árvore. */
export const DAILY_DIRECTORY = 'Daily'
const DAILY_DIR = DAILY_DIRECTORY
const DAILY_FILENAME_PATTERN = /^(\d{4}-\d{2}-\d{2})\.md$/
const INCOMPLETE_TASK_LINE_PATTERN = /^\s*[-*]\s\[\s\]\s/

export function dailyNotePath(date: string): string {
  return `${DAILY_DIR}/${date}.md`
}

/** Extrai a data (`YYYY-MM-DD`) do nome de um arquivo dentro de `Daily/`, ou `null` se não bater
 * com a convenção (ex.: um arquivo qualquer que o usuário tenha colocado ali manualmente). */
export function dateFromDailyNoteFilename(filename: string): string | null {
  return DAILY_FILENAME_PATTERN.exec(filename)?.[1] ?? null
}

/** Formata uma data como `YYYY-MM-DD` em horário local — usada tanto para "hoje" quanto para
 * formatar o resultado de `parseSmartDate`. */
export function formatIsoDate(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear()
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0')
  const day = String(referenceDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Interpreta datas "inteligentes" em português ("hoje", "ontem", "próxima sexta", datas
 * explícitas como `20/07/2026`) via chrono-node (locale `pt`, modo casual). Retorna `null` para
 * texto que não parece uma data — usado pela paleta de comandos para só oferecer a entrada
 * "Ir para data" quando o texto digitado realmente resolve para uma data. */
export function parseSmartDate(
  input: string,
  referenceDate: Date = new Date(),
): string | null {
  const trimmed = input.trim()
  if (trimmed.length === 0) return null
  const parsed = pt.casual.parseDate(trimmed, referenceDate)
  return parsed ? formatIsoDate(parsed) : null
}

/** Data com maior string (convenção `YYYY-MM-DD` ordena lexicograficamente) anterior a `date`,
 * ou `null` se não houver nenhuma. */
export function mostRecentDateBefore(dates: string[], date: string): string | null {
  return (
    dates
      .filter((candidate) => candidate < date)
      .sort()
      .at(-1) ?? null
  )
}

export function extractIncompleteTaskLines(content: string): string[] {
  return content.split('\n').filter((line) => INCOMPLETE_TASK_LINE_PATTERN.test(line))
}

export function countIncompleteTasks(content: string): number {
  return extractIncompleteTaskLines(content).length
}

/** Uma nota diária é considerada vazia quando seu corpo (frontmatter à parte — `criado`/
 * `atualizado` não contam como conteúdo) não tem nenhum caractere não-whitespace. Usada pelo
 * indicador visual do Daily Desk: um dia cuja nota só foi criada (ex.: visitada no calendário,
 * mas nunca recebeu texto) deve aparecer sem o ponto, no mesmo estado visual de um dia sem nota
 * nenhuma. */
export function isDailyNoteContentEmpty(content: string): boolean {
  return parseFrontmatter(content).body.trim().length === 0
}

export function removeIncompleteTaskLines(content: string): string {
  return content
    .split('\n')
    .filter((line) => !INCOMPLETE_TASK_LINE_PATTERN.test(line))
    .join('\n')
}

/** Monta o conteúdo da nota diária de hoje com as tarefas incompletas migradas de `fromDate`
 * prefixadas num bloco próprio, antes do conteúdo (vazio) já existente. */
export function buildMigratedNoteContent(params: {
  targetContent: string
  migratedTaskLines: string[]
  fromDate: string
}): string {
  const { targetContent, migratedTaskLines, fromDate } = params
  if (migratedTaskLines.length === 0) return targetContent

  const block = [`## Migrado de ${fromDate}`, ...migratedTaskLines].join('\n')
  const trimmedTarget = targetContent.trim()
  return trimmedTarget.length > 0 ? `${block}\n\n${trimmedTarget}\n` : `${block}\n`
}

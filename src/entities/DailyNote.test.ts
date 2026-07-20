import { describe, expect, it } from 'vitest'
import {
  buildMigratedNoteContent,
  countIncompleteTasks,
  dailyNotePath,
  dateFromDailyNoteFilename,
  extractIncompleteTaskLines,
  formatIsoDate,
  isDailyNoteContentEmpty,
  mostRecentDateBefore,
  parseSmartDate,
  removeIncompleteTaskLines,
} from './DailyNote'

describe('dailyNotePath', () => {
  it('builds the Daily/YYYY-MM-DD.md convention path', () => {
    expect(dailyNotePath('2026-07-15')).toBe('Daily/2026-07-15.md')
  })
})

describe('dateFromDailyNoteFilename', () => {
  it('extracts the date from a valid daily note filename', () => {
    expect(dateFromDailyNoteFilename('2026-07-15.md')).toBe('2026-07-15')
  })

  it('returns null for filenames that do not match the convention', () => {
    expect(dateFromDailyNoteFilename('notas-soltas.md')).toBeNull()
    expect(dateFromDailyNoteFilename('2026-07-15.txt')).toBeNull()
  })
})

describe('formatIsoDate', () => {
  it('formats a date as YYYY-MM-DD with zero-padding', () => {
    expect(formatIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('parseSmartDate', () => {
  const reference = new Date(2026, 6, 15, 12, 0, 0) // quarta-feira, 15 de julho de 2026

  it('resolves "hoje" to the reference date', () => {
    expect(parseSmartDate('hoje', reference)).toBe('2026-07-15')
  })

  it('resolves "ontem" and "amanhã" relative to the reference date', () => {
    expect(parseSmartDate('ontem', reference)).toBe('2026-07-14')
    expect(parseSmartDate('amanhã', reference)).toBe('2026-07-16')
  })

  it('resolves a relative weekday like "próxima sexta"', () => {
    expect(parseSmartDate('próxima sexta', reference)).toBe('2026-07-17')
  })

  it('resolves explicit dates', () => {
    expect(parseSmartDate('20/07/2026', reference)).toBe('2026-07-20')
    expect(parseSmartDate('2026-07-20', reference)).toBe('2026-07-20')
  })

  it('returns null for text that is not a date', () => {
    expect(parseSmartDate('Ideia nova', reference)).toBeNull()
    expect(parseSmartDate('', reference)).toBeNull()
  })
})

describe('mostRecentDateBefore', () => {
  it('returns the closest earlier date', () => {
    expect(
      mostRecentDateBefore(['2026-07-01', '2026-07-10', '2026-07-20'], '2026-07-15'),
    ).toBe('2026-07-10')
  })

  it('ignores dates on or after the reference date', () => {
    expect(mostRecentDateBefore(['2026-07-15', '2026-07-20'], '2026-07-15')).toBeNull()
  })

  it('returns null when there are no earlier dates', () => {
    expect(mostRecentDateBefore([], '2026-07-15')).toBeNull()
  })
})

describe('isDailyNoteContentEmpty', () => {
  it('treats an empty string as empty', () => {
    expect(isDailyNoteContentEmpty('')).toBe(true)
  })

  it('treats whitespace-only content as empty', () => {
    expect(isDailyNoteContentEmpty('   \n\n\t')).toBe(true)
  })

  it('treats a note with only frontmatter and no body as empty', () => {
    expect(isDailyNoteContentEmpty('---\ncriado: 2026-07-15T12:00:00.000Z\n---\n')).toBe(
      true,
    )
  })

  it('treats a note with real body text as non-empty', () => {
    expect(isDailyNoteContentEmpty('# Hoje\nalgo escrito')).toBe(false)
  })

  it('treats a note with body text alongside frontmatter as non-empty', () => {
    expect(
      isDailyNoteContentEmpty('---\ncriado: 2026-07-15T12:00:00.000Z\n---\nalgo escrito'),
    ).toBe(false)
  })
})

describe('extractIncompleteTaskLines / countIncompleteTasks', () => {
  const content = [
    '# Hoje',
    '- [ ] tarefa pendente um',
    '- [x] tarefa concluída',
    '- [ ] tarefa pendente dois',
    '* [ ] tarefa com marcador asterisco',
    'texto qualquer',
  ].join('\n')

  it('extracts only unchecked task lines, keeping their markdown syntax', () => {
    expect(extractIncompleteTaskLines(content)).toEqual([
      '- [ ] tarefa pendente um',
      '- [ ] tarefa pendente dois',
      '* [ ] tarefa com marcador asterisco',
    ])
  })

  it('counts unchecked task lines', () => {
    expect(countIncompleteTasks(content)).toBe(3)
  })
})

describe('removeIncompleteTaskLines', () => {
  it('removes unchecked task lines while keeping the rest of the content', () => {
    const content = '# Hoje\n- [ ] pendente\n- [x] feita\ntexto qualquer'
    expect(removeIncompleteTaskLines(content)).toBe('# Hoje\n- [x] feita\ntexto qualquer')
  })
})

describe('buildMigratedNoteContent', () => {
  it('returns the target content unchanged when there is nothing to migrate', () => {
    expect(
      buildMigratedNoteContent({
        targetContent: '',
        migratedTaskLines: [],
        fromDate: '2026-07-14',
      }),
    ).toBe('')
  })

  it('prefixes a heading and the migrated tasks onto an empty note', () => {
    const result = buildMigratedNoteContent({
      targetContent: '',
      migratedTaskLines: ['- [ ] revisar PR', '- [ ] responder email'],
      fromDate: '2026-07-14',
    })
    expect(result).toBe(
      '## Migrado de 2026-07-14\n- [ ] revisar PR\n- [ ] responder email\n',
    )
  })

  it('keeps existing target content below the migrated block', () => {
    const result = buildMigratedNoteContent({
      targetContent: '# Hoje\nalgo já escrito',
      migratedTaskLines: ['- [ ] revisar PR'],
      fromDate: '2026-07-14',
    })
    expect(result).toBe(
      '## Migrado de 2026-07-14\n- [ ] revisar PR\n\n# Hoje\nalgo já escrito\n',
    )
  })
})

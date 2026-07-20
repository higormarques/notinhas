import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  listDailyDates,
  listDatesWithContent,
  openOrCreateDailyNote,
} from './dailyNoteWriter'
import * as storageAdapterModule from '@/shared/storage/createStorageAdapter'
import type { StorageAdapter } from '@/shared/storage/StorageAdapter'

vi.mock('@/shared/storage/createStorageAdapter', () => ({
  getStorageAdapter: vi.fn(),
}))

function createFakeAdapter(initialFiles: Record<string, string> = {}): StorageAdapter {
  const files = new Map(Object.entries(initialFiles))

  return {
    listDirectory: vi.fn(async (path: string) => {
      const prefix = `${path}/`
      const names = Array.from(files.keys())
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(prefix.length))
      if (names.length === 0) throw new Error(`not found: ${path}`)
      return names.map((name) => ({
        name,
        path: `${path}/${name}`,
        kind: 'file' as const,
      }))
    }),
    readFile: vi.fn(async (path: string) => {
      const value = files.get(path)
      if (value === undefined) throw new Error(`not found: ${path}`)
      return value
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content)
    }),
    createDirectory: vi.fn(async () => {}),
    deleteFile: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
  }
}

function mockToday(isoDate: string) {
  vi.setSystemTime(new Date(`${isoDate}T12:00:00`))
}

describe('listDailyDates', () => {
  it('returns an empty list when the Daily folder does not exist yet', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(createFakeAdapter())
    expect(await listDailyDates()).toEqual([])
  })

  it('lists only files matching the YYYY-MM-DD.md convention', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({ 'Daily/2026-07-10.md': '', 'Daily/notas-soltas.md': '' }),
    )
    expect(await listDailyDates()).toEqual(['2026-07-10'])
  })
})

describe('listDatesWithContent', () => {
  it('excludes dates whose note is empty', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({
        'Daily/2026-07-10.md': 'algo escrito',
        'Daily/2026-07-11.md': '',
        'Daily/2026-07-12.md': '   \n',
      }),
    )
    expect(await listDatesWithContent()).toEqual(['2026-07-10'])
  })

  it('excludes a date whose note only has frontmatter and no body', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({
        'Daily/2026-07-10.md': '---\ncriado: 2026-07-10T12:00:00.000Z\n---\n',
      }),
    )
    expect(await listDatesWithContent()).toEqual([])
  })

  it('returns an empty list when the Daily folder does not exist yet', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(createFakeAdapter())
    expect(await listDatesWithContent()).toEqual([])
  })
})

describe('openOrCreateDailyNote', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockToday('2026-07-15')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the path of an already-existing note without rewriting it', async () => {
    const adapter = createFakeAdapter({ 'Daily/2026-07-10.md': 'conteúdo existente' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)

    const path = await openOrCreateDailyNote('2026-07-10')

    expect(path).toBe('Daily/2026-07-10.md')
    expect(adapter.writeFile).not.toHaveBeenCalled()
  })

  it('creates an empty note for a non-today date with no prior note', async () => {
    const adapter = createFakeAdapter()
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)

    const path = await openOrCreateDailyNote('2026-07-20')

    expect(path).toBe('Daily/2026-07-20.md')
    expect(adapter.writeFile).toHaveBeenCalledWith('Daily/2026-07-20.md', '')
  })

  it("migrates incomplete tasks into today's note from the most recent prior daily note", async () => {
    const adapter = createFakeAdapter({
      'Daily/2026-07-13.md': '- [ ] revisar PR\n- [x] feita',
    })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)

    const path = await openOrCreateDailyNote('2026-07-15')

    expect(path).toBe('Daily/2026-07-15.md')
    expect(adapter.writeFile).toHaveBeenCalledWith('Daily/2026-07-13.md', '- [x] feita')
    expect(adapter.writeFile).toHaveBeenCalledWith(
      'Daily/2026-07-15.md',
      '## Migrado de 2026-07-13\n- [ ] revisar PR\n',
    )
  })
})

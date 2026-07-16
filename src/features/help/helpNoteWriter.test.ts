import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HELP_NOTE_PATH, openOrCreateHelpNote } from './helpNoteWriter'
import * as storageAdapterModule from '@/shared/storage/createStorageAdapter'
import type { StorageAdapter } from '@/shared/storage/StorageAdapter'

vi.mock('@/shared/storage/createStorageAdapter', () => ({
  getStorageAdapter: vi.fn(),
}))

function createFakeAdapter(initialFiles: Record<string, string> = {}): StorageAdapter {
  const files = new Map(Object.entries(initialFiles))

  return {
    listDirectory: vi.fn(async () => []),
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

describe('openOrCreateHelpNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates the help note with non-empty content when it does not exist yet', async () => {
    const adapter = createFakeAdapter()
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)

    const path = await openOrCreateHelpNote()

    expect(path).toBe(HELP_NOTE_PATH)
    expect(adapter.writeFile).toHaveBeenCalledTimes(1)
    const [writtenPath, writtenContent] = vi.mocked(adapter.writeFile).mock.calls[0]
    expect(writtenPath).toBe(HELP_NOTE_PATH)
    expect(writtenContent.length).toBeGreaterThan(0)
  })

  it('returns the existing path without overwriting a help note the user already edited', async () => {
    const adapter = createFakeAdapter({ [HELP_NOTE_PATH]: 'edição do usuário' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)

    const path = await openOrCreateHelpNote()

    expect(path).toBe(HELP_NOTE_PATH)
    expect(adapter.writeFile).not.toHaveBeenCalled()
  })
})

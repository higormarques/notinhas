import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCommandPalette } from './useCommandPalette'
import { useNotesStore } from '@/shared/stores/notes'
import * as storageAdapterModule from '@/shared/storage/createStorageAdapter'
import type { DirectoryEntry, StorageAdapter } from '@/shared/storage/StorageAdapter'

vi.mock('@/shared/storage/createStorageAdapter', () => ({
  getStorageAdapter: vi.fn(),
}))

function createFakeAdapter(initialFiles: Record<string, string> = {}): StorageAdapter {
  const files = new Map<string, string>(Object.entries(initialFiles))

  function listChildren(path: string): DirectoryEntry[] {
    const prefix = path ? `${path}/` : ''
    const byName = new Map<string, DirectoryEntry>()

    for (const filePath of files.keys()) {
      if (!filePath.startsWith(prefix)) continue
      const rest = filePath.slice(prefix.length)
      const [first] = rest.split('/')
      if (rest.includes('/')) {
        byName.set(first, { name: first, path: prefix + first, kind: 'directory' })
      } else {
        byName.set(first, { name: first, path: filePath, kind: 'file' })
      }
    }

    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  return {
    listDirectory: vi.fn(async (path: string) => listChildren(path)),
    readFile: vi.fn(async (path: string) => {
      const content = files.get(path)
      if (content === undefined) throw new Error(`not found: ${path}`)
      return content
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content)
    }),
    createDirectory: vi.fn(),
    deleteFile: vi.fn(),
    rename: vi.fn(),
  }
}

function inputEvent(value: string): Event {
  return { target: { value } } as unknown as Event
}

let queryClient: QueryClient

function mountComposable() {
  let result!: ReturnType<typeof useCommandPalette>
  mount(
    defineComponent({
      setup() {
        result = useCommandPalette()
        return () => null
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } },
  )
  return result
}

describe('useCommandPalette', () => {
  let adapter: StorageAdapter

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    adapter = createFakeAdapter({
      'nota-raiz.md': '',
      'Projetos/ideia.md': '',
    })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
  })

  it('lists existing notes recursively once the palette is opened', async () => {
    const result = mountComposable()
    expect(result.notes.value).toEqual([])

    result.open()
    await flushPromises()

    expect(result.notes.value.map((note) => note.path).sort()).toEqual([
      'Projetos/ideia.md',
      'nota-raiz.md',
    ])
  })

  it('offers to create a note when no existing note matches the query', async () => {
    const result = mountComposable()
    result.open()
    await flushPromises()

    result.handleQueryInput(inputEvent('Nova nota'))
    expect(result.showCreateOption.value).toBe(true)
    expect(result.createLabel.value).toBe('Criar nota "Nova nota"')
  })

  it('does not offer to create a note that already exists', async () => {
    const result = mountComposable()
    result.open()
    await flushPromises()

    result.handleQueryInput(inputEvent('nota-raiz'))
    expect(result.showCreateOption.value).toBe(false)

    result.handleQueryInput(inputEvent('nota-raiz.md'))
    expect(result.showCreateOption.value).toBe(false)
  })

  it('creates the note at the workspace root, opens it, and closes the palette', async () => {
    const result = mountComposable()
    result.open()
    await flushPromises()

    result.handleQueryInput(inputEvent('Ideia nova'))
    await result.createNote()
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith('Ideia nova.md', '')
    expect(useNotesStore().activeNotePath).toBe('Ideia nova.md')
    expect(result.isOpen.value).toBe(false)
  })

  it('opens an existing note and closes the palette', async () => {
    const result = mountComposable()
    result.open()
    await flushPromises()

    result.selectNote('Projetos/ideia.md')

    expect(useNotesStore().activeNotePath).toBe('Projetos/ideia.md')
    expect(result.isOpen.value).toBe(false)
  })

  it('toggles the theme and closes the palette', async () => {
    const result = mountComposable()
    result.open()
    const before = result.theme.value

    result.runToggleTheme()

    expect(result.theme.value).not.toBe(before)
    expect(result.isOpen.value).toBe(false)

    result.runToggleTheme()
  })

  it('offers a smart date option when the query resolves to a date', async () => {
    const result = mountComposable()
    result.open()
    await flushPromises()

    result.handleQueryInput(inputEvent('2026-07-20'))
    expect(result.showSmartDateOption.value).toBe(true)
    expect(result.smartDateLabel.value).toBe('Ir para 2026-07-20')

    result.handleQueryInput(inputEvent('Ideia nova'))
    expect(result.showSmartDateOption.value).toBe(false)
  })

  it('goes to a smart date, creating the daily note and closing the palette', async () => {
    const result = mountComposable()
    result.open()
    await flushPromises()

    result.handleQueryInput(inputEvent('2026-07-20'))
    await result.goToSmartDate()
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith('Daily/2026-07-20.md', '')
    expect(useNotesStore().activeNotePath).toBe('Daily/2026-07-20.md')
    expect(result.isOpen.value).toBe(false)
  })

  it('closes the palette when jumping to the Daily Desk', () => {
    const result = mountComposable()
    result.open()

    result.openDailyDesk()

    expect(result.isOpen.value).toBe(false)
  })
})

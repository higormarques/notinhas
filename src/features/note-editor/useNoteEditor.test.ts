import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNoteEditor } from './useNoteEditor'
import { useNotesStore } from '@/shared/stores/notes'
import * as storageAdapterModule from '@/shared/storage/createStorageAdapter'
import type { StorageAdapter } from '@/shared/storage/StorageAdapter'

vi.mock('@/shared/storage/createStorageAdapter', () => ({
  getStorageAdapter: vi.fn(),
}))

function createFakeAdapter(initialFiles: Record<string, string> = {}): StorageAdapter {
  const files = new Map(Object.entries(initialFiles))

  const readFile = vi.fn(async (path: string) => {
    const value = files.get(path)
    if (value === undefined) throw new Error(`not found: ${path}`)
    return value
  })
  const writeFile = vi.fn(async (path: string, content: string) => {
    files.set(path, content)
  })

  return {
    listDirectory: vi.fn(async () => []),
    readFile,
    writeFile,
    createDirectory: vi.fn(async () => {}),
    deleteFile: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
  }
}

let queryClient: QueryClient

function mountComposable() {
  let result!: ReturnType<typeof useNoteEditor>
  mount(
    defineComponent({
      setup() {
        result = useNoteEditor()
        return () => null
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } },
  )
  return result
}

describe('useNoteEditor', () => {
  let adapter: StorageAdapter

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    adapter = createFakeAdapter({ 'nota.md': 'conteudo inicial' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the empty state when there is no active note', () => {
    const result = mountComposable()
    expect(result.isEmptyState.value).toBe(true)
  })

  it('loads the active note content', async () => {
    useNotesStore().openNote('nota.md')
    const result = mountComposable()
    await flushPromises()

    expect(result.isEmptyState.value).toBe(false)
    expect(result.content.value).toBe('conteudo inicial')
    expect(result.noteName.value).toBe('nota.md')
  })

  it('autosaves edits after the debounce window', async () => {
    useNotesStore().openNote('nota.md')
    const result = mountComposable()
    await flushPromises()

    result.content.value = 'conteudo editado'
    await vi.advanceTimersByTimeAsync(700)
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith('nota.md', 'conteudo editado')
    expect(result.saveStatus.value).toBe('saved')
  })

  it('does not write back unchanged content just from loading a note', async () => {
    useNotesStore().openNote('nota.md')
    const result = mountComposable()
    await flushPromises()

    await vi.advanceTimersByTimeAsync(700)
    await flushPromises()

    expect(adapter.writeFile).not.toHaveBeenCalled()
    expect(result.content.value).toBe('conteudo inicial')
  })
})

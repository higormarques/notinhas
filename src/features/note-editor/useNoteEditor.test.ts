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
  const wrapper = mount(
    defineComponent({
      setup() {
        result = useNoteEditor()
        return () => null
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } },
  )
  return { result, wrapper }
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
    const { result } = mountComposable()
    expect(result.isEmptyState.value).toBe(true)
  })

  it('loads the active note content into the editor as markdown', async () => {
    useNotesStore().openNote('nota.md')
    const { result } = mountComposable()
    await flushPromises()

    expect(result.isEmptyState.value).toBe(false)
    expect(result.noteName.value).toBe('nota.md')
    expect(result.editor.value?.getText()).toBe('conteudo inicial')
  })

  it('autosaves edits after the debounce window, serialized back to markdown', async () => {
    useNotesStore().openNote('nota.md')
    const { result } = mountComposable()
    await flushPromises()

    result.editor.value?.commands.setContent('conteudo inicial editado')
    await vi.advanceTimersByTimeAsync(700)
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith('nota.md', 'conteudo inicial editado')
    expect(result.saveStatus.value).toBe('saved')
  })

  it('round-trips headings and lists through markdown serialization', async () => {
    useNotesStore().openNote('nota.md')
    const { result } = mountComposable()
    await flushPromises()

    result.editor.value?.commands.setContent('# Título\n\n- item um\n- item dois', {
      contentType: 'markdown',
    })
    await vi.advanceTimersByTimeAsync(700)
    await flushPromises()

    const [savedPath, savedContent] = vi.mocked(adapter.writeFile).mock.calls[0]
    expect(savedPath).toBe('nota.md')
    expect(savedContent.trim()).toBe('# Título\n\n- item um\n- item dois')
  })

  it('does not write back unchanged content just from loading a note', async () => {
    useNotesStore().openNote('nota.md')
    const { result } = mountComposable()
    await flushPromises()

    await vi.advanceTimersByTimeAsync(700)
    await flushPromises()

    expect(adapter.writeFile).not.toHaveBeenCalled()
    expect(result.editor.value?.getText()).toBe('conteudo inicial')
  })

  it('finds and cycles through matches in the note', async () => {
    adapter = createFakeAdapter({ 'nota.md': 'gato cachorro gato passaro gato' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    useNotesStore().openNote('nota.md')
    const { result } = mountComposable()
    await flushPromises()

    result.findQuery.value = 'gato'
    await flushPromises()

    expect(result.findMatchCount.value).toBe(3)
    expect(result.findActiveIndex.value).toBe(0)

    result.findNext()
    expect(result.findActiveIndex.value).toBe(1)

    result.findNext()
    expect(result.findActiveIndex.value).toBe(2)

    result.findNext()
    expect(result.findActiveIndex.value).toBe(0)

    result.findPrevious()
    expect(result.findActiveIndex.value).toBe(2)
  })

  it('clears the search when closing find', async () => {
    adapter = createFakeAdapter({ 'nota.md': 'gato cachorro gato' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    useNotesStore().openNote('nota.md')
    const { result } = mountComposable()
    await flushPromises()

    result.openFind()
    result.findQuery.value = 'gato'
    await flushPromises()
    expect(result.findMatchCount.value).toBe(2)

    result.closeFind()

    expect(result.isFindOpen.value).toBe(false)
    expect(result.findQuery.value).toBe('')
    expect(result.findMatchCount.value).toBe(0)
  })
})

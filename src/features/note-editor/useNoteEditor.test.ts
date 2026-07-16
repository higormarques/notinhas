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

  it('debounces the autosave by exactly 300ms', async () => {
    useNotesStore().openNote('nota.md')
    const { result } = mountComposable()
    await flushPromises()

    result.editor.value?.commands.setContent('conteudo inicial editado')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(adapter.writeFile).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    expect(adapter.writeFile).toHaveBeenCalledWith('nota.md', 'conteudo inicial editado')
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

  describe('switching notes with a pending edit', () => {
    function createSlowReadAdapter(files: Record<string, string>) {
      const fakeAdapter = createFakeAdapter(files)
      const resolvers = new Map<string, (value: string) => void>()
      // Snapshot da implementação original antes de sobrescrevê-la — chamar `fakeAdapter.readFile`
      // a partir de dentro do próprio `mockImplementation` reentraria na versão nova (lenta), não
      // na original, já que é o mesmo objeto `vi.fn()`.
      const originalReadFile = vi.mocked(fakeAdapter.readFile).getMockImplementation()!
      vi.mocked(fakeAdapter.readFile).mockImplementation((path: string) => {
        if (!resolvers.has(path)) return originalReadFile(path)
        return new Promise((resolve) => {
          resolvers.set(path, resolve)
        })
      })
      return {
        adapter: fakeAdapter,
        originalReadFile,
        holdRead: (path: string) => resolvers.set(path, () => {}),
        resolveRead: (path: string, value: string) => resolvers.get(path)?.(value),
      }
    }

    it('clears the previous note\'s content immediately, instead of leaving it on screen while the new note loads', async () => {
      const slow = createSlowReadAdapter({ 'a.md': 'conteudo A', 'b.md': 'conteudo B' })
      vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(slow.adapter)
      useNotesStore().openNote('a.md')
      const { result } = mountComposable()
      await flushPromises()
      expect(result.editor.value?.getText()).toBe('conteudo A')

      slow.holdRead('b.md')
      useNotesStore().openNote('b.md')
      await flushPromises()

      expect(result.editor.value?.getText()).toBe('')

      slow.resolveRead('b.md', 'conteudo B')
      await flushPromises()
      expect(result.editor.value?.getText()).toBe('conteudo B')
    })

    it('saves a pending edit to its own note, never to the newly opened note\'s file, even if the debounce fires while the new note is still loading', async () => {
      const slow = createSlowReadAdapter({ 'a.md': 'conteudo A', 'b.md': 'conteudo B original' })
      vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(slow.adapter)
      useNotesStore().openNote('a.md')
      const { result } = mountComposable()
      await flushPromises()

      result.editor.value?.commands.setContent('conteudo A EDITADO')
      await flushPromises()

      slow.holdRead('b.md')
      useNotesStore().openNote('b.md')
      await flushPromises()

      // troca de nota já dispara o flush imediatamente, sem esperar o debounce natural
      expect(slow.adapter.writeFile).toHaveBeenCalledWith('a.md', 'conteudo A EDITADO')
      expect(slow.adapter.writeFile).not.toHaveBeenCalledWith('b.md', expect.anything())

      // mesmo que o debounce (que já foi cancelado pelo flush acima) tivesse disparado agora,
      // b.md continua intocado enquanto sua leitura ainda está pendente
      await vi.advanceTimersByTimeAsync(500)
      await flushPromises()
      expect(await slow.originalReadFile('b.md')).toBe('conteudo B original')

      slow.resolveRead('b.md', 'conteudo B original')
      await flushPromises()
      expect(result.editor.value?.getText()).toBe('conteudo B original')
    })
  })

  it('renders only its own content after rapidly switching through several notes', async () => {
    adapter = createFakeAdapter({ 'a.md': 'conteudo A', 'b.md': 'conteudo B' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    useNotesStore().openNote('a.md')
    const { result } = mountComposable()
    await flushPromises()

    useNotesStore().openNote('b.md')
    useNotesStore().openNote('a.md')
    await flushPromises()

    expect(result.editor.value?.getText()).toBe('conteudo A')
  })
})

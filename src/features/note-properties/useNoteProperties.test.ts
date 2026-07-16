import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNoteProperties } from './useNoteProperties'
import { useNotesStore } from '@/shared/stores/notes'
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

let queryClient: QueryClient

function mountComposable() {
  let result!: ReturnType<typeof useNoteProperties>
  mount(
    defineComponent({
      setup() {
        result = useNoteProperties()
        return () => null
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } },
  )
  return result
}

describe('useNoteProperties', () => {
  let adapter: StorageAdapter

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    adapter = createFakeAdapter({ 'nota.md': 'corpo sem frontmatter' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
  })

  it('shows the empty state when there is no active note', () => {
    const result = mountComposable()
    expect(result.isEmptyState.value).toBe(true)
  })

  it('exposes criado/atualizado as null when the note has no frontmatter yet', async () => {
    useNotesStore().openNote('nota.md')
    const result = mountComposable()
    await flushPromises()

    expect(result.criado.value).toBeNull()
    expect(result.atualizado.value).toBeNull()
    expect(result.customEntries.value).toEqual([])
  })

  it('parses existing frontmatter into criado/atualizado and custom entries', async () => {
    adapter = createFakeAdapter({
      'nota.md':
        '---\ncriado: 2026-07-01T00:00:00.000Z\natualizado: 2026-07-10T00:00:00.000Z\nprioridade: alta\n---\ncorpo',
    })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    useNotesStore().openNote('nota.md')
    const result = mountComposable()
    await flushPromises()

    expect(result.criado.value).toBe('2026-07-01T00:00:00.000Z')
    expect(result.atualizado.value).toBe('2026-07-10T00:00:00.000Z')
    expect(result.customEntries.value).toEqual([{ key: 'prioridade', value: 'alta' }])
  })

  it('addProperty writes frontmatter with the new key/value, stamping timestamps', async () => {
    useNotesStore().openNote('nota.md')
    const result = mountComposable()
    await flushPromises()

    result.newKey.value = 'prioridade'
    result.newValue.value = 'alta'
    result.addProperty()
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith(
      'nota.md',
      expect.stringContaining('prioridade: alta'),
    )
    const [, savedContent] = vi.mocked(adapter.writeFile).mock.calls[0]
    expect(savedContent).toContain('criado:')
    expect(savedContent).toContain('atualizado:')
    expect(savedContent.endsWith('corpo sem frontmatter')).toBe(true)
    expect(result.newKey.value).toBe('')
    expect(result.newValue.value).toBe('')
  })

  it('updateProperty rewrites the value for an existing key', async () => {
    adapter = createFakeAdapter({
      'nota.md': '---\ncriado: 2026-07-01T00:00:00.000Z\nprioridade: baixa\n---\ncorpo',
    })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    useNotesStore().openNote('nota.md')
    const result = mountComposable()
    await flushPromises()

    result.updateProperty('prioridade', 'alta')
    await flushPromises()

    const [, savedContent] = vi.mocked(adapter.writeFile).mock.calls[0]
    expect(savedContent).toContain('prioridade: alta')
    expect(savedContent).not.toContain('prioridade: baixa')
  })

  it('removeProperty drops the key entirely', async () => {
    adapter = createFakeAdapter({
      'nota.md': '---\ncriado: 2026-07-01T00:00:00.000Z\nprioridade: alta\n---\ncorpo',
    })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    useNotesStore().openNote('nota.md')
    const result = mountComposable()
    await flushPromises()

    result.removeProperty('prioridade')
    await flushPromises()

    const [, savedContent] = vi.mocked(adapter.writeFile).mock.calls[0]
    expect(savedContent).not.toContain('prioridade')
  })

  it('ignores addProperty when the key is blank', async () => {
    useNotesStore().openNote('nota.md')
    const result = mountComposable()
    await flushPromises()

    result.newKey.value = '   '
    result.addProperty()
    await flushPromises()

    expect(adapter.writeFile).not.toHaveBeenCalled()
  })
})

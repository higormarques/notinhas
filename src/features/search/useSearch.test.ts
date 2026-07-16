import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSearch } from './useSearch'
import { useNotesStore } from '@/shared/stores/notes'
import { resetSearchIndex } from '@/shared/search/searchIndex'
import * as storageAdapterModule from '@/shared/storage/createStorageAdapter'
import type { StorageAdapter } from '@/shared/storage/StorageAdapter'

vi.mock('idb-keyval', () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/shared/storage/createStorageAdapter', () => ({
  getStorageAdapter: vi.fn(),
}))

function createFakeAdapter(files: Record<string, string>): StorageAdapter {
  function listChildren(path: string) {
    const prefix = path ? `${path}/` : ''
    const byName = new Map<string, { name: string; path: string; kind: 'file' | 'directory' }>()
    for (const filePath of Object.keys(files)) {
      if (!filePath.startsWith(prefix)) continue
      const rest = filePath.slice(prefix.length)
      const [first] = rest.split('/')
      byName.set(first, {
        name: first,
        path: prefix + first,
        kind: rest.includes('/') ? 'directory' : 'file',
      })
    }
    return Array.from(byName.values())
  }

  return {
    listDirectory: vi.fn(async (path: string) => listChildren(path)),
    readFile: vi.fn(async (path: string) => {
      const content = files[path]
      if (content === undefined) throw new Error(`not found: ${path}`)
      return content
    }),
    writeFile: vi.fn(async () => {}),
    createDirectory: vi.fn(async () => {}),
    deleteFile: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
  }
}

function mountComposable() {
  let result!: ReturnType<typeof useSearch>
  mount(
    defineComponent({
      setup() {
        result = useSearch()
        return () => null
      },
    }),
  )
  return result
}

describe('useSearch', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    await resetSearchIndex()
  })

  afterEach(async () => {
    await resetSearchIndex()
  })

  it('builds the index and returns matching results once opened', async () => {
    const adapter = createFakeAdapter({
      'gatos.md': 'notas sobre gatos e cachorros',
      'viagem.md': 'planejar a próxima viagem',
    })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)

    const result = mountComposable()
    result.open()
    result.query.value = 'gatos'
    expect(result.results.value).toEqual([])

    await flushPromises()

    expect(result.results.value).toEqual([
      { path: 'gatos.md', title: 'gatos', snippet: 'notas sobre gatos e cachorros' },
    ])
  })

  it('shows the empty state only once the index is ready and nothing matches', async () => {
    const adapter = createFakeAdapter({ 'nota.md': 'conteudo qualquer' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)

    const result = mountComposable()
    result.open()
    result.query.value = 'inexistente'
    await flushPromises()

    expect(result.showEmptyState.value).toBe(true)
    expect(result.isBuildingIndex.value).toBe(false)
  })

  it('opens the selected result and closes the dialog', async () => {
    const adapter = createFakeAdapter({ 'nota.md': 'conteudo pesquisável' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)

    const result = mountComposable()
    result.open()
    result.query.value = 'pesquisável'
    await flushPromises()

    result.selectResult('nota.md')

    expect(useNotesStore().activeNotePath).toBe('nota.md')
    expect(result.isOpen.value).toBe(false)
    expect(result.query.value).toBe('')
  })

  it('clears the query when closed', async () => {
    const adapter = createFakeAdapter({})
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)

    const result = mountComposable()
    result.open()
    result.query.value = 'algo'
    result.handleOpenChange(false)

    expect(result.query.value).toBe('')
    expect(result.isOpen.value).toBe(false)
  })
})

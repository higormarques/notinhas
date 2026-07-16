import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBacklinksPanel } from './useBacklinksPanel'
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
    const byName = new Map<
      string,
      { name: string; path: string; kind: 'file' | 'directory' }
    >()
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
  let result!: ReturnType<typeof useBacklinksPanel>
  mount(
    defineComponent({
      setup() {
        result = useBacklinksPanel()
        return () => null
      },
    }),
  )
  return result
}

describe('useBacklinksPanel', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    await resetSearchIndex()
  })

  afterEach(async () => {
    await resetSearchIndex()
  })

  it('shows the empty state when there is no active note', () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({}),
    )
    const result = mountComposable()
    expect(result.isEmptyState.value).toBe(true)
    expect(result.backlinks.value).toEqual([])
  })

  it('lists notes linking to the active note', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({ 'Alvo.md': 'conteudo', 'Origem.md': 'veja [[Alvo]] aqui' }),
    )
    useNotesStore().openNote('Alvo.md')
    const result = mountComposable()
    await flushPromises()

    expect(result.backlinks.value.map((e) => e.path)).toEqual(['Origem.md'])
    expect(result.isEmptyState.value).toBe(false)
  })

  it('shows an empty list when nothing links to the active note', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({ 'Sozinha.md': 'conteudo' }),
    )
    useNotesStore().openNote('Sozinha.md')
    const result = mountComposable()
    await flushPromises()

    expect(result.backlinks.value).toEqual([])
  })

  it('reacts to switching the active note', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({
        'A.md': 'conteudo a',
        'B.md': 'conteudo b',
        'Origem.md': 'veja [[A]] aqui',
      }),
    )
    useNotesStore().openNote('A.md')
    const result = mountComposable()
    await flushPromises()
    expect(result.backlinks.value.map((e) => e.path)).toEqual(['Origem.md'])

    useNotesStore().openNote('B.md')
    await flushPromises()
    expect(result.backlinks.value).toEqual([])
  })

  it('openNote sets the active note in the shared store', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({ 'Alvo.md': 'conteudo', 'Origem.md': 'veja [[Alvo]] aqui' }),
    )
    useNotesStore().openNote('Alvo.md')
    const result = mountComposable()
    await flushPromises()

    result.openNote('Origem.md')
    expect(useNotesStore().activeNotePath).toBe('Origem.md')
  })

  it('navigates with ArrowDown/Enter via keydown', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({
        'Alvo.md': 'conteudo',
        'Origem1.md': 'veja [[Alvo]]',
        'Origem2.md': 'veja [[Alvo]]',
      }),
    )
    useNotesStore().openNote('Alvo.md')
    const result = mountComposable()
    await flushPromises()

    result.focusedPath.value = result.backlinks.value[0].path
    result.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    const secondPath = result.backlinks.value[1].path
    expect(result.focusedPath.value).toBe(secondPath)

    result.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(useNotesStore().activeNotePath).toBe(secondPath)
  })
})

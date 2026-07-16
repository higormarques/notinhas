import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTagsPanel } from './useTagsPanel'
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
  let result!: ReturnType<typeof useTagsPanel>
  mount(
    defineComponent({
      setup() {
        result = useTagsPanel()
        return () => null
      },
    }),
  )
  return result
}

describe('useTagsPanel', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    await resetSearchIndex()
  })

  afterEach(async () => {
    await resetSearchIndex()
  })

  it('lists tags with counts, sorted by count desc, once the index builds on mount', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({ 'a.md': '#projeto #urgente', 'b.md': '#projeto' }),
    )

    const result = mountComposable()
    await flushPromises()

    expect(result.tags.value).toEqual([
      { tag: 'projeto', count: 2 },
      { tag: 'urgente', count: 1 },
    ])
  })

  it('selecting a tag filters to notes carrying it', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({ 'a.md': '#projeto', 'b.md': 'sem tag' }),
    )

    const result = mountComposable()
    await flushPromises()

    result.selectTag('projeto')
    expect(result.selectedTag.value).toBe('projeto')
    expect(result.notesForSelectedTag.value.map((e) => e.path)).toEqual(['a.md'])
  })

  it('clearSelectedTag returns to the tag list', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({ 'a.md': '#projeto' }),
    )
    const result = mountComposable()
    await flushPromises()

    result.selectTag('projeto')
    result.clearSelectedTag()

    expect(result.selectedTag.value).toBeNull()
  })

  it('openNote sets the active note in the shared store', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({ 'a.md': '#projeto' }),
    )
    const result = mountComposable()
    await flushPromises()

    result.openNote('a.md')

    expect(useNotesStore().activeNotePath).toBe('a.md')
  })

  it('navigates tags with ArrowDown/Enter via keydown', async () => {
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(
      createFakeAdapter({ 'a.md': '#alfa', 'b.md': '#beta' }),
    )
    const result = mountComposable()
    await flushPromises()

    result.focusedKey.value = 'tag:alfa'
    result.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(result.focusedKey.value).toBe('tag:beta')

    result.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(result.selectedTag.value).toBe('beta')
  })
})

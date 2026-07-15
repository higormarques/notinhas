import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFileTree } from './useFileTree'
import { useNotesStore } from '@/shared/stores/notes'
import * as storageAdapterModule from '@/shared/storage/createStorageAdapter'
import type { DirectoryEntry, StorageAdapter } from '@/shared/storage/StorageAdapter'

vi.mock('@/shared/storage/createStorageAdapter', () => ({
  getStorageAdapter: vi.fn(),
}))

function createFakeAdapter(): StorageAdapter {
  const files = new Map<string, string>()
  const dirs = new Set<string>()

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
    for (const dirPath of dirs) {
      if (!dirPath.startsWith(prefix)) continue
      const rest = dirPath.slice(prefix.length)
      if (!rest || rest.includes('/')) continue
      byName.set(rest, { name: rest, path: dirPath, kind: 'directory' })
    }

    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  const listDirectory = vi.fn(async (path: string) => listChildren(path))

  const readFile = vi.fn(async (path: string) => {
    const content = files.get(path)
    if (content === undefined) throw new Error(`not found: ${path}`)
    return content
  })

  const writeFile = vi.fn(async (path: string, content: string) => {
    files.set(path, content)
  })

  const createDirectory = vi.fn(async (path: string) => {
    dirs.add(path)
  })

  const deleteFile = vi.fn(async (path: string) => {
    files.delete(path)
    dirs.delete(path)
    const prefix = `${path}/`
    for (const key of Array.from(files.keys()))
      if (key.startsWith(prefix)) files.delete(key)
    for (const key of Array.from(dirs)) if (key.startsWith(prefix)) dirs.delete(key)
  })

  const rename = vi.fn(async (fromPath: string, toPath: string) => {
    if (files.has(fromPath)) {
      files.set(toPath, files.get(fromPath) as string)
      files.delete(fromPath)
    }
    if (dirs.has(fromPath)) {
      dirs.delete(fromPath)
      dirs.add(toPath)
    }
    const prefix = `${fromPath}/`
    for (const key of Array.from(files.keys())) {
      if (!key.startsWith(prefix)) continue
      files.set(toPath + key.slice(fromPath.length), files.get(key) as string)
      files.delete(key)
    }
    for (const key of Array.from(dirs)) {
      if (!key.startsWith(prefix)) continue
      dirs.delete(key)
      dirs.add(toPath + key.slice(fromPath.length))
    }
  })

  return { listDirectory, readFile, writeFile, createDirectory, deleteFile, rename }
}

let queryClient: QueryClient

function mountComposable() {
  let result!: ReturnType<typeof useFileTree>
  mount(
    defineComponent({
      setup() {
        result = useFileTree()
        return () => null
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } },
  )
  return result
}

describe('useFileTree', () => {
  let adapter: StorageAdapter

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    adapter = createFakeAdapter()
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
  })

  it('lists the root directory on load', async () => {
    await adapter.writeFile('bemvindo.md', 'ola')

    const result = mountComposable()
    await flushPromises()

    expect(result.rows.value).toEqual([
      {
        entry: { name: 'bemvindo.md', path: 'bemvindo.md', kind: 'file' },
        depth: 0,
        isExpanded: false,
      },
    ])
    expect(result.focusedPath.value).toBe('bemvindo.md')
  })

  it('creates a note inside the focused folder and opens it', async () => {
    await adapter.createDirectory('Notas')

    const result = mountComposable()
    await flushPromises()

    result.focusedPath.value = 'Notas'
    result.openCreateNoteDialog()
    result.dialog.value.name = 'bemvindo'
    await result.submitDialog()
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith('Notas/bemvindo.md', '')
    expect(useNotesStore().activeNotePath).toBe('Notas/bemvindo.md')
  })

  it('renames/moves an entry and keeps the active note pointer in sync', async () => {
    await adapter.writeFile('nota.md', 'conteudo')

    const result = mountComposable()
    await flushPromises()
    useNotesStore().openNote('nota.md')

    result.openRenameDialog('nota.md')
    result.dialog.value.name = 'renomeada.md'
    await result.submitDialog()
    await flushPromises()

    expect(adapter.rename).toHaveBeenCalledWith('nota.md', 'renomeada.md')
    expect(useNotesStore().activeNotePath).toBe('renomeada.md')
  })

  it('deletes an entry and clears the active note if it was open', async () => {
    await adapter.writeFile('nota.md', 'conteudo')

    const result = mountComposable()
    await flushPromises()
    useNotesStore().openNote('nota.md')

    result.openDeleteDialog('nota.md')
    await result.submitDialog()
    await flushPromises()

    expect(adapter.deleteFile).toHaveBeenCalledWith('nota.md')
    expect(useNotesStore().activeNotePath).toBeNull()
    expect(result.rows.value).toEqual([])
  })

  it('moves keyboard focus between visible rows with arrow keys', async () => {
    await adapter.writeFile('a.md', '')
    await adapter.writeFile('b.md', '')

    const result = mountComposable()
    await flushPromises()

    expect(result.focusedPath.value).toBe('a.md')
    result.handleTreeKeydown({
      key: 'ArrowDown',
      preventDefault: () => {},
    } as KeyboardEvent)
    expect(result.focusedPath.value).toBe('b.md')
    result.handleTreeKeydown({
      key: 'ArrowUp',
      preventDefault: () => {},
    } as KeyboardEvent)
    expect(result.focusedPath.value).toBe('a.md')
  })
})

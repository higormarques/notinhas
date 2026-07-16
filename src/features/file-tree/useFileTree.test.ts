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
        displayName: 'bemvindo',
      },
    ])
    expect(result.focusedPath.value).toBe('bemvindo.md')
  })

  it('creates a note inside the focused folder when it is expanded', async () => {
    await adapter.createDirectory('Notas')

    const result = mountComposable()
    await flushPromises()

    result.focusedPath.value = 'Notas'
    result.handleTreeKeydown({
      key: 'ArrowRight',
      preventDefault: () => {},
    } as KeyboardEvent)
    await flushPromises()

    result.openCreateNoteDialog()
    result.dialog.value.name = 'bemvindo'
    await result.submitDialog()
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith('Notas/bemvindo.md', '')
    expect(useNotesStore().activeNotePath).toBe('Notas/bemvindo.md')
  })

  it('creates a note as a sibling of a focused but collapsed folder', async () => {
    await adapter.createDirectory('Notas')

    const result = mountComposable()
    await flushPromises()

    result.focusedPath.value = 'Notas'
    result.openCreateNoteDialog()
    result.dialog.value.name = 'bemvindo'
    await result.submitDialog()
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith('bemvindo.md', '')
  })

  it('creates a second root-level folder as a sibling of the first, not nested inside it', async () => {
    const result = mountComposable()
    await flushPromises()

    result.openCreateFolderDialog()
    result.dialog.value.name = 'Primeira'
    await result.submitDialog()
    await flushPromises()

    expect(adapter.createDirectory).toHaveBeenCalledWith('Primeira')
    expect(result.focusedPath.value).toBe('Primeira')

    result.openCreateFolderDialog()
    result.dialog.value.name = 'Segunda'
    await result.submitDialog()
    await flushPromises()

    expect(adapter.createDirectory).toHaveBeenCalledWith('Segunda')
    expect(result.rows.value.map((row) => row.entry.path)).toEqual([
      'Primeira',
      'Segunda',
    ])
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

  it('hides the Daily folder from the root listing', async () => {
    await adapter.writeFile('bemvindo.md', 'ola')
    await adapter.writeFile('Daily/2026-07-15.md', 'nota de hoje')

    const result = mountComposable()
    await flushPromises()

    expect(result.rows.value).toEqual([
      {
        entry: { name: 'bemvindo.md', path: 'bemvindo.md', kind: 'file' },
        depth: 0,
        isExpanded: false,
        displayName: 'bemvindo',
      },
    ])
  })

  it('does not hide a nested folder that happens to be named Daily', async () => {
    await adapter.createDirectory('Notas')
    await adapter.writeFile('Notas/Daily/README.md', '')

    const result = mountComposable()
    await flushPromises()

    result.focusedPath.value = 'Notas'
    result.handleTreeKeydown({
      key: 'ArrowRight',
      preventDefault: () => {},
    } as KeyboardEvent)
    await flushPromises()

    expect(result.rows.value.map((row) => row.entry.path)).toContain('Notas/Daily')
  })

  it('strips the .md extension from file display names but not folder names', async () => {
    await adapter.createDirectory('Notas.md')
    await adapter.writeFile('bemvindo.md', '')

    const result = mountComposable()
    await flushPromises()

    expect(result.rows.value.map((row) => row.displayName)).toEqual([
      'bemvindo',
      'Notas.md',
    ])
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

  function fakeDragEvent(): DragEvent {
    return { preventDefault: () => {}, stopPropagation: () => {} } as unknown as DragEvent
  }

  it('moves a note into a folder via drag-and-drop', async () => {
    await adapter.writeFile('nota.md', 'conteudo')
    await adapter.createDirectory('Pasta')

    const result = mountComposable()
    await flushPromises()

    const folderRow = result.rows.value.find((row) => row.entry.path === 'Pasta')!
    result.handleDragStart('nota.md')
    result.handleRowDragOver(fakeDragEvent(), folderRow)
    expect(result.dragOverPath.value).toBe('Pasta')

    result.handleRowDrop(fakeDragEvent(), folderRow)
    await flushPromises()

    expect(adapter.rename).toHaveBeenCalledWith('nota.md', 'Pasta/nota.md')
    expect(result.dragOverPath.value).toBeNull()
  })

  it('moves a nested note back to the root via the root drop zone', async () => {
    await adapter.createDirectory('Pasta')
    await adapter.writeFile('Pasta/nota.md', 'conteudo')

    const result = mountComposable()
    await flushPromises()
    result.focusedPath.value = 'Pasta'
    result.handleTreeKeydown({
      key: 'ArrowRight',
      preventDefault: () => {},
    } as KeyboardEvent)
    await flushPromises()

    result.handleDragStart('Pasta/nota.md')
    result.handleRootDragOver(fakeDragEvent())
    expect(result.dragOverPath.value).toBe('')

    result.handleRootDrop(fakeDragEvent())
    await flushPromises()

    expect(adapter.rename).toHaveBeenCalledWith('Pasta/nota.md', 'nota.md')
  })

  it('refuses to drop a folder into itself or into its own descendant', async () => {
    await adapter.createDirectory('Pasta')
    await adapter.createDirectory('Pasta/Sub')

    const result = mountComposable()
    await flushPromises()
    result.focusedPath.value = 'Pasta'
    result.handleTreeKeydown({
      key: 'ArrowRight',
      preventDefault: () => {},
    } as KeyboardEvent)
    await flushPromises()

    const selfRow = result.rows.value.find((row) => row.entry.path === 'Pasta')!
    const subRow = result.rows.value.find((row) => row.entry.path === 'Pasta/Sub')!

    result.handleDragStart('Pasta')
    result.handleRowDragOver(fakeDragEvent(), selfRow)
    expect(result.dragOverPath.value).toBeNull()
    result.handleRowDragOver(fakeDragEvent(), subRow)
    expect(result.dragOverPath.value).toBeNull()

    result.handleRowDrop(fakeDragEvent(), subRow)
    await flushPromises()

    expect(adapter.rename).not.toHaveBeenCalled()
  })

  it('ignores a drop that would leave the item in the same place', async () => {
    await adapter.writeFile('nota.md', 'conteudo')

    const result = mountComposable()
    await flushPromises()

    const noteRow = result.rows.value.find((row) => row.entry.path === 'nota.md')!
    result.handleDragStart('nota.md')
    result.handleRootDragOver(fakeDragEvent())
    expect(result.dragOverPath.value).toBeNull()

    result.handleRowDrop(fakeDragEvent(), noteRow)
    await flushPromises()

    expect(adapter.rename).not.toHaveBeenCalled()
  })
})

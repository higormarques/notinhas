import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IndexingStorageAdapter } from './IndexingStorageAdapter'
import { resetSearchIndex, search } from '@/shared/search/searchIndex'
import type { StorageAdapter } from './StorageAdapter'

vi.mock('idb-keyval', () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
}))

function createFakeAdapter(): StorageAdapter {
  const files = new Map<string, string>()
  return {
    listDirectory: vi.fn(async (path: string) => {
      const prefix = path ? `${path}/` : ''
      const byName = new Map<
        string,
        { name: string; path: string; kind: 'file' | 'directory' }
      >()
      for (const filePath of files.keys()) {
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
    }),
    readFile: vi.fn(async (path: string) => {
      const content = files.get(path)
      if (content === undefined) throw new Error(`not found: ${path}`)
      return content
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content)
    }),
    createDirectory: vi.fn(async () => {}),
    deleteFile: vi.fn(async (path: string) => {
      files.delete(path)
      const prefix = `${path}/`
      for (const key of Array.from(files.keys()))
        if (key.startsWith(prefix)) files.delete(key)
    }),
    rename: vi.fn(async (fromPath: string, toPath: string) => {
      if (files.has(fromPath)) {
        files.set(toPath, files.get(fromPath) as string)
        files.delete(fromPath)
      }
    }),
  }
}

describe('IndexingStorageAdapter', () => {
  let inner: StorageAdapter
  let adapter: IndexingStorageAdapter

  beforeEach(async () => {
    await resetSearchIndex()
    inner = createFakeAdapter()
    adapter = new IndexingStorageAdapter(inner)
  })

  it('indexes a file as soon as it is written', async () => {
    await adapter.writeFile('nota.md', 'conteúdo pesquisável')

    expect(search('pesquisável')).toEqual([
      { path: 'nota.md', title: 'nota', snippet: 'conteúdo pesquisável' },
    ])
  })

  it('re-indexes a file when it is overwritten', async () => {
    await adapter.writeFile('nota.md', 'versão um')
    await adapter.writeFile('nota.md', 'versão dois')

    expect(search('versão um')).toEqual([])
    expect(search('versão dois')).toHaveLength(1)
  })

  it('removes a file from the index when deleted', async () => {
    await adapter.writeFile('nota.md', 'conteudo')
    await adapter.deleteFile('nota.md')

    expect(search('conteudo')).toEqual([])
  })

  it('removes every indexed descendant when a folder is deleted', async () => {
    await adapter.writeFile('Pasta/a.md', 'conteudo a')
    await adapter.writeFile('Pasta/b.md', 'conteudo b')

    await adapter.deleteFile('Pasta')

    expect(search('conteudo')).toEqual([])
  })

  it('keeps a renamed file searchable under its new path', async () => {
    await adapter.writeFile('velho.md', 'mesmo conteúdo')
    await adapter.rename('velho.md', 'novo.md')

    expect(search('mesmo conteúdo')).toEqual([
      { path: 'novo.md', title: 'novo', snippet: 'mesmo conteúdo' },
    ])
  })

  it('delegates reads to the inner adapter without indexing anything', async () => {
    await inner.writeFile('nota.md', 'conteudo lido diretamente pelo inner')

    await adapter.readFile('nota.md')
    await adapter.listDirectory('')

    expect(search('conteudo')).toEqual([])
  })
})

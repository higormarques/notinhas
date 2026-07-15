import { beforeEach, describe, expect, it } from 'vitest'
import { DirectoryHandleStorageAdapter } from './DirectoryHandleStorageAdapter'

interface FakeFileNode {
  kind: 'file'
  content: string
}

interface FakeDirNode {
  kind: 'directory'
  children: Map<string, FakeFileNode | FakeDirNode>
}

function notFoundError(): DOMException {
  return new DOMException('not found', 'NotFoundError')
}

function typeMismatchError(): DOMException {
  return new DOMException('type mismatch', 'TypeMismatchError')
}

function createFakeHandle(
  node: FakeFileNode | FakeDirNode,
  name: string,
): FileSystemHandle {
  return node.kind === 'file'
    ? createFakeFileHandle(node, name)
    : createFakeDirHandle(node, name)
}

function createFakeFileHandle(node: FakeFileNode, name: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    async getFile() {
      return { text: async () => node.content } as unknown as File
    },
    async createWritable() {
      return {
        async write(content: string) {
          node.content = content
        },
        async close() {},
      } as unknown as FileSystemWritableFileStream
    },
  } as unknown as FileSystemFileHandle
}

function createFakeDirHandle(node: FakeDirNode, name: string): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name,
    async *entries(): AsyncIterableIterator<[string, FileSystemHandle]> {
      for (const [childName, childNode] of node.children) {
        yield [childName, createFakeHandle(childNode, childName)]
      }
    },
    async getDirectoryHandle(childName: string, options?: { create?: boolean }) {
      let child = node.children.get(childName)
      if (!child) {
        if (!options?.create) throw notFoundError()
        child = { kind: 'directory', children: new Map() }
        node.children.set(childName, child)
      }
      if (child.kind !== 'directory') throw typeMismatchError()
      return createFakeDirHandle(child, childName)
    },
    async getFileHandle(childName: string, options?: { create?: boolean }) {
      let child = node.children.get(childName)
      if (!child) {
        if (!options?.create) throw notFoundError()
        child = { kind: 'file', content: '' }
        node.children.set(childName, child)
      }
      if (child.kind !== 'file') throw typeMismatchError()
      return createFakeFileHandle(child, childName)
    },
    async removeEntry(childName: string) {
      if (!node.children.has(childName)) throw notFoundError()
      node.children.delete(childName)
    },
  } as unknown as FileSystemDirectoryHandle
}

function createFakeRoot(): FileSystemDirectoryHandle {
  return createFakeDirHandle({ kind: 'directory', children: new Map() }, '')
}

describe('DirectoryHandleStorageAdapter', () => {
  let adapter: DirectoryHandleStorageAdapter

  beforeEach(() => {
    adapter = new DirectoryHandleStorageAdapter(createFakeRoot())
  })

  it('lists an empty root directory', async () => {
    expect(await adapter.listDirectory('')).toEqual([])
  })

  it('writes and reads a file, creating intermediate directories', async () => {
    await adapter.writeFile('Notas/bemvindo.md', 'ola')

    expect(await adapter.readFile('Notas/bemvindo.md')).toBe('ola')
    expect(await adapter.listDirectory('')).toEqual([
      { name: 'Notas', path: 'Notas', kind: 'directory' },
    ])
    expect(await adapter.listDirectory('Notas')).toEqual([
      { name: 'bemvindo.md', path: 'Notas/bemvindo.md', kind: 'file' },
    ])
  })

  it('creates an empty directory', async () => {
    await adapter.createDirectory('Diario')

    expect(await adapter.listDirectory('')).toEqual([
      { name: 'Diario', path: 'Diario', kind: 'directory' },
    ])
    expect(await adapter.listDirectory('Diario')).toEqual([])
  })

  it('deletes a file', async () => {
    await adapter.writeFile('nota.md', 'conteudo')
    await adapter.deleteFile('nota.md')

    expect(await adapter.listDirectory('')).toEqual([])
  })

  it('deletes a directory recursively', async () => {
    await adapter.writeFile('Pasta/a.md', 'a')
    await adapter.writeFile('Pasta/Sub/b.md', 'b')

    await adapter.deleteFile('Pasta')

    expect(await adapter.listDirectory('')).toEqual([])
  })

  it('renames a file in place', async () => {
    await adapter.writeFile('velho.md', 'conteudo')
    await adapter.rename('velho.md', 'novo.md')

    expect(await adapter.readFile('novo.md')).toBe('conteudo')
    expect(await adapter.listDirectory('')).toEqual([
      { name: 'novo.md', path: 'novo.md', kind: 'file' },
    ])
  })

  it('moves a file into another directory via rename', async () => {
    await adapter.writeFile('nota.md', 'conteudo')
    await adapter.createDirectory('Pasta')

    await adapter.rename('nota.md', 'Pasta/nota.md')

    expect(await adapter.listDirectory('')).toEqual([
      { name: 'Pasta', path: 'Pasta', kind: 'directory' },
    ])
    expect(await adapter.readFile('Pasta/nota.md')).toBe('conteudo')
  })

  it('renames a directory recursively, preserving its contents', async () => {
    await adapter.writeFile('Pasta/a.md', 'a')
    await adapter.writeFile('Pasta/Sub/b.md', 'b')

    await adapter.rename('Pasta', 'PastaRenomeada')

    expect(await adapter.listDirectory('')).toEqual([
      { name: 'PastaRenomeada', path: 'PastaRenomeada', kind: 'directory' },
    ])
    expect(await adapter.readFile('PastaRenomeada/a.md')).toBe('a')
    expect(await adapter.readFile('PastaRenomeada/Sub/b.md')).toBe('b')
  })
})

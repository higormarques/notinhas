import type { Page } from '@playwright/test'

/** Árvore inicial do workspace mockado: string = conteúdo de arquivo, objeto = subpasta. */
export interface VirtualTree {
  [name: string]: string | VirtualTree
}

/**
 * O File System Access API real exige um gesto do usuário respondido por um seletor nativo do
 * SO, que não existe em execução headless/automatizada. Mockamos `showDirectoryPicker` com um
 * `FileSystemDirectoryHandle` falso mas funcional (entries/getFileHandle/getDirectoryHandle/
 * removeEntry/createWritable) para exercitar o CRUD real da Fase 2 via Playwright, conforme
 * previsto no DoD de teclado da fase.
 */
export async function mockDirectoryPicker(
  page: Page,
  directoryName = 'meu-workspace',
  tree: VirtualTree = {},
) {
  await page.addInitScript(
    ({ name, tree: initialTree }) => {
      interface FileNode {
        kind: 'file'
        content: string
      }
      interface DirNode {
        kind: 'directory'
        children: Map<string, FileNode | DirNode>
      }

      function buildTree(source: Record<string, unknown>): DirNode {
        const children = new Map<string, FileNode | DirNode>()
        for (const key of Object.keys(source)) {
          const value = source[key]
          if (typeof value === 'string') {
            children.set(key, { kind: 'file', content: value })
          } else {
            children.set(key, buildTree(value as Record<string, unknown>))
          }
        }
        return { kind: 'directory', children }
      }

      function notFoundError(): DOMException {
        return new DOMException('not found', 'NotFoundError')
      }

      function createFileHandle(
        node: FileNode,
        handleName: string,
      ): FileSystemFileHandle {
        return {
          kind: 'file',
          name: handleName,
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

      function createDirHandle(
        node: DirNode,
        handleName: string,
      ): FileSystemDirectoryHandle {
        return {
          kind: 'directory',
          name: handleName,
          async *entries(): AsyncIterableIterator<[string, FileSystemHandle]> {
            for (const [childName, childNode] of node.children) {
              yield [childName, createEntryHandle(childNode, childName)]
            }
          },
          async getDirectoryHandle(childName: string, options?: { create?: boolean }) {
            let child = node.children.get(childName)
            if (!child) {
              if (!options?.create) throw notFoundError()
              child = { kind: 'directory', children: new Map() }
              node.children.set(childName, child)
            }
            if (child.kind !== 'directory') throw notFoundError()
            return createDirHandle(child, childName)
          },
          async getFileHandle(childName: string, options?: { create?: boolean }) {
            let child = node.children.get(childName)
            if (!child) {
              if (!options?.create) throw notFoundError()
              child = { kind: 'file', content: '' }
              node.children.set(childName, child)
            }
            if (child.kind !== 'file') throw notFoundError()
            return createFileHandle(child, childName)
          },
          async removeEntry(childName: string) {
            if (!node.children.has(childName)) throw notFoundError()
            node.children.delete(childName)
          },
        } as unknown as FileSystemDirectoryHandle
      }

      function createEntryHandle(
        node: FileNode | DirNode,
        handleName: string,
      ): FileSystemHandle {
        return node.kind === 'file'
          ? createFileHandle(node, handleName)
          : createDirHandle(node, handleName)
      }

      const rootNode = buildTree(initialTree as Record<string, unknown>)
      const rootHandle = createDirHandle(rootNode, name)

      Object.defineProperty(window, 'showDirectoryPicker', {
        configurable: true,
        writable: true,
        value: async () => rootHandle,
      })
    },
    { name: directoryName, tree },
  )
}

export async function connectMockWorkspace(
  page: Page,
  directoryName = 'meu-workspace',
  tree: VirtualTree = {},
) {
  await mockDirectoryPicker(page, directoryName, tree)
  await page.goto('/')
  await page.getByRole('button', { name: 'Escolher pasta do workspace' }).focus()
  await page.keyboard.press('Enter')
  await page.getByText('Selecione uma nota para editar.').waitFor()
}

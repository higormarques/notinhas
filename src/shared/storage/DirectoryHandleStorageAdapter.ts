import type { DirectoryEntry, StorageAdapter } from './StorageAdapter'
import {
  joinPath,
  resolveDirectoryHandle,
  resolveFileHandle,
  splitPath,
} from './directoryHandleNavigation'

/**
 * Base compartilhada por FileSystemAccessAdapter e OPFSAdapter: ambos operam sobre a mesma API
 * de FileSystemDirectoryHandle, diferindo só em como a raiz é obtida (picker vs OPFS).
 */
export class DirectoryHandleStorageAdapter implements StorageAdapter {
  protected readonly root: FileSystemDirectoryHandle

  constructor(root: FileSystemDirectoryHandle) {
    this.root = root
  }

  async listDirectory(path: string): Promise<DirectoryEntry[]> {
    const dir = await resolveDirectoryHandle(this.root, path)
    const entries: DirectoryEntry[] = []
    for await (const [name, handle] of dir.entries()) {
      entries.push({ name, path: joinPath(path, name), kind: handle.kind })
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  }

  async readFile(path: string): Promise<string> {
    const fileHandle = await resolveFileHandle(this.root, path)
    const file = await fileHandle.getFile()
    return file.text()
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fileHandle = await resolveFileHandle(this.root, path, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  async createDirectory(path: string): Promise<void> {
    await resolveDirectoryHandle(this.root, path, { create: true })
  }

  async deleteFile(path: string): Promise<void> {
    const segments = splitPath(path)
    const name = segments.pop()
    if (!name) {
      throw new Error(`Caminho inválido: "${path}"`)
    }
    const parent = await resolveDirectoryHandle(this.root, segments.join('/'))
    await parent.removeEntry(name, { recursive: true })
  }

  async rename(fromPath: string, toPath: string): Promise<void> {
    const isDirectory = await this.isDirectory(fromPath)
    if (isDirectory) {
      await this.copyDirectoryRecursive(fromPath, toPath)
    } else {
      await this.writeFile(toPath, await this.readFile(fromPath))
    }
    await this.deleteFile(fromPath)
  }

  private async isDirectory(path: string): Promise<boolean> {
    try {
      await resolveFileHandle(this.root, path)
      return false
    } catch {
      return true
    }
  }

  private async copyDirectoryRecursive(fromPath: string, toPath: string): Promise<void> {
    const entries = await this.listDirectory(fromPath)
    for (const entry of entries) {
      const targetPath = joinPath(toPath, entry.name)
      if (entry.kind === 'directory') {
        await this.copyDirectoryRecursive(entry.path, targetPath)
      } else {
        await this.writeFile(targetPath, await this.readFile(entry.path))
      }
    }
  }
}

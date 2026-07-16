import type { DirectoryEntry, StorageAdapter } from './StorageAdapter'
import { removeSubtree, renameSubtree, upsertEntry } from '@/shared/search/searchIndex'

/**
 * Decora qualquer `StorageAdapter` (File System Access ou OPFS) para manter o índice de busca
 * (`shared/search/searchIndex.ts`) sincronizado a cada escrita/exclusão/renomeação — sem exigir
 * que cada feature (note-editor, file-tree, daily-desk, command-palette) lembre de atualizar o
 * índice manualmente depois de cada mutation. Como todo código de feature já é obrigado a passar
 * pelo `StorageAdapter` (nunca chamar a File System Access API/OPFS direto), decorar o adapter é
 * o único ponto que garante cobertura de 100% das escritas.
 */
export class IndexingStorageAdapter implements StorageAdapter {
  private readonly inner: StorageAdapter

  constructor(inner: StorageAdapter) {
    this.inner = inner
  }

  listDirectory(path: string): Promise<DirectoryEntry[]> {
    return this.inner.listDirectory(path)
  }

  readFile(path: string): Promise<string> {
    return this.inner.readFile(path)
  }

  createDirectory(path: string): Promise<void> {
    return this.inner.createDirectory(path)
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.inner.writeFile(path, content)
    await upsertEntry(path, content)
  }

  async deleteFile(path: string): Promise<void> {
    await this.inner.deleteFile(path)
    await removeSubtree(path)
  }

  async rename(fromPath: string, toPath: string): Promise<void> {
    await this.inner.rename(fromPath, toPath)
    await renameSubtree(fromPath, toPath)
  }
}

export interface DirectoryEntry {
  name: string
  path: string
  kind: 'file' | 'directory'
}

export interface StorageAdapter {
  listDirectory(path: string): Promise<DirectoryEntry[]>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  createDirectory(path: string): Promise<void>
  deleteFile(path: string): Promise<void>
  rename(fromPath: string, toPath: string): Promise<void>
}

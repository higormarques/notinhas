import { DirectoryHandleStorageAdapter } from './DirectoryHandleStorageAdapter'

export class FileSystemAccessAdapter extends DirectoryHandleStorageAdapter {
  constructor(root: FileSystemDirectoryHandle) {
    super(root)
  }
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window.showDirectoryPicker === 'function'
}

export async function pickWorkspaceDirectory(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker({ id: 'notinhas-workspace', mode: 'readwrite' })
}

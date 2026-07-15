import { DirectoryHandleStorageAdapter } from './DirectoryHandleStorageAdapter'

export class OPFSAdapter extends DirectoryHandleStorageAdapter {
  constructor(root: FileSystemDirectoryHandle) {
    super(root)
  }
}

export async function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory()
}

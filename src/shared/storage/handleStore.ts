import { del, get, set } from 'idb-keyval'

const WORKSPACE_HANDLE_KEY = 'notinhas:workspace-directory-handle'

export function getPersistedWorkspaceHandle(): Promise<
  FileSystemDirectoryHandle | undefined
> {
  return get<FileSystemDirectoryHandle>(WORKSPACE_HANDLE_KEY)
}

export function setPersistedWorkspaceHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  return set(WORKSPACE_HANDLE_KEY, handle)
}

export function clearPersistedWorkspaceHandle(): Promise<void> {
  return del(WORKSPACE_HANDLE_KEY)
}

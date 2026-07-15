export type StorageAdapterKind = 'file-system-access' | 'opfs'

export type WorkspaceConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'permission-required'
  | 'permission-denied'

export interface Workspace {
  name: string
  adapterKind: StorageAdapterKind
}

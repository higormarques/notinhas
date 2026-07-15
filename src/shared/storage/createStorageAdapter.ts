import type { Workspace } from '@/entities/Workspace'
import type { StorageAdapter } from './StorageAdapter'
import {
  FileSystemAccessAdapter,
  isFileSystemAccessSupported,
  pickWorkspaceDirectory,
} from './FileSystemAccessAdapter'
import { getOpfsRoot, OPFSAdapter } from './OPFSAdapter'
import {
  clearPersistedWorkspaceHandle,
  getPersistedWorkspaceHandle,
  setPersistedWorkspaceHandle,
} from './handleStore'

let activeAdapter: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (!activeAdapter) {
    throw new Error(
      'Nenhum workspace conectado. Conecte um workspace antes de acessar arquivos.',
    )
  }
  return activeAdapter
}

export type PermissionRequestResult =
  { status: 'connected'; workspace: Workspace } | { status: 'permission-denied' }

export type ReconnectResult =
  | { status: 'connected'; workspace: Workspace }
  | {
      status: 'permission-required'
      requestPermission: () => Promise<PermissionRequestResult>
    }
  | { status: 'permission-denied' }
  | { status: 'not-found' }

export { isFileSystemAccessSupported }

export async function connectFileSystemWorkspace(): Promise<Workspace> {
  const handle = await pickWorkspaceDirectory()
  await persistHandleBestEffort(handle)
  activeAdapter = new FileSystemAccessAdapter(handle)
  return toWorkspace(handle, 'file-system-access')
}

/**
 * Lembrar o workspace entre reloads é um "nice to have" sobre a conexão em si: se a
 * persistência falhar (quota, navegação privada, handle não serializável), a sessão atual
 * deve continuar funcionando normalmente em vez de bloquear a conexão.
 */
async function persistHandleBestEffort(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    await setPersistedWorkspaceHandle(handle)
  } catch {
    // Persistência é best-effort — ver comentário acima.
  }
}

export async function connectOpfsWorkspace(): Promise<Workspace> {
  const handle = await getOpfsRoot()
  activeAdapter = new OPFSAdapter(handle)
  return { name: 'Workspace local (sandbox do navegador)', adapterKind: 'opfs' }
}

export async function reconnectPersistedWorkspace(): Promise<ReconnectResult> {
  const handle = await getPersistedWorkspaceHandle()
  if (!handle) {
    return { status: 'not-found' }
  }

  const permission = await handle.queryPermission({ mode: 'readwrite' })
  if (permission === 'granted') {
    activeAdapter = new FileSystemAccessAdapter(handle)
    return { status: 'connected', workspace: toWorkspace(handle, 'file-system-access') }
  }
  if (permission === 'denied') {
    return { status: 'permission-denied' }
  }

  return {
    status: 'permission-required',
    requestPermission: async () => {
      const result = await handle.requestPermission({ mode: 'readwrite' })
      if (result === 'granted') {
        activeAdapter = new FileSystemAccessAdapter(handle)
        return {
          status: 'connected',
          workspace: toWorkspace(handle, 'file-system-access'),
        }
      }
      return { status: 'permission-denied' }
    },
  }
}

export async function forgetPersistedWorkspace(): Promise<void> {
  activeAdapter = null
  await clearPersistedWorkspaceHandle()
}

function toWorkspace(
  handle: FileSystemDirectoryHandle,
  adapterKind: Workspace['adapterKind'],
): Workspace {
  return { name: handle.name, adapterKind }
}

import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  connectFileSystemWorkspace,
  connectOpfsWorkspace,
  isFileSystemAccessSupported,
  reconnectPersistedWorkspace,
} from '@/shared/storage/createStorageAdapter'
import type { PermissionRequestResult } from '@/shared/storage/createStorageAdapter'
import { useWorkspaceStore } from '@/shared/stores/workspace'

export function useWorkspaceConnect() {
  const workspaceStore = useWorkspaceStore()
  const { status, workspace } = storeToRefs(workspaceStore)

  const errorMessage = ref<string | null>(null)
  let pendingPermissionRequest: (() => Promise<PermissionRequestResult>) | null = null

  const isOpfsFallback = computed(() => workspace.value?.adapterKind === 'opfs')
  const supportsFileSystemAccess = isFileSystemAccessSupported()

  async function connect() {
    errorMessage.value = null
    workspaceStore.setConnecting()
    try {
      const connectedWorkspace = await connectFileSystemWorkspace()
      workspaceStore.setConnected(connectedWorkspace)
    } catch (error) {
      workspaceStore.setDisconnected()
      if (!isAbortError(error)) {
        errorMessage.value = 'Não foi possível conectar ao workspace. Tente novamente.'
      }
    }
  }

  async function requestPermission() {
    if (!pendingPermissionRequest) return
    errorMessage.value = null
    const result = await pendingPermissionRequest()
    if (result.status === 'connected') {
      workspaceStore.setConnected(result.workspace)
    } else {
      workspaceStore.setPermissionDenied()
    }
  }

  onMounted(async () => {
    if (!supportsFileSystemAccess) {
      workspaceStore.setConnecting()
      const connectedWorkspace = await connectOpfsWorkspace()
      workspaceStore.setConnected(connectedWorkspace)
      return
    }

    workspaceStore.setConnecting()
    const result = await reconnectPersistedWorkspace()
    switch (result.status) {
      case 'connected':
        workspaceStore.setConnected(result.workspace)
        break
      case 'permission-required':
        pendingPermissionRequest = result.requestPermission
        workspaceStore.setPermissionRequired()
        break
      case 'permission-denied':
        workspaceStore.setPermissionDenied()
        break
      case 'not-found':
        workspaceStore.setDisconnected()
        break
    }
  })

  return {
    status,
    workspace,
    errorMessage,
    isOpfsFallback,
    supportsFileSystemAccess,
    connect,
    requestPermission,
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

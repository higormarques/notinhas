import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Workspace, WorkspaceConnectionStatus } from '@/entities/Workspace'

export const useWorkspaceStore = defineStore('workspace', () => {
  const status = ref<WorkspaceConnectionStatus>('disconnected')
  const workspace = ref<Workspace | null>(null)

  function setConnecting() {
    status.value = 'connecting'
  }

  function setConnected(connectedWorkspace: Workspace) {
    workspace.value = connectedWorkspace
    status.value = 'connected'
  }

  function setPermissionRequired() {
    status.value = 'permission-required'
  }

  function setPermissionDenied() {
    status.value = 'permission-denied'
  }

  function setDisconnected() {
    workspace.value = null
    status.value = 'disconnected'
  }

  return {
    status,
    workspace,
    setConnecting,
    setConnected,
    setPermissionRequired,
    setPermissionDenied,
    setDisconnected,
  }
})

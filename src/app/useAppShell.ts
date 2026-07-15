import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useBreakpoint } from '@/shared/composables/useBreakpoint'
import { useTheme } from '@/shared/composables/useTheme'
import { useUiStore } from '@/shared/stores/ui'
import { useWorkspaceStore } from '@/shared/stores/workspace'

export function useAppShell() {
  const { breakpoint } = useBreakpoint()
  const { theme, toggleTheme } = useTheme()
  const uiStore = useUiStore()
  const { isLeftPanelOpen, isRightPanelOpen } = storeToRefs(uiStore)
  const workspaceStore = useWorkspaceStore()
  const { status: workspaceStatus, workspace } = storeToRefs(workspaceStore)

  const isLeftSheetOpen = ref(false)
  const isRightSheetOpen = ref(false)

  const isWorkspaceConnected = computed(() => workspaceStatus.value === 'connected')
  const isOpfsFallback = computed(() => workspace.value?.adapterKind === 'opfs')

  return {
    breakpoint,
    theme,
    toggleTheme,
    isLeftPanelOpen,
    isRightPanelOpen,
    toggleLeftPanel: uiStore.toggleLeftPanel,
    toggleRightPanel: uiStore.toggleRightPanel,
    isLeftSheetOpen,
    isRightSheetOpen,
    isWorkspaceConnected,
    isOpfsFallback,
  }
}

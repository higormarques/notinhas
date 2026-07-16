import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBreakpoint } from '@/shared/composables/useBreakpoint'
import { useShortcuts } from '@/shared/composables/useShortcuts'
import { useTheme } from '@/shared/composables/useTheme'
import { useUiStore } from '@/shared/stores/ui'
import { useWorkspaceStore } from '@/shared/stores/workspace'

export function useAppShell() {
  const { breakpoint } = useBreakpoint()
  const { theme, toggleTheme } = useTheme()
  const { register, trigger } = useShortcuts()
  const uiStore = useUiStore()
  const { isLeftPanelOpen, isRightPanelOpen, isLeftSheetOpen, isRightSheetOpen } =
    storeToRefs(uiStore)
  const workspaceStore = useWorkspaceStore()
  const { status: workspaceStatus, workspace } = storeToRefs(workspaceStore)

  const isWorkspaceConnected = computed(() => workspaceStatus.value === 'connected')
  const isOpfsFallback = computed(() => workspace.value?.adapterKind === 'opfs')

  // Registrado aqui (sempre montado) em vez de dentro do próprio Daily Desk: no
  // tablet/mobile o painel do calendário fica dentro do aside/sheet recolhível da árvore
  // de arquivos, então o atalho precisa sobreviver à desmontagem desses containers para
  // conseguir reabri-los.
  register({
    id: 'daily-desk:open',
    keys: 'mod+j',
    description: 'Abrir Daily Desk',
    handler: () => {
      if (breakpoint.value === 'mobile') {
        isLeftSheetOpen.value = true
      } else if (breakpoint.value === 'tablet') {
        isLeftPanelOpen.value = true
      }
      uiStore.isDailyDeskExpanded = true
    },
  })

  function openCommandPalette() {
    trigger('command-palette:open')
  }

  function openDailyDesk() {
    trigger('daily-desk:open')
  }

  function openSearch() {
    trigger('search:open')
  }

  return {
    openCommandPalette,
    openDailyDesk,
    openSearch,
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

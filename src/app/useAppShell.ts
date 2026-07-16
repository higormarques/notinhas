import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useBreakpoint } from '@/shared/composables/useBreakpoint'
import { useShortcuts } from '@/shared/composables/useShortcuts'
import { useTheme } from '@/shared/composables/useTheme'
import { useNotesStore } from '@/shared/stores/notes'
import { useUiStore } from '@/shared/stores/ui'
import { useWorkspaceStore } from '@/shared/stores/workspace'
import { openOrCreateHelpNote } from '@/features/help/helpNoteWriter'

export function useAppShell() {
  const { breakpoint } = useBreakpoint()
  const { theme, toggleTheme } = useTheme()
  const { register, trigger } = useShortcuts()
  const uiStore = useUiStore()
  const { isLeftPanelOpen, isRightPanelOpen, isLeftSheetOpen, isRightSheetOpen } =
    storeToRefs(uiStore)
  const workspaceStore = useWorkspaceStore()
  const { status: workspaceStatus, workspace } = storeToRefs(workspaceStore)
  const notesStore = useNotesStore()
  const queryClient = useQueryClient()

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

  const openHelpGuideMutation = useMutation({
    mutationFn: openOrCreateHelpNote,
    onSuccess: async (path) => {
      // A raiz precisa ser invalidada pra árvore de arquivos descobrir a nota de ajuda na
      // primeira vez que ela é criada — mesmo padrão de `useDailyDesk.ts` pra `Daily/`.
      await queryClient.invalidateQueries({ queryKey: ['directory', ''] })
      notesStore.openNote(path)
    },
  })

  function openHelpGuide() {
    void openHelpGuideMutation.mutateAsync()
  }

  return {
    openCommandPalette,
    openDailyDesk,
    openSearch,
    openHelpGuide,
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

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isLeftPanelOpen = ref(true)
  const isRightPanelOpen = ref(true)
  const isLeftSheetOpen = ref(false)
  const isRightSheetOpen = ref(false)
  const isDailyDeskExpanded = ref(true)

  function toggleLeftPanel() {
    isLeftPanelOpen.value = !isLeftPanelOpen.value
  }

  function toggleRightPanel() {
    isRightPanelOpen.value = !isRightPanelOpen.value
  }

  return {
    isLeftPanelOpen,
    isRightPanelOpen,
    isLeftSheetOpen,
    isRightSheetOpen,
    isDailyDeskExpanded,
    toggleLeftPanel,
    toggleRightPanel,
  }
})

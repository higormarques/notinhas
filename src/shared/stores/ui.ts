import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isLeftPanelOpen = ref(true)
  const isRightPanelOpen = ref(true)

  function toggleLeftPanel() {
    isLeftPanelOpen.value = !isLeftPanelOpen.value
  }

  function toggleRightPanel() {
    isRightPanelOpen.value = !isRightPanelOpen.value
  }

  return { isLeftPanelOpen, isRightPanelOpen, toggleLeftPanel, toggleRightPanel }
})

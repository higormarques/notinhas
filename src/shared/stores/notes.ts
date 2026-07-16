import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotesStore = defineStore('notes', () => {
  const openTabs = ref<string[]>([])
  const activeNotePath = ref<string | null>(null)

  function openNote(path: string) {
    if (!openTabs.value.includes(path)) {
      openTabs.value = [...openTabs.value, path]
    }
    activeNotePath.value = path
  }

  function closeTab(path: string) {
    const index = openTabs.value.indexOf(path)
    if (index === -1) return
    const remaining = openTabs.value.filter((openPath) => openPath !== path)
    openTabs.value = remaining
    if (activeNotePath.value !== path) return
    const fallback = remaining[Math.min(index, remaining.length - 1)]
    activeNotePath.value = fallback ?? null
  }

  function closeActiveNote() {
    if (activeNotePath.value) closeTab(activeNotePath.value)
  }

  function renameTab(fromPath: string, toPath: string) {
    const index = openTabs.value.indexOf(fromPath)
    if (index === -1) return
    const next = [...openTabs.value]
    next[index] = toPath
    openTabs.value = next
    if (activeNotePath.value === fromPath) activeNotePath.value = toPath
  }

  return { openTabs, activeNotePath, openNote, closeTab, closeActiveNote, renameTab }
})

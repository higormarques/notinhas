import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotesStore = defineStore('notes', () => {
  const activeNotePath = ref<string | null>(null)

  function openNote(path: string) {
    activeNotePath.value = path
  }

  function closeActiveNote() {
    activeNotePath.value = null
  }

  return { activeNotePath, openNote, closeActiveNote }
})

import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { watchDebounced } from '@vueuse/core'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { useNotesStore } from '@/shared/stores/notes'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DEBOUNCE_MS = 600

export function useNoteEditor() {
  const notesStore = useNotesStore()
  const { activeNotePath } = storeToRefs(notesStore)

  const content = ref('')
  const saveStatus = ref<SaveStatus>('idle')
  let lastSavedContent = ''

  const fileQuery = useQuery({
    queryKey: computed(() => ['file', activeNotePath.value] as const),
    queryFn: async () => {
      const path = activeNotePath.value
      if (!path) throw new Error('Nenhuma nota ativa.')
      return getStorageAdapter().readFile(path)
    },
    enabled: computed(() => activeNotePath.value !== null),
  })

  watch(
    () => fileQuery.data.value,
    (data) => {
      if (data === undefined) return
      content.value = data
      lastSavedContent = data
      saveStatus.value = 'idle'
    },
  )

  const saveMutation = useMutation({
    mutationFn: (vars: { path: string; content: string }) =>
      getStorageAdapter().writeFile(vars.path, vars.content),
  })

  watchDebounced(
    content,
    async (value) => {
      const path = activeNotePath.value
      if (!path || value === lastSavedContent) return
      saveStatus.value = 'saving'
      try {
        await saveMutation.mutateAsync({ path, content: value })
        lastSavedContent = value
        saveStatus.value = 'saved'
      } catch {
        saveStatus.value = 'error'
      }
    },
    { debounce: AUTOSAVE_DEBOUNCE_MS },
  )

  const noteName = computed(() => activeNotePath.value?.split('/').pop() ?? '')
  const isEmptyState = computed(() => activeNotePath.value === null)
  const isLoading = computed(() => fileQuery.isLoading.value)

  return {
    content,
    saveStatus,
    noteName,
    isEmptyState,
    isLoading,
  }
}

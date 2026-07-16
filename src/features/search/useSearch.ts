import { computed, ref } from 'vue'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { useNotesStore } from '@/shared/stores/notes'
import { useShortcuts } from '@/shared/composables/useShortcuts'
import { ensureIndexReady, getIndexStatus, search as searchIndex } from '@/shared/search/searchIndex'

export function useSearch() {
  const notesStore = useNotesStore()
  const { register } = useShortcuts()
  const indexStatus = getIndexStatus()

  const isOpen = ref(false)
  const query = ref('')

  register({
    id: 'search:open',
    keys: 'mod+shift+f',
    description: 'Buscar em todas as notas',
    handler: () => {
      open()
    },
  })

  function open() {
    isOpen.value = true
    // Dispara em segundo plano — `indexStatus` é reativo, então a UI (estado "construindo
    // índice…") atualiza sozinha conforme o progresso, sem precisar bloquear a abertura do
    // diálogo esperando a varredura completa terminar.
    void ensureIndexReady(getStorageAdapter())
  }

  function close() {
    isOpen.value = false
    query.value = ''
  }

  function handleOpenChange(value: boolean) {
    if (value) {
      open()
    } else {
      close()
    }
  }

  const results = computed(() => searchIndex(query.value))
  const isBuildingIndex = computed(() => indexStatus.value === 'building')
  const showEmptyState = computed(
    () => !isBuildingIndex.value && query.value.trim().length > 0 && results.value.length === 0,
  )

  function selectResult(path: string) {
    notesStore.openNote(path)
    close()
  }

  return {
    isOpen,
    open,
    handleOpenChange,
    query,
    results,
    isBuildingIndex,
    showEmptyState,
    selectResult,
  }
}

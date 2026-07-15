import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { useShortcuts } from '@/shared/composables/useShortcuts'
import { useTheme } from '@/shared/composables/useTheme'
import { useNotesStore } from '@/shared/stores/notes'

interface NoteOption {
  path: string
  name: string
}

async function listNotesRecursively(path: string): Promise<NoteOption[]> {
  const entries = await getStorageAdapter().listDirectory(path)
  const notes: NoteOption[] = []
  for (const entry of entries) {
    if (entry.kind === 'file') {
      notes.push({ path: entry.path, name: entry.name })
    } else {
      notes.push(...(await listNotesRecursively(entry.path)))
    }
  }
  return notes
}

function toNotePath(rawName: string): string {
  const trimmed = rawName.trim()
  return trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
}

export function useCommandPalette() {
  const notesStore = useNotesStore()
  const queryClient = useQueryClient()
  const { theme, toggleTheme } = useTheme()
  const { register } = useShortcuts()

  const isOpen = ref(false)
  const query = ref('')

  register({
    id: 'command-palette:open',
    keys: 'mod+k',
    description: 'Abrir paleta de comandos',
    handler: () => {
      isOpen.value = true
    },
  })

  const notesQuery = useQuery({
    queryKey: ['notes-index'] as const,
    queryFn: () => listNotesRecursively(''),
    enabled: isOpen,
    staleTime: 0,
  })

  const notes = computed(() => notesQuery.data.value ?? [])

  const createMutation = useMutation({
    mutationFn: (path: string) => getStorageAdapter().writeFile(path, ''),
  })

  const trimmedQuery = computed(() => query.value.trim())
  const candidatePath = computed(() => toNotePath(trimmedQuery.value))
  const hasExactMatch = computed(() =>
    notes.value.some((note) => note.path === candidatePath.value),
  )
  const showCreateOption = computed(
    () =>
      trimmedQuery.value.length > 0 &&
      !hasExactMatch.value &&
      !notesQuery.isLoading.value,
  )
  const createLabel = computed(() => `Criar nota "${trimmedQuery.value}"`)

  function open() {
    isOpen.value = true
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

  function handleQueryInput(event: Event) {
    query.value = (event.target as HTMLInputElement).value
  }

  function selectNote(path: string) {
    notesStore.openNote(path)
    close()
  }

  async function createNote() {
    const path = candidatePath.value
    await createMutation.mutateAsync(path)
    await queryClient.invalidateQueries({ queryKey: ['directory', ''] })
    notesStore.openNote(path)
    close()
  }

  function runToggleTheme() {
    toggleTheme()
    close()
  }

  return {
    isOpen,
    open,
    handleOpenChange,
    handleQueryInput,
    notes,
    showCreateOption,
    createLabel,
    selectNote,
    createNote,
    runToggleTheme,
    theme,
  }
}

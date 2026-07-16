import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { useShortcuts } from '@/shared/composables/useShortcuts'
import { useTheme } from '@/shared/composables/useTheme'
import { useNotesStore } from '@/shared/stores/notes'
import { parseSmartDate } from '@/entities/DailyNote'
import {
  DAILY_DIRECTORY,
  openOrCreateDailyNote,
} from '@/features/daily-desk/dailyNoteWriter'

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
  const { register, trigger } = useShortcuts()

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

  const smartDate = computed(() => parseSmartDate(trimmedQuery.value))
  const showSmartDateOption = computed(() => smartDate.value !== null)
  const smartDateLabel = computed(() => `Ir para ${smartDate.value}`)

  const dailyNoteMutation = useMutation({
    mutationFn: openOrCreateDailyNote,
    onSuccess: async (path) => {
      // A raiz também precisa ser invalidada: a primeira nota diária criada cria a pasta
      // `Daily/` em si, que a árvore de arquivos só descobre reconsultando a listagem raiz.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['directory', DAILY_DIRECTORY] }),
        queryClient.invalidateQueries({ queryKey: ['directory', ''] }),
      ])
      notesStore.openNote(path)
    },
  })

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

  async function goToSmartDate() {
    const date = smartDate.value
    if (!date) return
    await dailyNoteMutation.mutateAsync(date)
    close()
  }

  function openDailyDesk() {
    close()
    trigger('daily-desk:open')
  }

  function openSearch() {
    close()
    trigger('search:open')
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
    showSmartDateOption,
    smartDateLabel,
    goToSmartDate,
    openDailyDesk,
    openSearch,
    runToggleTheme,
    theme,
  }
}

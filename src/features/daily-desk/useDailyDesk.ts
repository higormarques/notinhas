import { computed, ref, shallowRef } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getLocalTimeZone, today } from '@internationalized/date'
import type { DateValue } from 'reka-ui'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { useNotesStore } from '@/shared/stores/notes'
import { useShortcuts } from '@/shared/composables/useShortcuts'
import { countIncompleteTasks, dailyNotePath, formatIsoDate } from '@/entities/DailyNote'
import { DAILY_DIRECTORY, listDailyDates, openOrCreateDailyNote } from './dailyNoteWriter'

export function useDailyDesk() {
  const notesStore = useNotesStore()
  const queryClient = useQueryClient()
  const { register } = useShortcuts()

  const isOpen = ref(false)
  const selectedDate = shallowRef<DateValue>(today(getLocalTimeZone()))
  const hoveredDate = ref<string | null>(null)

  register({
    id: 'daily-desk:open',
    keys: 'mod+j',
    description: 'Abrir Daily Desk',
    handler: () => {
      isOpen.value = true
    },
  })

  const directoryQuery = useQuery({
    queryKey: ['directory', DAILY_DIRECTORY] as const,
    queryFn: listDailyDates,
    enabled: isOpen,
    staleTime: 0,
  })

  const datesWithNotes = computed(() => new Set(directoryQuery.data.value ?? []))

  const previewQuery = useQuery({
    queryKey: computed(
      () => ['file', hoveredDate.value ? dailyNotePath(hoveredDate.value) : null] as const,
    ),
    queryFn: () => getStorageAdapter().readFile(dailyNotePath(hoveredDate.value as string)),
    enabled: computed(
      () => hoveredDate.value !== null && datesWithNotes.value.has(hoveredDate.value),
    ),
  })

  const previewTaskCount = computed(() => countIncompleteTasks(previewQuery.data.value ?? ''))
  const previewExcerpt = computed(() => {
    const data = previewQuery.data.value
    if (!data) return ''
    const firstLine = data.split('\n').find((line) => line.trim().length > 0) ?? ''
    return firstLine.replace(/^#+\s*/, '').slice(0, 80)
  })
  const isPreviewLoading = computed(() => previewQuery.isLoading.value)

  const openMutation = useMutation({
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
    hoveredDate.value = null
  }

  function handleOpenChange(value: boolean) {
    if (value) {
      open()
    } else {
      close()
    }
  }

  async function selectDate(value: DateValue) {
    selectedDate.value = value
    await openMutation.mutateAsync(value.toString())
    close()
  }

  function setHoveredDate(value: DateValue | null) {
    hoveredDate.value = value ? value.toString() : null
  }

  function hasNote(value: DateValue): boolean {
    return datesWithNotes.value.has(value.toString())
  }

  return {
    isOpen,
    open,
    close,
    handleOpenChange,
    selectedDate,
    selectDate,
    hasNote,
    setHoveredDate,
    previewTaskCount,
    previewExcerpt,
    isPreviewLoading,
    todayIso: formatIsoDate(),
  }
}

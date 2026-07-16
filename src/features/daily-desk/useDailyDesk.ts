import { computed, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getLocalTimeZone, today } from '@internationalized/date'
import type { DateValue } from 'reka-ui'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { useNotesStore } from '@/shared/stores/notes'
import { useUiStore } from '@/shared/stores/ui'
import { countIncompleteTasks, dailyNotePath, formatIsoDate } from '@/entities/DailyNote'
import { DAILY_DIRECTORY, listDailyDates, openOrCreateDailyNote } from './dailyNoteWriter'

export function useDailyDesk() {
  const notesStore = useNotesStore()
  const queryClient = useQueryClient()
  const uiStore = useUiStore()
  const { isDailyDeskExpanded } = storeToRefs(uiStore)

  const selectedDate = shallowRef<DateValue>(today(getLocalTimeZone()))
  const hoveredDate = ref<string | null>(null)

  const directoryQuery = useQuery({
    queryKey: ['directory', DAILY_DIRECTORY] as const,
    queryFn: listDailyDates,
    enabled: isDailyDeskExpanded,
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

  function handleExpandedChange(value: boolean) {
    uiStore.isDailyDeskExpanded = value
  }

  async function selectDate(value: DateValue) {
    selectedDate.value = value
    await openMutation.mutateAsync(value.toString())
  }

  function setHoveredDate(value: DateValue | null) {
    hoveredDate.value = value ? value.toString() : null
  }

  function hasNote(value: DateValue): boolean {
    return datesWithNotes.value.has(value.toString())
  }

  return {
    isExpanded: isDailyDeskExpanded,
    handleExpandedChange,
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

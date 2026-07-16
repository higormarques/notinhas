import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useNotesStore } from '@/shared/stores/notes'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import {
  ensureIndexReady,
  getIndexStatus,
  listTagsWithCounts,
  notesForTag,
  type SearchIndexEntry,
  type TagCount,
} from '@/shared/search/searchIndex'

/** Uma única lista achatada (mesmo padrão roving-tabindex de `useFileTree.ts`): quando nenhuma
 * tag está selecionada, as linhas são as tags; ao selecionar uma (Enter), as linhas passam a ser
 * as notas com aquela tag, com Escape voltando à lista de tags. */
export function useTagsPanel() {
  const notesStore = useNotesStore()

  const selectedTag = ref<string | null>(null)
  const focusedKey = ref<string | null>(null)
  const rowElements = new Map<string, HTMLElement>()

  onMounted(() => {
    void ensureIndexReady(getStorageAdapter())
  })

  const indexStatus = getIndexStatus()

  const tags = computed<TagCount[]>(() => listTagsWithCounts())
  const notesForSelectedTag = computed<SearchIndexEntry[]>(() =>
    selectedTag.value ? notesForTag(selectedTag.value) : [],
  )

  const rowKeys = computed<string[]>(() =>
    selectedTag.value
      ? notesForSelectedTag.value.map((entry) => `note:${entry.path}`)
      : tags.value.map((tagCount) => `tag:${tagCount.tag}`),
  )

  // Mantém `focusedKey` sempre apontando para uma linha existente (mesmo padrão de
  // `watch(rows, ...)` em `useFileTree.ts`) — sem isso, o roving tabindex fica com todo mundo em
  // `-1` até o usuário clicar, tornando a lista inalcançável só de teclado (Tab não entra nela).
  watch(
    rowKeys,
    (currentKeys) => {
      if (currentKeys.length === 0) {
        focusedKey.value = null
        return
      }
      if (!currentKeys.includes(focusedKey.value ?? '')) {
        focusedKey.value = currentKeys[0]
      }
    },
    { immediate: true },
  )

  function registerRowEl(key: string, el: Element | null) {
    if (el instanceof HTMLElement) {
      rowElements.set(key, el)
    } else {
      rowElements.delete(key)
    }
  }

  function focusRow(key: string) {
    focusedKey.value = key
    void nextTick(() => {
      rowElements.get(key)?.focus()
    })
  }

  function focusFirstRow() {
    const [first] = rowKeys.value
    if (first) focusRow(first)
    else focusedKey.value = null
  }

  function selectTag(tag: string) {
    selectedTag.value = tag
    void nextTick(focusFirstRow)
  }

  function clearSelectedTag() {
    const previousTag = selectedTag.value
    selectedTag.value = null
    void nextTick(() => {
      if (previousTag) focusRow(`tag:${previousTag}`)
      else focusFirstRow()
    })
  }

  function openNote(path: string) {
    notesStore.openNote(path)
  }

  function handleKeydown(event: KeyboardEvent) {
    const keys = rowKeys.value
    const currentIndex = keys.findIndex((key) => key === focusedKey.value)

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        const next = keys[currentIndex + 1]
        if (next) focusRow(next)
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        const prev = keys[currentIndex - 1]
        if (prev) focusRow(prev)
        break
      }
      case 'Enter': {
        event.preventDefault()
        if (currentIndex === -1) break
        if (selectedTag.value) {
          const entry = notesForSelectedTag.value[currentIndex]
          if (entry) openNote(entry.path)
        } else {
          const tagCount = tags.value[currentIndex]
          if (tagCount) selectTag(tagCount.tag)
        }
        break
      }
      case 'Escape': {
        if (selectedTag.value) {
          event.preventDefault()
          clearSelectedTag()
        }
        break
      }
    }
  }

  return {
    tags,
    selectedTag,
    notesForSelectedTag,
    focusedKey,
    indexStatus,
    registerRowEl,
    selectTag,
    clearSelectedTag,
    openNote,
    handleKeydown,
  }
}

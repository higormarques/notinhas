import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/shared/stores/notes'
import { getStorageAdapter } from '@/shared/storage/createStorageAdapter'
import { ensureIndexReady, notesLinkingTo, type SearchIndexEntry } from '@/shared/search/searchIndex'

/** Lista roving-tabindex (mesmo padrão de `useFileTree.ts`/`useTagsPanel.ts`) das notas que
 * linkam para a nota ativa via `[[link]]`. `notesLinkingTo` já é reativo porque `entries` é um
 * `reactive(Map)` do módulo `searchIndex.ts` — o `computed` abaixo reage tanto a mudanças no
 * índice quanto a trocas de nota ativa. */
export function useBacklinksPanel() {
  const notesStore = useNotesStore()
  const { activeNotePath } = storeToRefs(notesStore)

  const focusedPath = ref<string | null>(null)
  const rowElements = new Map<string, HTMLElement>()

  onMounted(() => {
    void ensureIndexReady(getStorageAdapter())
  })

  const backlinks = computed<SearchIndexEntry[]>(() =>
    activeNotePath.value ? notesLinkingTo(activeNotePath.value) : [],
  )
  const isEmptyState = computed(() => activeNotePath.value === null)

  // `{ immediate: true }` é essencial aqui: sem rodar já na primeira avaliação, uma lista de
  // backlinks não-vazia logo ao montar deixaria `focusedPath` em `null` (nenhuma linha com
  // tabindex="0") até alguma mudança posterior disparar o watcher — a lista ficaria inalcançável
  // por Tab desde o início, mesmo padrão de bug já corrigido em `useTagsPanel.ts`.
  watch(
    backlinks,
    (currentBacklinks) => {
      if (!currentBacklinks.some((entry) => entry.path === focusedPath.value)) {
        focusedPath.value = currentBacklinks[0]?.path ?? null
      }
    },
    { immediate: true },
  )

  function registerRowEl(path: string, el: Element | null) {
    if (el instanceof HTMLElement) {
      rowElements.set(path, el)
    } else {
      rowElements.delete(path)
    }
  }

  function focusRow(path: string) {
    focusedPath.value = path
    void nextTick(() => {
      rowElements.get(path)?.focus()
    })
  }

  function openNote(path: string) {
    notesStore.openNote(path)
  }

  function handleKeydown(event: KeyboardEvent) {
    const paths = backlinks.value.map((entry) => entry.path)
    const currentIndex = paths.findIndex((path) => path === focusedPath.value)

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        const next = paths[currentIndex + 1]
        if (next) focusRow(next)
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        const prev = paths[currentIndex - 1]
        if (prev) focusRow(prev)
        break
      }
      case 'Enter': {
        event.preventDefault()
        const path = paths[currentIndex]
        if (path) openNote(path)
        break
      }
    }
  }

  return {
    backlinks,
    isEmptyState,
    focusedPath,
    registerRowEl,
    openNote,
    handleKeydown,
  }
}

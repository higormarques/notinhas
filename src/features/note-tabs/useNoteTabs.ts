import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/shared/stores/notes'
import { titleFromPath } from '@/shared/search/searchIndex'

export interface NoteTab {
  path: string
  title: string
  isActive: boolean
}

export function useNoteTabs() {
  const notesStore = useNotesStore()
  const { openTabs, activeNotePath } = storeToRefs(notesStore)

  const focusedPath = ref<string | null>(activeNotePath.value)
  const tabElements = new Map<string, HTMLElement>()

  const tabs = computed<NoteTab[]>(() =>
    openTabs.value.map((path) => ({
      path,
      title: titleFromPath(path),
      isActive: path === activeNotePath.value,
    })),
  )

  const hasTabs = computed(() => tabs.value.length > 0)

  // Sempre que a nota ativa muda — abrir uma nota nova, ativar uma aba já aberta, ou o
  // fallback automático do store ao fechar a aba ativa — o cursor de teclado da tira de abas
  // acompanha. Só diverge de `activeNotePath` momentaneamente quando o usuário move o foco com
  // as setas sem ativar (ver `handleTabsKeydown`), quando este watcher não dispara porque
  // `activeNotePath` não mudou.
  watch(activeNotePath, (path) => {
    focusedPath.value = path
  })

  function registerTabEl(path: string, el: Element | null) {
    if (el instanceof HTMLElement) {
      tabElements.set(path, el)
    } else {
      tabElements.delete(path)
    }
  }

  function focusTab(path: string) {
    focusedPath.value = path
    void nextTick(() => {
      tabElements.get(path)?.focus()
    })
  }

  function activateTab(path: string) {
    notesStore.openNote(path)
    focusedPath.value = path
  }

  function closeTab(path: string) {
    // Fechar a aba ativa também atualiza `activeNotePath` no store, que o watcher acima já
    // propaga pra `focusedPath` — só precisa de reposicionamento manual aqui quando a aba
    // fechada era a que tinha o cursor de teclado mas não necessariamente a ativa (usuário
    // moveu o foco com as setas sem ativar, ou fechou pelo botão do mouse numa aba que não é a
    // focada).
    const wasFocused = path === focusedPath.value
    const index = openTabs.value.indexOf(path)
    notesStore.closeTab(path)
    if (!wasFocused) return

    const remaining = openTabs.value
    if (remaining.length === 0) {
      focusedPath.value = null
      return
    }
    focusTab(remaining[Math.min(index, remaining.length - 1)])
  }

  function handleTabsKeydown(event: KeyboardEvent) {
    const currentIndex = tabs.value.findIndex((tab) => tab.path === focusedPath.value)
    if (currentIndex === -1) return

    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault()
        const next = tabs.value[currentIndex + 1]
        if (next) focusTab(next.path)
        break
      }
      case 'ArrowLeft': {
        event.preventDefault()
        const prev = tabs.value[currentIndex - 1]
        if (prev) focusTab(prev.path)
        break
      }
      case 'Home': {
        event.preventDefault()
        focusTab(tabs.value[0].path)
        break
      }
      case 'End': {
        event.preventDefault()
        focusTab(tabs.value[tabs.value.length - 1].path)
        break
      }
      case 'Enter':
      case ' ': {
        event.preventDefault()
        activateTab(tabs.value[currentIndex].path)
        break
      }
      case 'Delete':
      case 'Backspace': {
        event.preventDefault()
        closeTab(tabs.value[currentIndex].path)
        break
      }
    }
  }

  return {
    tabs,
    hasTabs,
    focusedPath,
    registerTabEl,
    activateTab,
    closeTab,
    handleTabsKeydown,
  }
}

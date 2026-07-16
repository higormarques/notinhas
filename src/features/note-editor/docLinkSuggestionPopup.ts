import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'

/** Renderer DOM puro para o popup de autocomplete de `[[link]]` — o contrato `render()` do
 * `@tiptap/suggestion` é framework-agnostic (não roda dentro da árvore de componentes Vue), mesmo
 * padrão usado pela extensão oficial `@tiptap/extension-mention`. Posicionamento é delegado a
 * `props.mount` (gerenciado pelo próprio `@tiptap/suggestion` via `@floating-ui/dom` internamente
 * — reposiciona sozinho em scroll/resize, sem listeners manuais). */
export function renderDocLinkSuggestion() {
  let popup: HTMLDivElement | null = null
  let unmount: (() => void) | null = null
  let items: string[] = []
  let selectedIndex = 0
  let selectItem: ((item: string) => void) | null = null

  function renderItems(editorDom: HTMLElement): void {
    if (!popup) return
    popup.innerHTML = ''

    if (items.length === 0) {
      // `role="listbox"` exige ao menos um filho `option`/`group` (regra axe
      // `aria-required-children`) — o estado vazio também é um `option` (desabilitado, sem
      // handler de seleção) em vez de um `div` solto, mantendo a estrutura ARIA válida.
      const empty = document.createElement('div')
      empty.setAttribute('role', 'option')
      empty.setAttribute('aria-disabled', 'true')
      empty.setAttribute('aria-selected', 'false')
      empty.className = 'note-doclink-suggestion-empty'
      empty.textContent = 'Nenhuma nota encontrada'
      popup.appendChild(empty)
      editorDom.removeAttribute('aria-activedescendant')
      return
    }

    items.forEach((item, index) => {
      const option = document.createElement('div')
      option.id = `doclink-suggestion-${index}`
      option.setAttribute('role', 'option')
      option.setAttribute('aria-selected', String(index === selectedIndex))
      option.className = `note-doclink-suggestion-item${index === selectedIndex ? ' is-selected' : ''}`
      option.textContent = item
      option.addEventListener('mousedown', (event) => {
        event.preventDefault()
        selectItem?.(item)
      })
      popup?.appendChild(option)
    })
    editorDom.setAttribute('aria-activedescendant', `doclink-suggestion-${selectedIndex}`)
  }

  return {
    onStart: (props: SuggestionProps<string, string>) => {
      items = props.items
      selectedIndex = 0
      selectItem = props.command

      popup = document.createElement('div')
      popup.setAttribute('role', 'listbox')
      popup.setAttribute('aria-label', 'Sugestões de notas para linkar')
      popup.className = 'note-doclink-suggestion-popup'

      renderItems(props.editor.view.dom as HTMLElement)
      unmount = props.mount(popup)
    },

    onUpdate: (props: SuggestionProps<string, string>) => {
      items = props.items
      selectedIndex = 0
      selectItem = props.command
      renderItems(props.editor.view.dom as HTMLElement)
    },

    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (items.length === 0) return false

      if (props.event.key === 'ArrowDown') {
        selectedIndex = (selectedIndex + 1) % items.length
        renderItems(props.view.dom as HTMLElement)
        return true
      }
      if (props.event.key === 'ArrowUp') {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length
        renderItems(props.view.dom as HTMLElement)
        return true
      }
      if (props.event.key === 'Enter') {
        selectItem?.(items[selectedIndex])
        return true
      }
      // Escape: o próprio @tiptap/suggestion já intercepta e chama onExit independentemente do
      // que este handler retornar — nada a fazer aqui.
      return false
    },

    onExit: (props: SuggestionProps<string, string>) => {
      unmount?.()
      unmount = null
      popup = null
      ;(props.editor.view.dom as HTMLElement).removeAttribute('aria-activedescendant')
    },
  }
}

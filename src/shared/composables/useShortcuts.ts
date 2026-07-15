import { reactive } from 'vue'

export interface ShortcutDefinition {
  id: string
  /** ex.: 'mod+k' — 'mod' cobre Cmd (macOS) e Ctrl (Windows/Linux) */
  keys: string
  description: string
  handler: (event?: KeyboardEvent) => void
}

const registry = reactive(new Map<string, ShortcutDefinition>())

let isListening = false

function matches(event: KeyboardEvent, keys: string): boolean {
  const parts = keys.toLowerCase().split('+')
  const key = parts.pop()
  const needsMod = parts.includes('mod')
  const needsShift = parts.includes('shift')
  const hasMod = event.metaKey || event.ctrlKey
  return (
    event.key.toLowerCase() === key && hasMod === needsMod && event.shiftKey === needsShift
  )
}

function handleKeydown(event: KeyboardEvent) {
  for (const shortcut of registry.values()) {
    if (matches(event, shortcut.keys)) {
      event.preventDefault()
      shortcut.handler(event)
      return
    }
  }
}

function ensureListening() {
  if (isListening) return
  isListening = true
  window.addEventListener('keydown', handleKeydown)
}

export function useShortcuts() {
  function register(shortcut: ShortcutDefinition) {
    registry.set(shortcut.id, shortcut)
    ensureListening()
  }

  function unregister(id: string) {
    registry.delete(id)
  }

  /** Executa o handler de um atalho já registrado — usado por botões que replicam a mesma ação. */
  function trigger(id: string) {
    registry.get(id)?.handler()
  }

  return { register, unregister, trigger, shortcuts: registry }
}

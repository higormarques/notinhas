import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from './notes'

describe('useNotesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with no active note', () => {
    const store = useNotesStore()
    expect(store.activeNotePath).toBeNull()
  })

  it('opens and closes the active note', () => {
    const store = useNotesStore()

    store.openNote('Notas/bemvindo.md')
    expect(store.activeNotePath).toBe('Notas/bemvindo.md')

    store.closeActiveNote()
    expect(store.activeNotePath).toBeNull()
  })
})

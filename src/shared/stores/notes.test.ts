import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from './notes'

describe('useNotesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with no active note and no open tabs', () => {
    const store = useNotesStore()
    expect(store.activeNotePath).toBeNull()
    expect(store.openTabs).toEqual([])
  })

  it('opens and closes the active note', () => {
    const store = useNotesStore()

    store.openNote('Notas/bemvindo.md')
    expect(store.activeNotePath).toBe('Notas/bemvindo.md')

    store.closeActiveNote()
    expect(store.activeNotePath).toBeNull()
    expect(store.openTabs).toEqual([])
  })

  it('opens multiple notes as separate tabs without duplicating an already open one', () => {
    const store = useNotesStore()

    store.openNote('a.md')
    store.openNote('b.md')
    expect(store.openTabs).toEqual(['a.md', 'b.md'])
    expect(store.activeNotePath).toBe('b.md')

    store.openNote('a.md')
    expect(store.openTabs).toEqual(['a.md', 'b.md'])
    expect(store.activeNotePath).toBe('a.md')
  })

  it('closing a background tab keeps the active note unchanged', () => {
    const store = useNotesStore()
    store.openNote('a.md')
    store.openNote('b.md')
    store.openNote('c.md')
    store.openNote('b.md')

    store.closeTab('a.md')

    expect(store.openTabs).toEqual(['b.md', 'c.md'])
    expect(store.activeNotePath).toBe('b.md')
  })

  it('closing the active tab activates the tab that took its place', () => {
    const store = useNotesStore()
    store.openNote('a.md')
    store.openNote('b.md')
    store.openNote('c.md')

    store.closeTab('b.md')

    expect(store.openTabs).toEqual(['a.md', 'c.md'])
    expect(store.activeNotePath).toBe('c.md')
  })

  it('closing the last tab clears the active note', () => {
    const store = useNotesStore()
    store.openNote('a.md')

    store.closeTab('a.md')

    expect(store.openTabs).toEqual([])
    expect(store.activeNotePath).toBeNull()
  })

  it('renames a tab in place without changing its position or activation', () => {
    const store = useNotesStore()
    store.openNote('a.md')
    store.openNote('b.md')
    store.openNote('a.md')

    store.renameTab('a.md', 'a-renamed.md')

    expect(store.openTabs).toEqual(['a-renamed.md', 'b.md'])
    expect(store.activeNotePath).toBe('a-renamed.md')
  })
})

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from '@/shared/stores/notes'
import { useNoteTabs } from './useNoteTabs'

describe('useNoteTabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has no tabs when no note was opened', () => {
    const tabs = useNoteTabs()
    expect(tabs.hasTabs.value).toBe(false)
    expect(tabs.tabs.value).toEqual([])
  })

  it('lists every open note as a tab with the .md extension stripped, marking the active one', () => {
    useNotesStore().openNote('Notas/bemvindo.md')
    useNotesStore().openNote('Notas/outra.md')

    const tabs = useNoteTabs()

    expect(tabs.hasTabs.value).toBe(true)
    expect(tabs.tabs.value).toEqual([
      { path: 'Notas/bemvindo.md', title: 'bemvindo', isActive: false },
      { path: 'Notas/outra.md', title: 'outra', isActive: true },
    ])
  })

  it('activateTab switches which note is active without changing tab order', () => {
    useNotesStore().openNote('a.md')
    useNotesStore().openNote('b.md')
    const tabs = useNoteTabs()

    tabs.activateTab('a.md')

    expect(useNotesStore().activeNotePath).toBe('a.md')
    expect(tabs.tabs.value.map((tab) => tab.path)).toEqual(['a.md', 'b.md'])
    expect(tabs.focusedPath.value).toBe('a.md')
  })

  it('closeTab removes the tab and moves keyboard focus to the tab that takes its place', () => {
    useNotesStore().openNote('a.md')
    useNotesStore().openNote('b.md')
    useNotesStore().openNote('c.md')
    const tabs = useNoteTabs()
    tabs.focusedPath.value = 'b.md'

    tabs.closeTab('b.md')

    expect(tabs.tabs.value.map((tab) => tab.path)).toEqual(['a.md', 'c.md'])
    expect(tabs.focusedPath.value).toBe('c.md')
    expect(useNotesStore().activeNotePath).toBe('c.md')
  })

  it('closing the last tab clears focus', () => {
    useNotesStore().openNote('a.md')
    const tabs = useNoteTabs()

    tabs.closeTab('a.md')

    expect(tabs.hasTabs.value).toBe(false)
    expect(tabs.focusedPath.value).toBeNull()
  })

  it('handleTabsKeydown moves focus with ArrowRight/ArrowLeft without activating', () => {
    useNotesStore().openNote('a.md')
    useNotesStore().openNote('b.md')
    useNotesStore().openNote('c.md')
    const tabs = useNoteTabs()
    tabs.focusedPath.value = 'a.md'

    tabs.handleTabsKeydown({
      key: 'ArrowRight',
      preventDefault: () => {},
    } as KeyboardEvent)

    expect(tabs.focusedPath.value).toBe('b.md')
    // 'c.md' segue ativa — mover o foco com a seta não troca qual aba está sendo exibida.
    expect(useNotesStore().activeNotePath).toBe('c.md')
  })

  it('handleTabsKeydown activates the focused tab on Enter', () => {
    useNotesStore().openNote('a.md')
    useNotesStore().openNote('b.md')
    const tabs = useNoteTabs()
    tabs.focusedPath.value = 'a.md'

    tabs.handleTabsKeydown({ key: 'Enter', preventDefault: () => {} } as KeyboardEvent)

    expect(useNotesStore().activeNotePath).toBe('a.md')
  })

  it('handleTabsKeydown closes the focused tab on Delete', () => {
    useNotesStore().openNote('a.md')
    useNotesStore().openNote('b.md')
    const tabs = useNoteTabs()
    tabs.focusedPath.value = 'a.md'

    tabs.handleTabsKeydown({ key: 'Delete', preventDefault: () => {} } as KeyboardEvent)

    expect(tabs.tabs.value.map((tab) => tab.path)).toEqual(['b.md'])
  })
})

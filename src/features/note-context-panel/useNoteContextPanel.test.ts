import { describe, expect, it } from 'vitest'
import { useNoteContextPanel } from './useNoteContextPanel'

describe('useNoteContextPanel', () => {
  it('defaults to the backlinks tab', () => {
    const { activeTab } = useNoteContextPanel()
    expect(activeTab.value).toBe('backlinks')
  })

  it('allows switching to the properties tab', () => {
    const { activeTab } = useNoteContextPanel()
    activeTab.value = 'properties'
    expect(activeTab.value).toBe('properties')
  })
})

import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from './ui'

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with both panels open', () => {
    const store = useUiStore()
    expect(store.isLeftPanelOpen).toBe(true)
    expect(store.isRightPanelOpen).toBe(true)
  })

  it('toggles each panel independently', () => {
    const store = useUiStore()

    store.toggleLeftPanel()
    expect(store.isLeftPanelOpen).toBe(false)
    expect(store.isRightPanelOpen).toBe(true)

    store.toggleRightPanel()
    expect(store.isLeftPanelOpen).toBe(false)
    expect(store.isRightPanelOpen).toBe(false)
  })
})

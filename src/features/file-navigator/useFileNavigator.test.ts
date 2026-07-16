import { describe, expect, it } from 'vitest'
import { useFileNavigator } from './useFileNavigator'

describe('useFileNavigator', () => {
  it('defaults to the files tab', () => {
    const { activeTab } = useFileNavigator()
    expect(activeTab.value).toBe('files')
  })

  it('allows switching to the tags tab', () => {
    const { activeTab } = useFileNavigator()
    activeTab.value = 'tags'
    expect(activeTab.value).toBe('tags')
  })
})

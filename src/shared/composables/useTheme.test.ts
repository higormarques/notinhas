import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  it('toggles between light and dark, persisting to localStorage and the DOM class', async () => {
    const { theme, toggleTheme } = useTheme()
    const initial = theme.value

    toggleTheme()
    await nextTick()
    expect(theme.value).not.toBe(initial)
    expect(localStorage.getItem('notinhas-theme')).toBe(theme.value)
    expect(document.documentElement.classList.contains('dark')).toBe(
      theme.value === 'dark',
    )

    toggleTheme()
    await nextTick()
    expect(theme.value).toBe(initial)
  })
})

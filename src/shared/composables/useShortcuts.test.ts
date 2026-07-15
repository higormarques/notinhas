import { afterEach, describe, expect, it, vi } from 'vitest'
import { useShortcuts } from './useShortcuts'

function dispatchKeydown(init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, ...init }))
}

describe('useShortcuts', () => {
  afterEach(() => {
    const { shortcuts, unregister } = useShortcuts()
    for (const id of Array.from(shortcuts.keys())) unregister(id)
  })

  it('calls the handler when the registered key combo is pressed', () => {
    const { register } = useShortcuts()
    const handler = vi.fn()

    register({ id: 'test:mod-k', keys: 'mod+k', description: 'teste', handler })

    dispatchKeydown({ key: 'k', metaKey: true })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not call the handler when a modifier is missing', () => {
    const { register } = useShortcuts()
    const handler = vi.fn()

    register({ id: 'test:mod-k', keys: 'mod+k', description: 'teste', handler })

    dispatchKeydown({ key: 'k' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('stops calling the handler after unregister', () => {
    const { register, unregister } = useShortcuts()
    const handler = vi.fn()

    register({ id: 'test:mod-k', keys: 'mod+k', description: 'teste', handler })
    unregister('test:mod-k')

    dispatchKeydown({ key: 'k', ctrlKey: true })

    expect(handler).not.toHaveBeenCalled()
  })

  it('triggers a registered handler programmatically, for buttons that mirror a shortcut', () => {
    const { register, trigger } = useShortcuts()
    const handler = vi.fn()

    register({ id: 'test:mod-k', keys: 'mod+k', description: 'teste', handler })
    trigger('test:mod-k')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('exposes registered shortcuts for future consumers (e.g. Settings)', () => {
    const { register, shortcuts } = useShortcuts()

    register({ id: 'test:mod-k', keys: 'mod+k', description: 'Abrir paleta', handler: vi.fn() })

    expect(shortcuts.get('test:mod-k')?.description).toBe('Abrir paleta')
  })
})

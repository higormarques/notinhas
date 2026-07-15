import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceConnect } from './useWorkspaceConnect'
import * as storageAdapter from '@/shared/storage/createStorageAdapter'

vi.mock('@/shared/storage/createStorageAdapter', () => ({
  isFileSystemAccessSupported: vi.fn(),
  reconnectPersistedWorkspace: vi.fn(),
  connectFileSystemWorkspace: vi.fn(),
  connectOpfsWorkspace: vi.fn(),
}))

function mountComposable() {
  let result!: ReturnType<typeof useWorkspaceConnect>
  mount(
    defineComponent({
      setup() {
        result = useWorkspaceConnect()
        return () => null
      },
    }),
  )
  return result
}

describe('useWorkspaceConnect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(storageAdapter.isFileSystemAccessSupported).mockReturnValue(true)
  })

  it('reconnects automatically when a persisted workspace already has permission granted', async () => {
    vi.mocked(storageAdapter.reconnectPersistedWorkspace).mockResolvedValue({
      status: 'connected',
      workspace: { name: 'notas', adapterKind: 'file-system-access' },
    })

    const result = mountComposable()
    await flushPromises()

    expect(result.status.value).toBe('connected')
    expect(result.workspace.value?.name).toBe('notas')
  })

  it('exposes a reconnect action when permission must be re-requested, and connects on success', async () => {
    const requestPermission = vi.fn().mockResolvedValue({
      status: 'connected',
      workspace: { name: 'notas', adapterKind: 'file-system-access' },
    })
    vi.mocked(storageAdapter.reconnectPersistedWorkspace).mockResolvedValue({
      status: 'permission-required',
      requestPermission,
    })

    const result = mountComposable()
    await flushPromises()
    expect(result.status.value).toBe('permission-required')

    await result.requestPermission()
    expect(requestPermission).toHaveBeenCalledOnce()
    expect(result.status.value).toBe('connected')
  })

  it('moves to permission-denied when the user declines the re-requested permission', async () => {
    const requestPermission = vi.fn().mockResolvedValue({ status: 'permission-denied' })
    vi.mocked(storageAdapter.reconnectPersistedWorkspace).mockResolvedValue({
      status: 'permission-required',
      requestPermission,
    })

    const result = mountComposable()
    await flushPromises()
    await result.requestPermission()

    expect(result.status.value).toBe('permission-denied')
  })

  it('falls back to OPFS automatically when File System Access is unsupported', async () => {
    vi.mocked(storageAdapter.isFileSystemAccessSupported).mockReturnValue(false)
    vi.mocked(storageAdapter.connectOpfsWorkspace).mockResolvedValue({
      name: 'Workspace local (sandbox do navegador)',
      adapterKind: 'opfs',
    })

    const result = mountComposable()
    await flushPromises()

    expect(result.status.value).toBe('connected')
    expect(result.isOpfsFallback.value).toBe(true)
    expect(storageAdapter.reconnectPersistedWorkspace).not.toHaveBeenCalled()
  })

  it('sets an error message when connect() fails for a reason other than user cancellation', async () => {
    vi.mocked(storageAdapter.reconnectPersistedWorkspace).mockResolvedValue({
      status: 'not-found',
    })
    vi.mocked(storageAdapter.connectFileSystemWorkspace).mockRejectedValue(
      new Error('boom'),
    )

    const result = mountComposable()
    await flushPromises()

    await result.connect()
    expect(result.status.value).toBe('disconnected')
    expect(result.errorMessage.value).toBeTruthy()
  })

  it('does not surface an error message when the user cancels the directory picker', async () => {
    vi.mocked(storageAdapter.reconnectPersistedWorkspace).mockResolvedValue({
      status: 'not-found',
    })
    vi.mocked(storageAdapter.connectFileSystemWorkspace).mockRejectedValue(
      new DOMException('cancelled', 'AbortError'),
    )

    const result = mountComposable()
    await flushPromises()

    await result.connect()
    expect(result.status.value).toBe('disconnected')
    expect(result.errorMessage.value).toBeNull()
  })
})

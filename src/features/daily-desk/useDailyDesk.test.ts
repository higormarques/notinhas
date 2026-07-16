import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { CalendarDate } from '@internationalized/date'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDailyDesk } from './useDailyDesk'
import { useNotesStore } from '@/shared/stores/notes'
import * as storageAdapterModule from '@/shared/storage/createStorageAdapter'
import type { StorageAdapter } from '@/shared/storage/StorageAdapter'

vi.mock('@/shared/storage/createStorageAdapter', () => ({
  getStorageAdapter: vi.fn(),
}))

function mockToday(isoDate: string) {
  vi.setSystemTime(new Date(`${isoDate}T12:00:00`))
}

function createFakeAdapter(initialFiles: Record<string, string> = {}): StorageAdapter {
  const files = new Map(Object.entries(initialFiles))

  return {
    listDirectory: vi.fn(async (path: string) => {
      const prefix = `${path}/`
      const names = Array.from(files.keys())
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(prefix.length))
      if (names.length === 0) throw new Error(`not found: ${path}`)
      return names.map((name) => ({ name, path: `${path}/${name}`, kind: 'file' as const }))
    }),
    readFile: vi.fn(async (path: string) => {
      const value = files.get(path)
      if (value === undefined) throw new Error(`not found: ${path}`)
      return value
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content)
    }),
    createDirectory: vi.fn(async () => {}),
    deleteFile: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
  }
}

let queryClient: QueryClient

function mountComposable() {
  let result!: ReturnType<typeof useDailyDesk>
  const wrapper = mount(
    defineComponent({
      setup() {
        result = useDailyDesk()
        return () => null
      },
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient }]] } },
  )
  return { result, wrapper }
}

describe('useDailyDesk', () => {
  let adapter: StorageAdapter

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockToday('2026-07-15')
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates an empty note when selecting a date with no prior daily note', async () => {
    adapter = createFakeAdapter()
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    const { result } = mountComposable()
    await flushPromises()

    await result.selectDate(new CalendarDate(2026, 7, 15))
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith('Daily/2026-07-15.md', '')
    expect(useNotesStore().activeNotePath).toBe('Daily/2026-07-15.md')
    expect(result.isOpen.value).toBe(false)
  })

  it('opens an existing daily note without rewriting it', async () => {
    adapter = createFakeAdapter({ 'Daily/2026-07-10.md': 'conteúdo existente' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    const { result } = mountComposable()
    await flushPromises()

    await result.selectDate(new CalendarDate(2026, 7, 10))
    await flushPromises()

    expect(adapter.writeFile).not.toHaveBeenCalled()
    expect(useNotesStore().activeNotePath).toBe('Daily/2026-07-10.md')
  })

  it('migrates incomplete tasks from the most recent prior daily note when creating today', async () => {
    adapter = createFakeAdapter({
      'Daily/2026-07-13.md': '# 13 de julho\n- [ ] revisar PR\n- [x] tarefa feita\n- [ ] responder email',
    })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    const { result } = mountComposable()
    await flushPromises()

    await result.selectDate(new CalendarDate(2026, 7, 15))
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith(
      'Daily/2026-07-13.md',
      '# 13 de julho\n- [x] tarefa feita',
    )
    expect(adapter.writeFile).toHaveBeenCalledWith(
      'Daily/2026-07-15.md',
      '## Migrado de 2026-07-13\n- [ ] revisar PR\n- [ ] responder email\n',
    )
  })

  it('does not migrate tasks when creating a note for a date other than today', async () => {
    adapter = createFakeAdapter({
      'Daily/2026-07-13.md': '- [ ] tarefa pendente',
    })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    const { result } = mountComposable()
    await flushPromises()

    await result.selectDate(new CalendarDate(2026, 7, 20))
    await flushPromises()

    expect(adapter.writeFile).toHaveBeenCalledWith('Daily/2026-07-20.md', '')
    expect(adapter.writeFile).not.toHaveBeenCalledWith('Daily/2026-07-13.md', expect.anything())
  })

  it('reports whether a date has a note via hasNote once the directory listing loads', async () => {
    adapter = createFakeAdapter({ 'Daily/2026-07-10.md': 'nota' })
    vi.mocked(storageAdapterModule.getStorageAdapter).mockReturnValue(adapter)
    const { result } = mountComposable()
    result.open()
    await flushPromises()

    expect(result.hasNote(new CalendarDate(2026, 7, 10))).toBe(true)
    expect(result.hasNote(new CalendarDate(2026, 7, 11))).toBe(false)
  })
})

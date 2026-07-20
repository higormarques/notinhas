import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { isGa4ConfiguredMock, loadGa4Mock } = vi.hoisted(() => ({
  isGa4ConfiguredMock: vi.fn(),
  loadGa4Mock: vi.fn(),
}))

vi.mock('@/shared/analytics/ga4', () => ({
  isGa4Configured: isGa4ConfiguredMock,
  loadGa4: loadGa4Mock,
}))

const STORAGE_KEY = 'notinhas-analytics-consent'

async function importFreshModule() {
  vi.resetModules()
  return await import('./useAnalyticsConsent')
}

describe('useAnalyticsConsent', () => {
  beforeEach(() => {
    localStorage.clear()
    isGa4ConfiguredMock.mockReset().mockReturnValue(true)
    loadGa4Mock.mockClear()
  })

  it('starts unknown and shows the banner when ga4 is configured', async () => {
    const { useAnalyticsConsent } = await importFreshModule()
    const { status, isBannerVisible } = useAnalyticsConsent()

    expect(status.value).toBe('unknown')
    expect(isBannerVisible.value).toBe(true)
    expect(loadGa4Mock).not.toHaveBeenCalled()
  })

  it('hides the banner when ga4 is not configured', async () => {
    isGa4ConfiguredMock.mockReturnValue(false)
    const { useAnalyticsConsent } = await importFreshModule()
    const { isBannerVisible } = useAnalyticsConsent()

    expect(isBannerVisible.value).toBe(false)
  })

  it('granting consent persists it and loads ga4', async () => {
    const { useAnalyticsConsent } = await importFreshModule()
    const { status, isBannerVisible, grantConsent } = useAnalyticsConsent()

    grantConsent()
    await nextTick()

    expect(status.value).toBe('granted')
    expect(loadGa4Mock).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('granted')
    expect(isBannerVisible.value).toBe(false)
  })

  it('denying consent persists it without loading ga4', async () => {
    const { useAnalyticsConsent } = await importFreshModule()
    const { status, isBannerVisible, denyConsent } = useAnalyticsConsent()

    denyConsent()
    await nextTick()

    expect(status.value).toBe('denied')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('denied')
    expect(loadGa4Mock).not.toHaveBeenCalled()
    expect(isBannerVisible.value).toBe(false)
  })

  it('reads a previously stored consent decision on init and loads ga4 if granted', async () => {
    localStorage.setItem(STORAGE_KEY, 'granted')
    const { useAnalyticsConsent } = await importFreshModule()
    const { status } = useAnalyticsConsent()

    expect(status.value).toBe('granted')
    expect(loadGa4Mock).toHaveBeenCalledTimes(1)
  })
})

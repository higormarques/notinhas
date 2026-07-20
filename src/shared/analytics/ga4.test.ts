import { afterEach, describe, expect, it, vi } from 'vitest'

async function importFreshModule() {
  vi.resetModules()
  return await import('./ga4')
}

describe('ga4', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    document.head.innerHTML = ''
    delete window.dataLayer
  })

  it('is not configured when no measurement id is set', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', '')
    const { isGa4Configured } = await importFreshModule()

    expect(isGa4Configured()).toBe(false)
  })

  it('is configured when a measurement id is set', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-TEST123456')
    const { isGa4Configured } = await importFreshModule()

    expect(isGa4Configured()).toBe(true)
  })

  it('does nothing when loaded without a measurement id', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', '')
    const { loadGa4 } = await importFreshModule()

    loadGa4()

    expect(document.head.querySelector('script[src*="googletagmanager"]')).toBeNull()
  })

  it('injects the gtag script and pushes the config event once', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-TEST123456')
    const { loadGa4 } = await importFreshModule()

    loadGa4()
    loadGa4()

    const script = document.head.querySelector<HTMLScriptElement>(
      'script[src*="googletagmanager"]',
    )
    expect(script?.src).toContain('id=G-TEST123456')
    expect(
      document.head.querySelectorAll('script[src*="googletagmanager"]'),
    ).toHaveLength(1)
    expect(window.dataLayer).toEqual([
      ['js', expect.any(Date)],
      ['config', 'G-TEST123456', { anonymize_ip: true }],
    ])
  })
})

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

/**
 * A env var só é setada pelo passo `pnpm build` do job `deploy` do CI (ver ADR 0008) — nunca em
 * `pnpm dev`/`pnpm build`/`pnpm preview` locais. A presença dela é o único gate; não há checagem
 * adicional de `import.meta.env.PROD`.
 */
export function isGa4Configured(): boolean {
  return Boolean(import.meta.env.VITE_GA4_MEASUREMENT_ID)
}

let loaded = false

export function loadGa4(): void {
  const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID
  if (loaded || !measurementId) return
  loaded = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer ?? []
  const gtag = (...args: unknown[]) => window.dataLayer!.push(args)
  gtag('js', new Date())
  gtag('config', measurementId, { anonymize_ip: true })
}

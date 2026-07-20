import { computed, ref, watchEffect } from 'vue'
import { isGa4Configured, loadGa4 } from '@/shared/analytics/ga4'

export type ConsentStatus = 'granted' | 'denied' | 'unknown'

const STORAGE_KEY = 'notinhas-analytics-consent'

function getInitialStatus(): ConsentStatus {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'granted' || stored === 'denied') return stored
  return 'unknown'
}

const status = ref<ConsentStatus>(getInitialStatus())

watchEffect(() => {
  if (status.value === 'unknown') return
  localStorage.setItem(STORAGE_KEY, status.value)
})

if (status.value === 'granted') loadGa4()

export function useAnalyticsConsent() {
  const isBannerVisible = computed(() => isGa4Configured() && status.value === 'unknown')

  function grantConsent(): void {
    status.value = 'granted'
    loadGa4()
  }

  function denyConsent(): void {
    status.value = 'denied'
  }

  return { status, isBannerVisible, grantConsent, denyConsent }
}

import { useAnalyticsConsent } from '@/shared/composables/useAnalyticsConsent'

export function useAnalyticsConsentBanner() {
  const { isBannerVisible, grantConsent, denyConsent } = useAnalyticsConsent()

  return { isBannerVisible, grantConsent, denyConsent }
}

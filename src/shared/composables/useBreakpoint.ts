import { onBeforeUnmount, onMounted, ref } from 'vue'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

const TABLET_QUERY = '(min-width: 768px)'
const DESKTOP_QUERY = '(min-width: 1280px)'

function resolveBreakpoint(isTablet: boolean, isDesktop: boolean): Breakpoint {
  if (isDesktop) return 'desktop'
  if (isTablet) return 'tablet'
  return 'mobile'
}

export function useBreakpoint() {
  const tabletQuery = window.matchMedia(TABLET_QUERY)
  const desktopQuery = window.matchMedia(DESKTOP_QUERY)

  const breakpoint = ref<Breakpoint>(
    resolveBreakpoint(tabletQuery.matches, desktopQuery.matches),
  )

  function update() {
    breakpoint.value = resolveBreakpoint(tabletQuery.matches, desktopQuery.matches)
  }

  onMounted(() => {
    tabletQuery.addEventListener('change', update)
    desktopQuery.addEventListener('change', update)
  })

  onBeforeUnmount(() => {
    tabletQuery.removeEventListener('change', update)
    desktopQuery.removeEventListener('change', update)
  })

  return { breakpoint }
}

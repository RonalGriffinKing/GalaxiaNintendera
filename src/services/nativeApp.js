import { Capacitor } from '@capacitor/core'

let cleanupListeners = []

const markNativeState = (active = true) => {
  document.documentElement.classList.toggle('is-native-app', active)
  document.documentElement.classList.toggle('is-native-paused', !active)
}

export const initializeNativeApp = async (router) => {
  if (!Capacitor.isNativePlatform()) return

  markNativeState(true)

  const [
    { App },
    { Haptics, ImpactStyle },
    { SplashScreen },
    { StatusBar, Style }
  ] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/haptics'),
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar')
  ])

  await Promise.allSettled([
    StatusBar.setStyle({ style: Style.Dark })
  ])

  cleanupListeners = await Promise.all([
    App.addListener('backButton', ({ canGoBack }) => {
      const backEvent = new CustomEvent('galaxia:native-back', { cancelable: true })
      if (!window.dispatchEvent(backEvent)) return

      if (canGoBack && router.currentRoute.value.path !== '/') {
        router.back()
        return
      }

      App.exitApp()
    }),
    App.addListener('appStateChange', ({ isActive }) => {
      markNativeState(isActive)
    }),
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        const destination = new URL(url)
        const fullPath = `${destination.pathname}${destination.search}${destination.hash}`
        if (fullPath !== router.currentRoute.value.fullPath) router.push(fullPath)
      } catch (error) {
        console.warn('No se pudo abrir el enlace de la app', error)
      }
    })
  ])

  const provideHapticFeedback = (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('button, [role="button"], .native-haptic')
      : null

    if (!target || target.matches(':disabled, [aria-disabled="true"]')) return
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  }

  document.addEventListener('pointerup', provideHapticFeedback, { passive: true })
  cleanupListeners.push({ remove: () => document.removeEventListener('pointerup', provideHapticFeedback) })

  await router.isReady()
  await SplashScreen.hide({ fadeOutDuration: 220 }).catch(() => {})
}

export const destroyNativeApp = async () => {
  const listeners = cleanupListeners
  cleanupListeners = []
  await Promise.allSettled(listeners.map(listener => listener.remove()))
}

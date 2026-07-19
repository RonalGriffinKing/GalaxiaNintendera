import { computed, onUnmounted, ref } from 'vue'

export const LOADING_TYPES = {
  FULL_SCREEN: 'full-screen',
  CONTENT: 'content',
  SKELETON: 'skeleton',
  INLINE: 'inline',
  SILENT: 'silent'
}

export const createLoadingManager = ({
  silentDelay = 250,
  skeletonDelay = 600,
  minVisible = 160
} = {}) => {
  const active = ref(false)
  const type = ref(LOADING_TYPES.SILENT)
  const operation = ref('')
  const visibleSince = ref(0)
  const token = ref(0)
  const timers = new Set()

  const clearTimers = () => {
    timers.forEach(clearTimeout)
    timers.clear()
  }

  const setTimer = (callback, delay) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      callback()
    }, delay)
    timers.add(timer)
    return timer
  }

  const start = ({ id = '', mode = LOADING_TYPES.CONTENT } = {}) => {
    clearTimers()
    token.value += 1
    const currentToken = token.value
    operation.value = id
    active.value = false
    type.value = LOADING_TYPES.SILENT

    if (mode === LOADING_TYPES.FULL_SCREEN) {
      active.value = true
      type.value = LOADING_TYPES.FULL_SCREEN
      visibleSince.value = Date.now()
      return currentToken
    }

    setTimer(() => {
      if (token.value !== currentToken) return
      active.value = true
      type.value = LOADING_TYPES.INLINE
      visibleSince.value = Date.now()
    }, silentDelay)

    setTimer(() => {
      if (token.value !== currentToken) return
      active.value = true
      type.value = LOADING_TYPES.SKELETON
      visibleSince.value = Date.now()
    }, skeletonDelay)

    return currentToken
  }

  const finish = (currentToken = token.value) => {
    if (currentToken !== token.value) return
    clearTimers()

    if (!active.value) {
      type.value = LOADING_TYPES.SILENT
      return
    }

    const elapsed = Date.now() - visibleSince.value
    const wait = Math.max(0, minVisible - elapsed)
    setTimer(() => {
      if (currentToken !== token.value) return
      active.value = false
      type.value = LOADING_TYPES.SILENT
      operation.value = ''
    }, wait)
  }

  const isInline = computed(() => active.value && type.value === LOADING_TYPES.INLINE)
  const isSkeleton = computed(() => active.value && type.value === LOADING_TYPES.SKELETON)
  const isFullScreen = computed(() => active.value && type.value === LOADING_TYPES.FULL_SCREEN)

  onUnmounted(clearTimers)

  return {
    active,
    type,
    operation,
    start,
    finish,
    isInline,
    isSkeleton,
    isFullScreen
  }
}

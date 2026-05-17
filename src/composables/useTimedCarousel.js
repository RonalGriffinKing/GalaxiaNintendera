import { computed, onUnmounted, ref, watch } from 'vue'

export function useTimedCarousel(itemCount, durationMs) {
  const index = ref(0)
  const progressPercent = ref(0)
  const maxIndex = computed(() => Math.max(0, Number(itemCount.value || 0) - 1))
  let rotationTimer = null
  let progressTimer = null

  const stop = () => {
    clearInterval(rotationTimer)
    clearInterval(progressTimer)
    rotationTimer = null
    progressTimer = null
  }

  const startProgress = () => {
    clearInterval(progressTimer)
    progressPercent.value = 0
    const startedAt = Date.now()
    progressTimer = setInterval(() => {
      progressPercent.value = Math.min(100, ((Date.now() - startedAt) / durationMs) * 100)
    }, 120)
  }

  const start = () => {
    stop()
    startProgress()
    rotationTimer = setInterval(() => {
      index.value = index.value >= maxIndex.value ? 0 : index.value + 1
      startProgress()
    }, durationMs)
  }

  const restart = () => {
    start()
  }

  const select = (nextIndex) => {
    index.value = Math.max(0, Math.min(maxIndex.value, Number(nextIndex || 0)))
    restart()
  }

  const next = () => {
    index.value = index.value >= maxIndex.value ? 0 : index.value + 1
    restart()
  }

  const previous = () => {
    index.value = index.value <= 0 ? maxIndex.value : index.value - 1
    restart()
  }

  watch(maxIndex, (nextMax) => {
    if (index.value > nextMax) index.value = nextMax
  })

  onUnmounted(stop)

  return {
    index,
    progressPercent,
    maxIndex,
    start,
    stop,
    restart,
    select,
    next,
    previous
  }
}

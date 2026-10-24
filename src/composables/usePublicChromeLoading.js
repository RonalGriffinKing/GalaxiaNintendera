import { computed, ref } from 'vue'

export const homeWelcomeLoading = ref(false)
export const publicRouteLoading = ref(false)
export const publicChromeLoading = computed(() => homeWelcomeLoading.value || publicRouteLoading.value)

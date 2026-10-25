import { computed, ref, shallowRef } from 'vue'

export const homeWelcomeLoading = ref(false)
export const publicRouteLoading = ref(false)
export const publicNavigationOverlayOpen = ref(false)
export const publicReadingControlsHidden = ref(false)
export const publicChromeLoading = computed(() => homeWelcomeLoading.value || publicRouteLoading.value)

export const publicReadingHeaderHidden = ref(false)

export const publicSearchRequest = shallowRef(null)
export function requestPublicSearch(trigger) { publicSearchRequest.value = { trigger } }

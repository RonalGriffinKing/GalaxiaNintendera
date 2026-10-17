import { computed, onMounted, onUnmounted, ref } from 'vue'
import { loadVisualThemes, resolveVisualTheme } from '@/services/visualThemes'

export function useVisualThemes(post = () => ({})) {
  const themes=ref(loadVisualThemes().themes)
  const enabled=ref({web:true,social:true})
  function refresh() {
    themes.value=loadVisualThemes().themes
    try {const value=JSON.parse(localStorage.getItem('galaxia-visual-theme-integrations')||'{}');enabled.value={web:value.web!==false,social:value.social!==false}} catch {enabled.value={web:true,social:true}}
  }
  refresh()
  const theme=computed(()=>resolveVisualTheme(post()?.visualThemeId,themes.value))
  onMounted(()=>{window.addEventListener('storage',refresh);window.addEventListener('galaxia-themes-changed',refresh)})
  onUnmounted(()=>{window.removeEventListener('storage',refresh);window.removeEventListener('galaxia-themes-changed',refresh)})
  return {themes,theme,enabled,refresh}
}

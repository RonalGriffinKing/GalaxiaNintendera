import { computed, onMounted, onUnmounted, ref } from 'vue'
import { loadVisualThemes, resolvePostVisualTheme } from '@/services/visualThemes'

export function useVisualThemes(post = () => ({}), options = {}) {
  const themes=ref(loadVisualThemes().themes)
  const enabled=ref({web:true,social:true})
  function refresh() {
    themes.value=loadVisualThemes().themes
    try {const value=JSON.parse(localStorage.getItem('galaxia-visual-theme-integrations')||'{}');enabled.value={web:value.web!==false,social:value.social!==false}} catch {enabled.value={web:true,social:true}}
  }
  refresh()
  const theme=computed(()=>resolvePostVisualTheme(post(),themes.value,options))
  onMounted(()=>{window.addEventListener('storage',refresh);window.addEventListener('galaxia-themes-changed',refresh)})
  onUnmounted(()=>{window.removeEventListener('storage',refresh);window.removeEventListener('galaxia-themes-changed',refresh)})
  return {themes,theme,enabled,refresh}
}

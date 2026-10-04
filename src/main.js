import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initializeNativeApp } from './services/nativeApp'
import './style.css'

createApp(App).use(router).mount('#app')

initializeNativeApp(router).catch((error) => {
  console.error('No se pudo iniciar la integracion Android', error)
})

if ('serviceWorker' in navigator && import.meta.env.PROD && !document.documentElement.classList.contains('is-native-app')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('No se pudo registrar la app movil', error)
    })
  })
}

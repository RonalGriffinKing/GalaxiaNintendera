# 09. Optimización

No se ejecutaron benchmarks ni se atribuyen mejoras cuantitativas.

## Evidencia y oportunidades

- Las rutas de páginas son lazy-loaded; `DashboardPage.vue` carga módulos administrativos con `defineAsyncComponent` y `KeepAlive`. La UI admin sigue dentro del mismo SPA y comparte shell/dependencias; medir chunks de build para cuantificar impacto.
- Firebase SDK modular y muchas consultas se encuentran directamente en páginas. Revisar consultas completas de `Home2Page.vue`, `CategoryPage.vue`, `ProfilePage.vue` y `PostPage.vue`: evitar cargar colecciones completas para selección, limitar resultados, agregar índices requeridos y cachear solo datos públicos.
- `Home2Page.vue` usa `requestPublicPage` cache; `publicPageCache.js` tiene pruebas. Verificar invalidación frente a actualización editorial y límites de frescura.
- El bundle base incluye Firebase, Vue Router y varios paquetes de medios (`mediabunny`, `jszip`, `html-to-image`, Socket.IO client, tmi.js). Confirmar imports y visualización del chunk analyzer antes de eliminar o reubicar algo.
- Exportación de PNG/ZIP/video, previews y widget effects son funcionalidades de editor; mantenerlos fuera del bundle inicial visitante mediante entrypoints/chunks independientes si análisis confirma que se descargan hoy.
- Netlify functions implementan cache/coalescing para perfiles Nintendo/Xbox; comprobar métricas de hit ratio, latencia, cuota upstream y tamaños en producción.
- `server.js` tiene una conexión TikTok compartida global; revisar concurrencia y consumo; no es una recomendación de rendimiento hasta medir.
- Service worker puede acelerar visitas repetidas, pero debe verificarse versión/invalidación para evitar assets viejos.
- Realtime ya aporta valor en feeds/chat/notificaciones y overlay OBS: `onSnapshot` del viewer aplica cambios guardados sin recarga. Para edición administrativa multi-device basta Firestore al guardar; no abrir listeners duplicados si no hay coedición.
- Distinguir cache SDK, cache pública en memoria y localStorage. No convertir datos privados ni tokens en configuración sincronizada.

## Mediciones que faltan

Registrar baseline reproducible: tamaño comprimido por chunk y JS inicial, LCP/INP/CLS móvil, tiempo Firestore por vista, número/documentos descargados, memoria y tasa de errores, TTFB/functions/cache hit y bytes de assets. Comparar antes/después por ruta y dispositivo. No retirar dependencias/código hasta demostrar uso/no uso.

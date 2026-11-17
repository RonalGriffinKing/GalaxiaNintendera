# 05. Funcionalidades descubiertas que no estaban en los requisitos iniciales

1. **Participación comunitaria:** comunidades, hilos, composer global, edición de hilos y selección de GIF/stickers (`components/community`, `components/thread`, colecciones `communities`/`communityThreads`).
2. **Gamificación de lectura:** estrellas, lectura temporizada, progreso, colección/equipamiento de iconos, catálogo administrable, logros y endpoint privilegiado (`profile-progress.js`, `progress-service.js`).
3. **Contenido social y editorial visual:** generación de invitaciones de eventos, exportación social de posts, inspector de capas, arrastre y temas para artes (`EventSharePage.vue`, `PostSharePage.vue`, `social*`).
4. **Overlays de streaming** y widgets Goal/Todo/Chat/Timer/Now Playing/Camera Frame/Camera Background; formatos horizontal/vertical, geometría, fuentes de playback y estados de fuente.
5. **Biblioteca de temas visuales local:** presets, temas estacionales, editar/clonar/archivar, controles de aplicación, validación de contraste, snapshots en post. Al persistir en localStorage, tema global del admin no se sincroniza automáticamente a Windows/Android.
   - `galaxia-visual-themes-v1` y `-history`: temas y hasta cinco snapshots históricos.
   - `galaxia-visual-theme-integrations`: flags web/social, indicados como solo este navegador.
   - `galaxia-social-library`, `galaxia-social-template[-<style>]`: plantillas y preferencias de exportación; hay espejo parcial Firestore `users/{uid}/socialTemplates`.
   - `viewedPosts:<uid>` y claves de continuación: historial/punto de retorno local además de parte del progreso Firebase.
   - `ruzafa-creative-label`, `ruzafa-printer-action-order`, `ruzafa-printer-reminder-dismissed-at`: preferencias de impresora locales.
   - Favoritos de comunidades, hints de comunidad/navegación móvil, búsquedas recientes, ruta pública y bienvenida: preferencia UX; bienvenida/ruta también usan sessionStorage.
6. **CMS dinámico:** páginas por bloques, legales, footer, landings, guías, home sections y tipos especiales (`sitePages.js`).
7. **Integraciones gamer:** vinculación Nintendo/Xbox, presencia/tiempo de juego y logros; servicios proxy y claves server-side.
8. **IGDB, Giphy, proxy de imágenes y feed YouTube** para datos/media externos.
9. **Calendario de vacaciones y su herramienta de impresión** Russafa: propuestas, reservas, excepciones, cuotas, días bloqueados, conflictos y múltiples locales. Audiencia/propietario real queda por confirmar.
10. **Puente TikTok Live/Socket.IO** para chat en widgets; no es una Netlify Function ni comparte el modelo Firebase.
11. **PWA/service worker**, SEO dinámico, sitemap y robots personalizados.
12. **Notificaciones** y avisos; el almacenamiento, disparadores y retención requieren revisión adicional.
13. **Compatibilidad de rutas antiguas** y enlaces directos a editores/compartir, además de rutas query-based del Gestor Global.
14. **Herramientas de desarrollo:** laboratorios de overlays/perfiles/temas y muchos verificadores visuales de features. No son producto, pero forman parte de la capacidad de mantenimiento y evidencia.
15. **Referencias a emails:** existe la carpeta vacía `emails/`, sin función comprobable en el código enumerado.

## Pendientes específicos

- Confirmar en Netlify qué versión de reglas Firestore/Storage está desplegada y revisar las reglas completas por colección.
- Overlay no tiene respaldo local alternativo observado: definición completa se persiste en `overlays/{uid}/items/{id}`.
- Determinar si vacaciones/impresora Russafa pertenece al producto público, a una organización distinta o es herramienta privada.
- Identificar si `PublicQuickAdminModals.vue`, `PublicCreateSheet.vue` y acciones de navbar exponen atajos editoriales o comunitarios fuera del Dashboard.
- Verificar notificaciones, relaciones/seguimiento, reportes, moderación y borrado en reglas reales.
- Confirmar proveedor/dominio del Socket.IO y quién puede elegir canales TikTok.
- Revisar archivos fuera de repo/servicios cloud: tareas programadas, triggers Firebase, buckets, backups, reglas activas y proveedores de despliegue.

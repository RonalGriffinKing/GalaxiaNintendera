# 01. Inventario funcional completo

**Fecha de auditoría:** 2026-11-15. **Estado:** inventario estático amplio; no es certificación de producción. El proyecto contiene una SPA Vue 3/Vite, Firebase cliente, funciones Netlify, un servidor Socket.IO separado y almacenamiento Netlify Blobs.

## Alcance y método

Se inspeccionaron los puntos de entrada (`package.json`, `index.html`, `src/main.js`, `src/App.vue`, `src/router/index.js`, `vite.config.js`, `netlify.toml`), las 19 páginas Vue, el gestor, los componentes por dominio (131 archivos), los servicios (93 archivos), las 8 funciones Netlify y `server/server.js`; también se listaron documentación, ejemplos, pruebas, reglas candidatas y scripts. Se excluyeron dependencias instaladas y artefactos compilados del conteo del código fuente. No se enumeraron uno por uno todos los eventos DOM; se agruparon en funcionalidades verificables. La matriz maestra es `11-matriz-de-trazabilidad.md`.

**No verificado:** reglas Firebase actualmente desplegadas, contenido real de bases de datos, configuración Netlify/proveedor Node en producción, secretos válidos, flujos con cuentas reales, rendimiento medido, referencias dinámicas que se resuelvan solo en runtime. `security/firestore/*.proposed.rules` son propuestas/emuladores, no evidencia de despliegue.

## Arquitectura técnica observada

- Frontend: Vue 3 + Vue Router + Vite; rutas lazy para la mayoría de páginas; `src/firebase.js` inicializa Auth, Firestore y Storage desde configuración pública `VITE_FIREBASE_*`.
- Datos principales Firestore: `posts`, `users` y subcolecciones del usuario (`favorites`, `readPosts`, `readingSessions`, progreso), `communities`, `communityThreads`, `galaxyEvents`, `sitePages`, `overlays/{uid}/items`, `profileIcons`, `siteConfig/profileAchievements`.
- Funciones Netlify: IGDB/Twitch, proxy de imágenes, presencia Nintendo, progreso/logros, SEO/sitemap, vacaciones con Blobs, perfil Xbox/OpenXBL, feed YouTube.
- Realtime adicional: `server/server.js` Express + Socket.IO + TikTok Live connector, con origen CORS `*` y entrada de nombre de canal desde cliente.
- Persistencia local: temas visuales, preferencias/lectura y algunos estados UI. Los temas visuales se describen como biblioteca local; los posts llevan snapshot del tema.
- OBS actual: `/editor` guarda la definición del overlay en Firestore; `/overlay/:id` escucha el documento con `onSnapshot`. La URL copiada usa el origin web actual, no una URL local ni servidor independiente.
- Hosting: Netlify publica `dist`, redirects SPA, sitemap/robots por funciones. El servidor Socket.IO no vive en Netlify Functions según README.

## Catálogo funcional (IDs estables)

Los archivos de cada dominio son los listados en `11-matriz-de-trazabilidad.md`; las rutas provienen del router salvo indicación. Riesgo alto cuando hay escrituras o lógica de autorización.

| ID | Funcionalidad / alcance y evidencia principal | Acceso/acciones actuales observables | Destino / riesgo / estado |
|---|---|---|---|
| F01 | Inicio, carruseles, descubrimiento, destacados, feed editorial. `Home2Page.vue`, `components/home/*`, `services/homeHero.js`, `homePins.js` | Público; lee posts, comunidades, hilos, eventos y autores; algunos contenidos dinámicos/configurables. | A + C + D; medio; verificado en código |
| F02 | Categorías/noticias/rumores/guías/búsqueda, filtros, navegación y paginación. `CategoryPage.vue`, `SearchResultsPage.vue`, `postCategories.js` | Público; lecturas Firestore y marcadores locales de lectura. | A + C + D; medio |
| F03 | Lector de publicación/análisis, secciones, multimedia, temas, valoración, favoritos, progreso y marcas de lectura. `PostPage.vue`, `ReaderActions.vue`, `AnalysisRatingCard.vue` | Lectura pública; favoritos/lectura requieren usuario; award-read API autenticada. | A + C + D; alto por estado/progreso |
| F04 | Creación/edición/aprobación/organización de posts, categorías, destacado/home hero, importar JSON, compartir y exportar piezas sociales. `PostEditorPage.vue`, `PostPanel.vue`, `PostEditor.vue`, `PostSharePage.vue` | Editor publisher/admin; reglas de autoría y estado adicionales en página; acciones Firestore por confirmar servidor. | B + C + D; alto |
| F05 | Eventos públicos: lista activos/pasados, tabs, cuenta atrás, detalle e invitaciones. `EventsPage.vue`, `EventsTabs.vue`, `EventPremiumCard.vue`, `EventDetailModal.vue` | Consulta pública `galaxyEvents`. | A + C + D; medio |
| F06 | Gestor de eventos: CRUD, importaciones JSON/masivas, imágenes IGDB/búsqueda, invitaciones por capas, inspector, export social y compartir/reschedule/delete. `EventsManager.vue`, `EventEditorModal.vue`, `EventSharePage.vue`, `components/events/*` | `/admin/dashboard?view=events`, share `/admin/event-share/:id`; tabs admin en dashboard. Hay comprobación de rol en alguna vista; autorización efectiva Firestore no confirmada. | B + C + D; alto |
| F07 | CMS de páginas, páginas legales, bloques, footer y secciones dinámicas de inicio. `SitePagesPanel.vue`, `SitePageEditor.vue`, `PageBlockRenderer.vue`, `SitePage.vue`, `sitePages.js` | Gestión en tab admin; lectura/render público `/p/:slug` y slugs legales. | A + B + C + D; alto |
| F08 | Comunidades: directorio, detalle, navegación/selección y contenido oficial. `CommunitiesPage.vue`, `CommunityPage.vue`, `CommunityPanel.vue`, `communityRoutes.js` | Consulta pública; gestión dentro de tab admin; permisos de escrituras requieren reglas. | A + B + C + D; alto |
| F09 | Hilos/composición/edición social, GIF/stickers, listas y panel de comunidad. `ThreadComposer.vue`, `PostEditCard.vue`, `GlobalThreadComposer*`, `communityThreads` refs | Interacción de usuario autenticado/rol según componentes; lectura pública parcial. | A + B (moderación) + C + D; alto; permisos incompletos sin reglas activas |
| F10 | Autenticación, registro/login Google/email, verificación, perfil base, bloqueo y roles. `LoginPage.vue`, router guard, `UserPanel.vue` | Login público; perfiles `user`, `publisher`, `admin`; router redirige según rol. Guard frontend no es control suficiente. | C + D y pantalla login A; crítico |
| F11 | Gestión de usuarios, roles, permisos, verificación/bloqueo y creación. `UserPanel.vue`, Dashboard tab users | Admin en UI; Firestore/Identity acciones a revisar en detalle y Rules/Functions. | B + D; crítico |
| F12 | Perfiles, edición, avatar/iconos, redes Nintendo/Xbox, estadísticas, sistemas, relaciones/seguimiento, favoritos visibles. `ProfilePage.vue`, `ProfileEditor.vue`, `ProfileSystemsPanel.vue`, `ProfileRelationModal.vue` | Perfil público; edición propia/autenticada; secciones condicionadas por visibilidad/usuario. | A + C + D; alto |
| F13 | Colección de estrellas, recompensas, equipar icono, logros y lectura premiada. `ProfileRewardsHub.vue`, `ProfileIconCatalogEditor.vue`, `ProfileRewardsManager.vue`, `profile-progress.js`, `progress-service.js` | Vista de usuario; administración admin server-side en endpoint autenticado; acciones `sync/equip/begin-read/award-read/update-icon/create-icon/delete-icon/upload-icon-image/save-achievements`. | A + B + C + D; crítico; handler verifica token y servicio admin/block, despliegue requiere `PROGRESS_ENABLED=true` |
| F14 | Overlays de streaming: lista, crear/editar lienzo, formatos horizontal/vertical, mover/redimensionar/alinear, guardar/preview/copy-link y vista pública por ID. `OverlayEditorPage.vue`, `OverlayPanel.vue`, `OverlayViewPage.vue`, colección `overlays` | Editor `/editor` admin guard; overlay público `/overlay/:id`; datos por propietario `overlays/{uid}/items/{id}`. Rules activas pendientes. | A + B + C + D; alto |
| F15 | Widgets de overlay: metas, misiones/todo, chat, temporizador, ahora suena, marcos/fondo de cámara; editores, fuente/efectos/reproducción. `WidgetRenderer.vue`, `WidgetEditor.vue`, `widgets/types/*`, `widgets/editors/*`, servicios now-playing/camera | Configuración propietaria; render público para overlays. Integraciones/capacidades exactas varían por widget. | A + B + C; medio-alto |
| F16 | Vacaciones Russafa: calendarios/consultas mensuales, reservas/cancelación/división/alternativas; administración de personas, excepciones, reglas, bloqueos y reservas. `RuzafaVacationsPage.vue`, `RuzafaPrinterPage.vue`, `vacations.js`, `vacationRules.js`, store `team-vacations` | Ruta pública y variante `:local`; GET de estado; escritura con reglas de persona/gerente; login separado por password y token HMAC; semilla fallback incluye contraseña `Ronal1997` si no se configura. | B/D (funciones laborales segregadas; decidir dueño), ruta fuera de app pública tras confirmar usuarios; crítico; seguridad urgente |
| F17 | Impresión de cuadrantes/productos Russafa. `RuzafaPrinterPage.vue`, `src/data/ruzafaProducts.js`, `services/ruzafaProducts.js` | Ruta sin guard de router visible; flujo interno, posible impresión/gestión. | E hasta identificar audiencia y datos; medio |
| F18 | Presencia y perfil Nintendo. `NintendoPresenceLink.vue`, `nintendoPresenceClient.js`, `nxapiPresence.js`, `netlify/functions/nintendo-presence.js` | Usuario vincula identidad; consulta upstream pública validada/cacheada, datos mostrados según perfil. | A + C + D; medio |
| F19 | Vinculación y perfil Xbox/logros. `XboxProfileLink.vue`, `xboxProfileClient.js`, `xboxIdentity.js`, `xbox-profile.js` | Interacción perfil; función server consulta OpenXBL con clave secreta, token Firebase/perfil; cache/rate limit. | A + C + D; alto |
| F20 | Feed de vídeos YouTube y selección pública. `HomeMediaPanel.vue`, `youtube-feed.js` | Público; feed XML upstream; verificar consumo real/llave no requerida en este endpoint. | A + D; bajo |
| F21 | Búsqueda de juegos IGDB y picking de imágenes/Giphy/proxy de imágenes. `GameImagePicker.vue`, `GiphyPicker.vue`, `igdb.js`, `image-proxy.js`, servicios asociados | Componentes usados por editores y quizá vistas; credenciales IGDB/Twitch server-side; proxy acepta URLs sujeto a validador. | B + C + D; alto para SSRF/cuotas; revisar allowlist desplegada |
| F22 | Notificaciones, campana/panel, recordatorios de eventos y destinatarios. `NotificationDropdown.vue`, `PublicNotificationsPanel.vue`, `services/notifications.js` | UI pública autenticada aparentemente; triggers/configuración y reglas no confirmadas. | A + C + D; alto; semántica/retención pendiente |
| F23 | Generación/gestión de temas visuales para web/social, presets estacionales, snapshots en post, PNG/JSON. `VisualThemesPanel.vue`, `visualThemes.js`, `useVisualThemes.js`, `social*` | UI admin en gestor, pero biblioteca persiste en `localStorage` (por navegador); snapshots viajan en posts. | B + C; alto riesgo de pérdida/fragmentación al cambiar de dispositivo; backend de biblioteca por decidir |
| F24 | Cache local de páginas públicas, carga, carousels, reveal, sonidos, accesibilidad/motion. `publicPageCache.js`, composables/directivas, estilos | Soporte compartido, no dominio de datos; `sw.js` cache/offline behavior. | C; bajo-medio |
| F25 | Login/gestión de acceso de overlay y vínculos directos antiguos/redirecciones de workspace. `router/index.js`, `managementNavigation.js` | Rutas directas pueden eludir navegación; `/dashboard`, `/admin/posts`, etc redirigen; `/admin/event-share` tiene publisherOnly. | B + C; alto; mantener compatibilidad de bookmarks |
| F26 | Comunidad en vivo/TikTok por Socket.IO. `services/socket.js`, `server/server.js`, `ChatWidget.vue`, `server/package.json` | Canal cliente puede emitir `joinTikTok` y escoger username; CORS `*`; el estado de conexión es global y nueva conexión reemplaza la anterior. | D + A/C según ubicación; alto; limitar origins, sesiones, recursos y autorización |
| F27 | SEO, robots, sitemap dinámico de posts. `seo-files.js`, `netlify.toml`, `index.html` | Público/robots bloquea `/workspace`, `/perfil`, `/login`; sitemap consulta posts. | A + D; medio |
| F28 | PWA/service worker, instalación y cache. `public/manifest.webmanifest`, `public/sw.js`, `tests/sw.test.js` | Navegación pública instalable; cache puede afectar despliegues/datos. | A + C; medio; verificar actualización/invalidation |
| F29 | Material de desarrollo/labs y verificadores visuales. `scripts/*lab*`, `scripts/verify-*`, fixtures `examples/*`, `docs/*` | Herramientas locales; scripts usan Edge CDP y servidores/labs temporales; no deben confundirse con funcionalidades de producción. | E/C (herramientas de mantenimiento); bajo |
| F30 | Emails/plantillas. `emails/` está vacío en listado; referencias e integración no confirmadas. | No demostrado. | E; pendiente de revisión |

## Firebase: colecciones, permisos y operaciones observadas

Derivado de referencias cliente y reglas propuestas; no certifica las reglas activas. Firestore Rules no filtran resultados: una query que podría devolver documentos no autorizados falla completa. Las consultas amplias deben adaptarse a predicados permitidos y probarse con las queries reales.

| Colección / subcolección | Lecturas observadas | Escrituras observadas | Acceso que debe preservarse / riesgo |
|---|---|---|---|
| `posts/{id}` | Home, categorías/búsqueda, lector/perfiles, editor/admin, social exporter, sitemap | publisher/admin crea/edita/borra; progreso lee post | visitante solo publicado/aprobado; publisher según autoría; admin moderación. Queries globales requieren filtros compatibles |
| `users/{uid}` | perfil/autores, roles, login, comunidades, chats, búsquedas/nav | perfil propio, onboarding, admin roles, contadores/actividad | separar campos públicos y PII; role/block/stars nunca modificables por usuario |
| `users/{uid}/favorites/{postId}` | lector/perfil/comunidad | dueño agrega/elimina | solo UID propio y campos limitados |
| `users/{uid}/readPosts/{postId}`, `readingSessions/{postId}` | perfil/progreso | endpoint Admin SDK otorga lectura/recompensa | evitar falsificación cliente; lectura propia según necesidad |
| `users/{uid}/following`, `followers` | navbar/perfil | usuario escribe relaciones recíprocas y contadores | suplantación/contadores; transacción o backend confiable |
| `users/{uid}/notifications` | listener y listado en navbar/sidebar | recipient marca read; backend/admin crea | privado al recipient, update limitado a read |
| `users/{uid}/communities` | membership del usuario | join/leave | evitar UID falso y mantener relación espejo |
| `users/{uid}/socialTemplates` | merge con plantillas locales | editor social | solo propietario; estado duplicado en dispositivos |
| `communities/{id}`, `/members/{uid}` | directorio, home, feed | admin CRUD; usuario membership | público solo campos públicos; transacción para espejo/contador |
| `communityThreads/{id}` | home/feed/comunidades | crear/editar/borrar por usuario/moderación | autoría, visibilidad, comunidad, campos reservados |
| `galaxyEvents/{id}` | home/eventos/comunidad; listener realtime | admin CRUD/import; notifyBy individual | público solo publicados; limitar cambios de notifyBy al UID propio |
| `sitePages/{id}` | render por slug | admin CRUD/bloques/footer/home | público published/visible; drafts privados |
| `overlays/{uid}/items/{id}` | dueño editor; URL OBS listener | dueño guarda `setDoc` | dueño escribe; viewer read-only solo overlay deliberadamente compartido |
| `directChats/{id}/messages/{messageId}` | listener inbox/messages | participantes envían/ack | solo participantes; campos readBy propios; prohibir suplantación y preview falso |
| `profileIcons/{id}`, `siteConfig/profileAchievements` | perfil/hub/manager | endpoint progress Admin SDK | lectura visible necesaria; escrituras administrativas vía backend |

Storage Rules y rutas de objetos no quedaron totalmente mapeadas; revisar en conjunto con uploader de iconos antes de migrar.

## Colecciones y endpoints observados

Detalle de referencias en `11-matriz-de-trazabilidad.md`. Las rutas API detectadas son funciones Netlify `/.netlify/functions/{igdb,image-proxy,nintendo-presence,profile-progress,seo-files,vacations,xbox-profile,youtube-feed}`; `sitemap.xml`/`robots.txt` hacen rewrite. Socket.IO depende de `VITE_SOCKET_URL` (por defecto local solo en ejemplo). No se hallaron triggers programados/cloud scheduler en el inventario del repo; no equivale a demostrar que no existan fuera del repo.

## Funcionalidades descubiertas no explícitas en los requisitos

Además de noticias/eventos/perfiles: comunidades e hilos participativos; gamificación de lectura y estrellas; catálogo y logros administrables; overlays y siete familias de widgets; exportación de artes para redes con workspace de invitaciones; biblioteca de temas visuales local con snapshots portables; creador de páginas por bloques y configuración de home/footer; integraciones de identidad/presencia Nintendo/Xbox; datos IGDB/Giphy y proxy de imágenes; bridge TikTok realtime; calendario de vacaciones/gerencia separado con impresora; PWA/service worker; SEO dinámico; notificaciones; y conjunto grande de laboratorios y verificadores visuales. Véase `05-funcionalidades-olvidadas.md`.

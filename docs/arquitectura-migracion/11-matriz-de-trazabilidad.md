# 11. Matriz de trazabilidad

Matriz de control inicial. “Revisado código” significa inspección estática; “No verificado” indica runtime, reglas activas o configuración externa pendiente. Riesgo: B=bajo, M=medio, A=alto, C=crítico. Pruebas son requisitos para migración, no ejecutadas en esta auditoría.

| ID | Funcionalidad original | Archivos/rutas/datos/API | Permiso observado / propuesto | Destino | Dependencias | Riesgo | Pruebas mínimas para marcar migrada | Estado |
|---|---|---|---|---|---|---|---|---|
| F01 | Home/discovery/hero/carruseles | `pages/Home2Page.vue`; `components/home/*`; `/`; posts, communities, communityThreads, galaxyEvents, users | lectura pública / público | pública + compartido | Firebase, cache | M | carga, orden, empty/error, links, autor | Revisado código |
| F02 | Categorías/búsqueda | `CategoryPage.vue`, `SearchResultsPage.vue`; `/noticias`, `/rumores`, `/guias`, `/buscar`, `/categoria/:category`; posts/users | lectura / público | pública + backend datos | Firestore, filtros | M | consultas/filtros/paginación/URL | Revisado código |
| F03 | Lector/análisis/favoritos/lectura | `PostPage.vue`, posts components; `/post/:id`; posts, users/favorites/readPosts/readingSessions; `profile-progress` | público + auth para mutar; award-read API token | pública/compartido/servidor | Auth, progreso, snapshot | A | lectura, favoritos, timer/reintento/award, role/bloqueado | Revisado código; prod Rules no verificado |
| F04 | CRUD editorial de posts | `PostEditorPage.vue`, `PostPanel.vue`, `PostEditor.vue`; `/admin/posts/new`, `/admin/posts/:id/edit`, dashboard view posts; posts | admin/publisher; owner check UI | administrativa + servidor | Auth, Firestore, imagen, social themes | A | crear/borrador/publicar/editar propio/ajeno/borrar/import JSON/errores | Revisado código |
| F05 | Eventos públicos | `EventsPage.vue`, `EventsTabs.vue`, cards/modals; `/eventos`; galaxyEvents | lectura pública | pública | Firestore, reloj | M | activo/pasado, detalle, vacío, TZ | Revisado código |
| F06 | CRUD/eventos/invitaciones/exports | `EventsManager.vue`, `EventEditorModal.vue`, `EventSharePage.vue`, `components/events/*`; dashboard events, `/admin/event-share/:id`; galaxyEvents, image search API | dashboard adminOnly, share publisherOnly; parcial admin check | administrativa + compartida/servidor | IGDB, imágenes, JSZip/html-to-image | A | CRUD, import individual/masivo, imagen, invitaciones, export/share, rol | Revisado código; Rules no verificado |
| F07 | CMS/pages/footer/home sections | `SitePagesPanel.vue`, `SitePageEditor.vue`, `PageBlockRenderer.vue`, `SitePage.vue`, `sitePages.js`; `/p/:slug`, legal routes; sitePages | CRUD admin UI, lectura público | pública + administrativa + backend | Firestore, blocks, SEO | A | todos tipos/bloques/draft/public/footer/home/rollback | Revisado código |
| F08 | Comunidades | `CommunitiesPage.vue`, `CommunityPage.vue`, `CommunityPanel.vue`; `/comunidades`, `/comunidad/:slug`; communities | lectura pública, gestión admin tab | público + admin + backend | Firestore, assets | A | listado, slug, CRUD, relaciones, roles | Revisado código |
| F09 | Hilos y composición | community/thread components; community routes; communityThreads | rol actual condicional; Rules no verificado | pública/compartida + backend/moderación admin | Auth, GIF provider | A | publicar/editar/borrar/reportar/moderar por rol, adjuntos | Parcial; permisos pendientes |
| F10 | Auth/registro/login/roles | `LoginPage.vue`, `router/index.js`, `firebase.js`; `/login`; Auth/users | guest login, user/publisher/admin; router guard cliente | compartido + backend | Firebase Auth/Firestore | C | signup/login Google/email, verificación, bloqueo, sesión/revoke | Revisado código; proveedor config no verificado |
| F11 | Gestión usuarios/roles | `UserPanel.vue`, `DashboardPage.vue`; dashboard users; users | admin UI | administrativa + servidor | Firebase Auth/Firestore | C | crear/cambiar rol/bloquear/verificar y negativos | Revisado código; Rules/backend pendientes |
| F12 | Perfil/edición/relaciones | `ProfilePage.vue`, `ProfileEditor.vue`, profile components; `/perfil/:uid`; users/posts/threads | público y propietario; visibilidad | pública + compartida + backend | Auth, social APIs | A | visibilidad, edición propia/ajena, follow/relación, vínculos | Revisado código |
| F13 | Recompensas/logros/progreso | profile components; `profile-progress.js`, `lib/progress-service.js`; `/perfil/:uid/recompensas`; users/readPosts/profileIcons/siteConfig; endpoint profile-progress | token verificado; admin rol en catálogo, usuario propio en progreso | pública + admin + servidor | Firebase Admin, Storage | C | acciones 9 enumeradas, bloqueado, revocado, concurrencia, upload | Revisado código; PROGRESS_ENABLED prod pendiente |
| F14 | Editor y render overlays | `OverlayEditorPage.vue`, `OverlayViewPage.vue`, `OverlayPanel.vue`; `/editor`, `/overlay/:id`; overlays/{uid}/items | editor guard admin; lectura por ID pública | pública + admin + backend | Firestore, geometry | A | CRUD, dueño, enlace directo, formatos, roles | Revisado código; Rules pendientes |
| F15 | Widgets overlay | `WidgetRenderer.vue`, `WidgetEditor.vue`, types/editors, nowPlaying/camera services | dueño configura, overlay público render | compartida | Media APIs, camera, socket/TikTok | A | cada tipo, edición, playback, mobile/OBS, redacción datos | Revisado código |
| F16 | Vacaciones | `RuzafaVacationsPage.vue`, `vacations.js`, `vacationRules.js`; `/ruzafa-impresora/vacaciones/:local?`; Blobs `team-vacations` | GET abierto; gerente token HMAC; claimant por nombre | servidor + privacidad/audiencia pendiente | Netlify Blobs/env | C | todo action: login, createLocal, monthlyRequest/cancel/review, book/split/cancel, person/exception/datedBlocks/rules/deleteBooking, conflictos | Revisado; fallback secreto y prod store pendientes |
| F17 | Impresión de calendario/productos | `RuzafaPrinterPage.vue`, `src/data/ruzafaProducts.js`, `services/ruzafaProducts.js`; `/ruzafa-impresora` | sin guard visible | pendiente audiencia | datos vacaciones/productos, impresión | M | impresión/tamaño/datos y autorización | Revisado código; propósito pendiente |
| F18 | Nintendo profile/presence | `NintendoPresenceLink.vue`, `nintendoPresenceClient.js`, `nxapiPresence.js`, `nintendo-presence.js`; profile | perfil público según UI | pública + backend | upstream NXAPI | M | vincular, privacy, invalid IDs/cache/errors | Revisado código |
| F19 | Xbox profile/achievements | `XboxProfileLink.vue`, `xboxProfileClient.js`, `xboxIdentity.js`, `xbox-profile.js`; profile | auth per connection path | pública + backend | OpenXBL secret, Firebase lookup | A | link/unlink/public/private, exact identity, quota/errors | Revisado código; key config prod pendiente |
| F20 | YouTube feed | `HomeMediaPanel.vue`, `youtube-feed.js`; Home; endpoint youtube-feed | público | público + servidor | YouTube Atom | B | channel validation/feed failure/cache | Revisado código |
| F21 | IGDB/Giphy/image proxy/picker | GameImagePicker, GiphyPicker, `igdb.js`, `image-proxy.js`, services; endpoints igdb/image-proxy | uso por editor/público depende caller | compartida + backend | IGDB/Twitch creds, remote URLs | A | secrets, URL SSRF/redirect, size/type/timeout, quota | Revisado código |
| F22 | Notificaciones | nav notification components, `services/notifications.js`; users/posts/events | UI state depende sesión | pública + admin/servidor pendiente | Firestore | A | recipients, unread/read, unauthorized, delivery/retention | Parcial; trigger/Rules pendientes |
| F23 | Temas visuales y social | `VisualThemesPanel.vue`, `visualThemes.js`, `useVisualThemes.js`, social components/services; localStorage, post snapshots | UI admin; local browser persistence | admin + shared renderer | local storage, exports | A | CRUD theme, import/export, snapshot no pierde, varios dispositivos | Revisado; estado local confirmado |
| F24 | UI/cache/navigation | composables/directives/shared; publicPageCache; localStorage | público | compartido | Vue/router | M | cache freshness, reduced motion, responsive | Revisado; runtime no ejecutado |
| F25 | Rutas directas/legacy | `router/index.js`, `managementNavigation.js`; `/dashboard`, `/admin/*`, `/editor`, share routes | meta + guard | compartido/admin | role lookup | A | acceso por URL directa/query/old bookmark por role | Revisado código |
| F26 | TikTok realtime | `services/socket.js`, `server/server.js`; socket events joinTikTok/message; external server | ninguna auth visible; CORS `*` | servidor + widgets | Socket.IO, TikTok connector | A | origin/auth, multi-cliente, quota, disconnect, leak | Revisado código |
| F27 | SEO/sitemap/robots | `seo-files.js`, `netlify.toml`; sitemap/robots rewrites | público | servidor | Firestore posts | M | URL canonical, published filter, errores/noindex | Revisado código |
| F28 | PWA/SW | manifest/icons, `public/sw.js`, `tests/sw.test.js` | público | público/compartido | cache browser | M | install/update/offline/private cache | Revisado código |
| F29 | Labs/scripts/fixtures/docs | `scripts/*`, `examples/*`, root `docs/*`, `storybook` | local/dev | herramienta de mantenimiento | Edge CDP, Vite | B | confirmar scripts disponibles y no depender de prod | Inventariado por nombres; lectura parcial |
| F30 | Email | `emails/` vacío | no confirmado | pendiente | desconocida | M | buscar proveedores/config externas | No verificado |

## Complemento Firebase/OBS

| Ref | F IDs | Paths | Permiso/queries a preservar | Pruebas Emulator |
|---|---|---|---|---|
| DB01 | F01-F04,F27 | `posts/{id}` | guest solo publicado; publisher según autoría; admin moderación; sitemap publicado | Home/categoría/búsqueda/editor/share queries, índices y drafts denegados |
| DB02 | F10-F12,F22,F25 | `users/{uid}` | perfil público minimizado; propietario edita allowlist; role/block/email protegidos | lectura global/individual, PII, cambios role, blocked |
| DB03 | F03,F12,F13 | favorites/readPosts/readingSessions/followers/following | estado personal UID propio; awards/counters no falsificables | queries, writes propios, dobles relaciones y premio concurrente |
| DB04 | F08-F09,F22 | communities/members/communityThreads/notifications | lectura por visibilidad, cambios por autor/moderador; notificación recipient ack-only | feeds reales, membership espejo, mod, aislamiento recipient |
| DB05 | F05-F06 | `galaxyEvents` | evento publicado público; admin CRUD/import; notifyBy solo cambio propio | listener/query, filtros y field diff |
| DB06 | F07 | `sitePages` | published/visible público; draft admin | consultas por slug/estado y draft denied |
| DB07 | F14-F15,F26 | `overlays/{uid}/items/{id}` | dueño CRUD; Browser Source read-only mediante enlace explícito | owner/other/guest, legacy, listener y revocación link |
| DB08 | F12,F15 | `directChats/{id}/messages` | participantes only, readBy de actor propio | inbox query, no participante, campos forjados |
| DB09 | F13 | `profileIcons`, `siteConfig/profileAchievements`, Storage | catálogo público visible; escribir vía endpoint admin | Rules deniegan writes SDK, endpoint y Storage MIME/size |
| DB10 | F16-F17 | hoy Netlify Blobs, no Firebase | política separada; no migrar a Firestore por defecto | auth, lectura y protección de local IDs |

OBS legacy a conservar: ID `uid_overlayId`, path/documento, `widgets[]`/`type`/`data`, geometría, dimensiones/formato, ownership, `updatedAt`, transparencia, interactive mode y `?v=`. Editor `setDoc`; OBS viewer `onSnapshot`. URL actual es web. Servicio local debe ser read-only, persistir sin ventana, fallback web compatible y actualizarse después de guardar en MagicPad/Windows.

Configuraciones locales detectadas: temas `galaxia-visual-themes-v1` + `-history`; integración `galaxia-visual-theme-integrations`; plantillas `galaxia-social-library`/`galaxia-social-template[-style]` (espejo parcial `users/{uid}/socialTemplates`); `viewedPosts:<uid>`/continuación; favoritos/hints/búsqueda/ruta/welcome; impresora `ruzafa-creative-label`, `ruzafa-printer-action-order`, reminder. Creativo puede requerir migración/export; preferencias UX pueden quedarse por dispositivo. No eliminar datos al instalar app.

## Evidencia adicional

- Entradas y rutas: `src/router/index.js` (rutas públicas, privadas y guardas).
- Panel y roles de tabs: `src/pages/DashboardPage.vue`.
- Auth/config Firebase: `src/pages/LoginPage.vue`, `src/firebase.js`.
- Functions: `netlify/functions/*.js`; operaciones de progreso: `netlify/functions/lib/progress-service.js`.
- Scripts/documentos: listado del repositorio en el inventario; pruebas `.test.js` no ejecutadas en esta fase.

## Criterio de continuidad

No borrar fila ni cambiar ID. Añadir columnas/actualizaciones de versión, nueva ruta, release y resultado de pruebas. Solo `Migrada` después de comprobar lectura/escritura y roles en la plataforma destino. Fallos/funciones no reproducidas quedan `Bloqueada`, no se consideran equivalentes.

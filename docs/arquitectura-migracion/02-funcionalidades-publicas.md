# 02. Funcionalidades públicas

La clasificación describe la intención de producto propuesta, no la accesibilidad efectiva confirmada por reglas desplegadas.

| ID | Funciones que permanecen en la web | Rutas / archivos principales | Datos y dependencias |
|---|---|---|---|
| A01 (F01-F02) | Inicio, carruseles, destacados, categorías, búsqueda, noticias, rumores y guías | `/`, `/noticias`, `/rumores`, `/guias`, `/buscar`, `/categoria/:category`; `Home2Page.vue`, `CategoryPage.vue`, `SearchResultsPage.vue` | Firestore `posts`, `communities`, `communityThreads`, `galaxyEvents`, `users`; cache local |
| A02 (F03) | Lectura de post/análisis, navegación por secciones, medios, tema snapshot, valoraciones y compartir | `/post/:id`; `PostPage.vue`, `ReaderActions.vue`, `AnalysisRatingCard.vue` | `posts`, `users`, subcollections favorites/readPosts; API progreso |
| A03 (F05) | Catálogo de eventos, estado activo/pasado, detalle/cuenta atrás | `/eventos`; `EventsPage.vue`, `EventDetailModal.vue` | `galaxyEvents`, reloj/event feed |
| A04 (F07) | Páginas, legales, footer y secciones CMS publicadas | `/p/:slug`, slugs legales; `SitePage.vue`, `PageBlockRenderer.vue`, `SiteFooter.vue` | `sitePages`; requiere filtro por estado/visibilidad en Rules/consulta |
| A05 (F08-F09) | Directorio y lectura de comunidades/hilos; composición/perfil comunitario para usuarios elegibles | `/comunidades`, `/comunidad/:slug?`; componentes `community/*`, `thread/*` | `communities`, `communityThreads`, `users`; autorización de crear/editar/moderar |
| A06 (F10,F12) | Login/registro, perfil público, recompensas visibles, sistemas enlazados y relaciones según visibilidad | `/login`, `/perfil/:uid`, `/perfil/:uid/recompensas` | Firebase Auth; users, posts, hilos, favorites/readPosts, presence APIs |
| A07 (F14-F15) | Render de overlay y widgets para insertar en OBS/stream | `/overlay/:id` | Firestore overlays; propietario y Rules deben aislar escritura, lectura deliberada pública |
| A08 (F18-F20) | Perfiles Nintendo/Xbox, feed de vídeos y exploración vinculada | Dentro de perfil/inicio | Netlify Nintendo/Xbox/YouTube; Xbox clave queda backend |
| A09 (F16-F17) | Vacaciones e impresión solo si se confirma que su usuario es público previsto. | `/ruzafa-impresora/vacaciones/:local?`, `/ruzafa-impresora` | Netlify Blobs; decisión de audiencia pendiente. No clasificar por ruta sin validar propósito |
| A10 (F27-F28) | Sitemap, robots, SEO, PWA | `/sitemap.xml`, `/robots.txt`, manifest/SW | Netlify function, posts publicados, cache SW |

Las interacciones que modifican datos (favoritos, relación, comentarios/hilos, vínculo de cuentas, participación) siguen sujetas a sesión y permisos del backend; la interfaz pública no equivale a escritura anónima.

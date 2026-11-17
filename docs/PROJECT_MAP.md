# Mapa de la web pública

Este mapa describe el código actual. GalaxiaNintendera-main despliega la web de lectores; `Galaxia Studio` es otro repositorio y se encarga del gestor. Ambos comparten datos, por lo que un cambio en el formato de los documentos debe validarse en ambos proyectos.

## Entrada y despliegue

- `src/main.js` monta `src/App.vue`. `src/router/index.js` define rutas y guards. `src/components/shared/PublicLayout.vue` envuelve las páginas públicas con navegación, pie y acceso a comunidades.
- `src/App.vue` controla la transición de ruta y la pantalla de carga. La navegación y sus controles están en `src/components/nav/PublicNavbar.vue`.
- `netlify.toml` construye `dist` y publica funciones desde `netlify/public-functions`. Las funciones públicas llaman a lógica de `netlify/functions`; la presencia de una función en el árbol fuente no significa que se despliegue. `netlify/admin-functions` pertenece al build de Studio.
- La condición `VITE_GALAXIA_STUDIO_BUILD` de `src/router/index.js` conserva rutas heredadas para otro build. En el build público normal, `/admin`, `/dashboard` y `/editor` redirigen fuera del gestor. Mantén el panel en Studio, no agregues nuevas pantallas administrativas aquí.

## Dónde cambiar cada función

- **Portada, noticias y búsqueda:** `src/pages/Home2Page.vue`, `CategoryPage.vue`, `SearchResultsPage.vue`; tarjetas y hero en `src/components/home`; lógica de destacados en `src/services/homeHero.js`.
- **Lector de posts:** `src/pages/PostPage.vue` y `src/components/posts/Reader*`, `ArticleHighlight.vue`, `PostCinematicHero.vue`, `SectionImageGallery.vue`. `src/services/postSectionGames.js` normaliza secciones y juegos; `src/services/sectionGallery.js` preserva una imagen principal y hasta dos adicionales. Actualiza Studio y las pruebas de ambos proyectos si cambias ese contrato.
- **Páginas CMS y legales:** `src/pages/SitePage.vue`, componentes de `src/components/sitePages` y `src/services/sitePages.js`. Studio crea y edita estos documentos.
- **Comunidades:** `src/pages/CommunitiesPage.vue`, `CommunityPage.vue`, componentes de `src/components/community` y rutas en `src/services/communityRoutes.js`. Diferencia el hilo público del panel de gestión de Studio.
- **Eventos:** `src/pages/EventsPage.vue` y componentes de `src/components/events`. La creación y administración están en Studio.
- **Perfil y recompensas:** `src/pages/ProfilePage.vue`, `src/components/profile` y servicios `profileProgress.js`, `achievementProgress.js`, `profileIconAdmin.js` según la función. Revisa las reglas de Firestore antes de tocar permisos.
- **OBS y widgets:** `src/pages/OverlayViewPage.vue` es el consumidor de la URL `/overlay/:id`; `src/components/widgets/WidgetRenderer.vue` dibuja cada tipo. La creación y edición corresponden a Studio. Para un widget nuevo, registra el tipo y el contrato de `widget.data` en los dos renderizadores y prueba OBS.
- **Temas visuales:** `src/services/visualThemes.js`, `src/composables/useVisualThemes.js` y componentes `SocialThemeBackground.vue` o `SeasonalThemeDecor.vue` según el consumidor. Los estilos de presentación deben permanecer cerca del componente.
- **Funciones públicas:** `netlify/public-functions` expone las entradas; `netlify/functions` y `netlify/functions/lib` contienen implementación compartida. `src/services/backendClient.js` y otros clientes de dominio hacen las llamadas desde Vue.

## Contratos y limpieza

- `section.image` es la URL principal histórica. `section.images` contiene como máximo dos extras con `mediaSlotId`, `url`, `alt` y `gameName`. `section.games` ayuda al selector de Studio a buscar varios juegos. El lector usa `SectionImageGallery.vue` y muestra el carrusel solo si hay más de una imagen.
- Los campos sociales `social.slides[].backgroundMode` y `backgroundImageIndex` se consumen en Studio. La web pública no debe depender de ellos para mostrar el artículo.
- La carpeta conserva componentes y páginas administrativos heredados. Su exclusión del router público y de las funciones desplegadas no prueba que sobren del repositorio: comprueba importaciones, pruebas, scripts y builds antes de eliminarlos.
- Las páginas de vacaciones e impresora Ruzafa forman parte de rutas públicas específicas y quedan fuera de limpiezas generales.

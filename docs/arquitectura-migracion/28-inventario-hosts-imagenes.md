# 28. Inventario local de hosts de imágenes

Fecha: 15 de noviembre de 2026. Alcance: archivos del repositorio, fixtures y JSON locales, conforme a [auditoría 26](26-auditoria-detallada-image-proxy.md) y [diseño 27](27-diseno-seguridad-proxy.md). No se consultaron Firebase, Firestore, Storage, URLs de usuarios ni proveedores externos. **Una URL de prueba no demuestra un host usado por los datos reales.**

## Resultado verificable

El **único host de imagen con URL construida explícitamente en código y enviada al proxy** es `img.youtube.com`, con ruta `https://img.youtube.com/vi/{youtubeId}/hqdefault.jpg` en `src/services/mediaLinks.js:44`. El valor `youtubeId` se extrae de enlaces de YouTube; la extensión es `.jpg`. No se verificó la respuesta HTTP ni su MIME real.

Se encontraron otros hosts escritos literalmente en código o fixtures, pero sus imágenes no pasan necesariamente por `image-proxy`. Las URLs de publicaciones, eventos, comunidades, biblioteca y exportación social provienen de campos dinámicos; el repositorio no contiene un inventario de sus hostnames. **Este inventario no basta para activar una lista de hosts en producción sin riesgo de bloquear imágenes existentes.**

## Hosts y rutas por nivel de evidencia

### Confirmados en código de aplicación

- **YouTube, proxificado:** `img.youtube.com`, `/vi/{youtubeId}/hqdefault.jpg`. `mediaLinks.js:44` lo envía a `proxiedImageUrl()`, que usa `src` base64url. La pantalla principal de medios (`HomeMediaPanel.vue:167,186`) también proxifica miniaturas recibidas de YouTube Feed o Data API, pero sus hostnames vienen de la respuesta y no se fijan en código. `www.googleapis.com/youtube/v3/...` es un endpoint de datos, no un host de miniaturas.
- **Avatar de respaldo, carga directa:** `i.pravatar.cc`, `/120`, aparece en `src/components/shared/UserPanel.vue:286` y `src/components/nav/AdminSidebar.vue:239`; los `<img>` de esos componentes usan el valor directamente. No hay llamada al proxy para este fallback. El formato de respuesta se desconoce porque la ruta no tiene extensión y no se consultó el servicio. No incorporarlo a la lista del proxy por aparecer en el repositorio.
- **Xbox, normalización de URL, carga directa:** `store-images.s-microsoft.com` aparece como excepción exacta en `src/services/xboxIdentity.js:16`: una URL HTTP sin puerto de ese host se convierte a HTTPS. El código no fija una ruta concreta y muestra las imágenes externas de Xbox directamente en perfil/`NowPlayingWidget`. El host de otros `displayImage` y `displayPicRaw` devueltos por OpenXBL no se fija. `api.xbl.io` es un endpoint de datos.
- **Nintendo, endpoints de datos:** `nxapi-presence.fancy.org.uk/api/presence/{id}` y `nxapi-auth.fancy.org.uk/profile/{id}` están fijados en `src/services/nxapiPresence.js`. El código extrae `imageUri`, `picture_url` e `image_url` de sus respuestas y acepta URL HTTPS externas; **el host final de esas imágenes no está fijado**. Perfil y widget muestran esas URL directamente. `ec.nintendo.com/apps/{id}` identifica juegos, no es una ruta de imagen confirmada.
- **IGDB, endpoints de datos:** `api.igdb.com/v4/games` e `id.twitch.tv/oauth2/token` aparecen en `netlify/functions/igdb.js`. `cover.url`, `screenshots.url` y `artworks.url` proceden de la respuesta; `normalizeImageUrl()` convierte `//host/...` a HTTPS y cambia los segmentos `t_thumb` o `t_cover_big` a `t_1080p`, sin fijar hostname. `GameImagePicker` y `PostEditor` muestran resultados directamente; `EventImageSearchModal` sí envía `url` al proxy para previsualización, y la URL guardada puede llegar después al resolvedor general.
- **GIPHY, endpoint de datos:** `api.giphy.com/v1/gifs` en `src/services/giphy.js`. `item.images.fixed_height.url` y `preview.url` son valores de la respuesta. El selector los muestra directamente; un GIF publicado puede aparecer en un campo de imagen reutilizado por otras vistas. No se identificó un host de archivos GIPHY fijo en código.

### Encontrados solo en fixtures y pruebas

- `images.igdb.com/image.jpg` en `src/services/eventGame.test.js:5`: **fixture de selección de evento**. Es evidencia de una ruta usada en una prueba, no de la respuesta actual del endpoint IGDB ni de una imagen real almacenada. Esta distinción complementa el informe 26, que no lo había enumerado como fixture.
- `store-images.s-microsoft.com/image/apps.cover` en `src/services/xboxIdentity.test.js:18-20`: fixture de normalización Xbox sin extensión. Confirma el caso probado del normalizador, no una llamada al proxy ni el tamaño/formato real.
- `images.example.test/cover.png?size=large&theme=2` en `src/constants/assets.test.js:11` y `images.example.test/a.png?size=large&theme=2` en `src/services/imageLibrary.test.js:42`: fixtures de `src` y `url`. `cdn.example.test/social.png?width=1200` en `src/services/backendClient.test.js:49` comprueba `url` más `cb`. `a.test/image.png`, `img.test/a.png`, `example.com/image.png` y `example.org/...jpg` aparecen en otras pruebas de biblioteca, eventos y héroes. Son **dominios artificiales** y no candidatos de autorización.
- Las pruebas de Xbox/Nintendo usan `example.com/avatar.png`, `game.png` y `cover.jpg` como respuestas sintéticas. Las pruebas de iconos usan `example.test/...png`. Estos valores confirman expectativas de forma de URL/imagen en pruebas, no dominios de proveedor.

### Datos locales no sintéticos revisados

- `docs/ejemplo-post-con-destacado.json`: los campos `image`, `hero.image`, `hero.logoUrl`, `hero.images` y las imágenes de secciones están vacíos. Contiene una URL editorial de `www.nintendo.co.jp/corporate/release/en/2026/261111.html`, **no una imagen ni un destino del proxy**.
- `src/services/profileIconDefaults.json`: catálogo de `sourcePath` como `iconosKirby/01.png`, rutas de iconos empaquetados, sin host remoto. Entre `src` y `public` se enumeraron **58 archivos `.png` y 5 `.svg`**. Son archivos locales; los iconos/banner importados o rutas relativas no pasan por el proxy según `src/constants/assets.js`. `docs` contiene capturas `.png`/`.jpg`, sin relación con el endpoint.
- No se halló en los JSON locales revisados un dump de publicaciones, eventos, comunidades o URLs reales de Storage. No se infiere un host de Storage a partir de la configuración Firebase ni de rutas de prueba.

## Funcionalidades y procedencia de URL

- **Biblioteca de imágenes:** `src/services/imageLibrary.js` recoge `post.image`, `coverImage`, `thumbnail`, `game.logoUrl/logo`, imágenes de secciones y material `social.image/slides`; `EventImageSearchModal` envía las URL externas al proxy mediante `url`. El host y ruta de cada post son desconocidos sin los documentos. Los resultados IGDB siguen la URL devuelta por el proveedor.
- **Publicaciones y web pública:** `src/constants/assets.js` envía mediante `src` base64url cualquier URL absoluta HTTP(S) externa que pase por `resolveAssetUrl()`. Lo utilizan portada, categorías, búsqueda, favoritos, héroes, contenido, comunidades e imágenes de eventos. Rutas `/...`, `data:`, `blob:`, mismo origen, recursos heredados empaquetados y URLs que ya contienen `/.netlify/functions/image-proxy` no se proxifican. Los hosts de los campos guardados son desconocidos.
- **Eventos:** `EventSharePage.vue:78` envía `url` de fondo/logo externos. `EventImageSearchModal` puede presentar resultados IGDB o imágenes extraídas de posts. Los campos `backgroundUrl`, `imageUrl` e iconos/banners de comunidad aceptan URL aportadas o guardadas; no se identificó host fijo para ellas.
- **Exportación social:** `PostSharePage.vue:1032` envía `url` más `cb` (nonce que se actualiza desde `Date.now()`); `EventSharePage` envía `url`. Imágenes del mismo origen, inline o locales quedan directas. El resultado se rasteriza con `html-to-image` a PNG; el PNG/ZIP es un **producto de exportación**, no el formato de la URL remota original. `PostSharePage.vue:1144` usa un `data:image/svg+xml` como placeholder interno del render; **no justifica permitir SVG remoto en el proxy**.
- **Otros servicios:** `mediaLinks.js` acepta URL libre de imagen y la pasa a `proxiedImageUrl`; sus vídeos se distinguen por `.mp4`, `.webm`, `.ogg`, `.mov` y `.m4v` y no son candidatos de imagen. La interfaz de hilos/GIPHY puede guardar URL de archivo recibida externamente, pero no se pudo confirmar que cada render de hilo use el proxy.

## Formatos comprobados y no comprobados

- **JPEG:** `.jpg` está fijado en la miniatura YouTube y en fixtures IGDB, Xbox/Nintendo y posts. Solo el primero pertenece a una URL de imagen proxificada fijada por código. Sin descarga real, la extensión no confirma MIME ni firma de bytes.
- **PNG:** 58 recursos locales entre `src` y `public`; fixtures del resolvedor, biblioteca, eventos e imágenes sociales usan `.png`. Confirma que las interfaces trabajan con PNG, no que un host remoto concreto sirva PNG.
- **WebP y AVIF:** presentes en el encabezado `Accept` del proxy, pero no se encontraron archivos locales de esos tipos ni URLs concretas en los recorridos. El proveedor podría devolverlos; no autorizar formato por el mero `Accept`.
- **GIF:** `giphy.js` devuelve imágenes etiquetadas como `type: 'gif'` desde URLs dinámicas; no se confirmó host, extensión ni MIME. Una URL GIF guardada puede atravesar el resolvedor general, lo que exige comprobar ese flujo antes de prohibir GIF remoto.
- **SVG:** 5 recursos SVG locales y placeholder `data:image/svg+xml` de exportación. No se encontró URL externa SVG destinada al proxy en los archivos revisados. El proxy actual aceptaría `image/svg+xml` por su prueba genérica `image/`; falta evidencia para mantenerlo o retirarlo sin inventario.
- **Otros:** el proxy acepta cualquier `image/*` declarado; el repositorio no demuestra uso remoto de BMP, ICO u otros formatos. La ausencia en el repositorio no prueba ausencia en documentos reales.

## Pendientes antes de fijar hosts o rutas permitidos

1. Obtener del usuario un **inventario anonimizado de URLs de imágenes ya utilizadas** o un export de entorno de prueba autorizado, limitado a hostname, ruta normalizada, extensión y tamaño aproximado. No incluir query, firmas ni identificadores privados; no consultar producción desde esta fase. Identificar por separado posts, eventos, comunidades, perfil, biblioteca y exportaciones.
2. Capturar fixtures de desarrollo de respuestas IGDB, YouTube Feed/Data API y, si interesa para imágenes guardadas, GIPHY. Confirmar hostname **final**, rutas y redirecciones con pruebas de red autorizadas en otra fase. Este informe no invocó servicios externos.
3. Medir MIME/firma y distribución de tamaños de muestras representativas. Aquí no se midió ningún archivo remoto ni se conoce si alguna imagen actual supera el límite de 12 MiB del handler o el límite de respuesta de la plataforma.
4. Confrontar esos hosts con el registro por fuente propuesto en 27. Marcar cada host como directo, proxificado, migrable a recurso propio o pendiente. No añadir `images.igdb.com`, `store-images.s-microsoft.com`, `i.pravatar.cc` ni un dominio de ejemplo a una allowlist solo por aparecer en una prueba o en un flujo directo.

**Conclusión:** hay una ruta de YouTube confirmada para el proxy y varios contratos de imagen confirmados sin host remoto final. Permanecen desconocidos los destinos reales de biblioteca, publicaciones, eventos y exportación social. No se modificaron `image-proxy.js`, reglas, Firebase ni producción; no se ejecutaron pruebas ni solicitudes externas.

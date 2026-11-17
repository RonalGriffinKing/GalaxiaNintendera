# 21. Separación de aplicaciones — plan de Fase 12

**Estado:** diseño basado en la auditoría F01–F30 y comprobación selectiva del código el 15 de noviembre de 2026. No se ha creado una app, cambiado un build, migrado datos ni consultado o modificado Firebase de producción. Las pruebas 40/40 de Firestore Emulator, 5/5 de `role-management` y el build citados en el documento 20 son resultados de la Fase 11; **no se han repetido en esta fase**. La matriz de trazabilidad original sigue en `11-matriz-de-trazabilidad.md` y este documento conserva sus identificadores.

## Decisión de arquitectura

Mantener **un repositorio y una base Vue 3/Vite**, con dos entradas y dos routers explícitos cuando se implemente: (1) web pública desplegada en Netlify, (2) interfaz administrativa empaquetada en Tauri 2 para Windows y Android. Compartir modelos, servicios Firebase, componentes presentacionales, renderizadores de noticias/eventos/overlays y estilos que no dependan de una plataforma. Separar las pantallas y la navegación administrativa. No seleccionar componentes por una variable de entorno dentro del router actual: entradas e imports separados permiten comprobar que el artefacto público no contiene módulos de gestión. El `src/main.js` y `src/router/index.js` actuales siguen siendo la entrada única; `netlify.toml` publica `dist`. Ninguna entrada privada existe todavía.

Firebase Authentication, Firestore y Storage permanecen como fuente común. `users/{uid}.role` conserva la autoridad (`user`, `publisher`, `admin`), con bloqueo vigente y autorización **en Rules y backend por operación**. Tauri no otorga privilegios por instalar la APK o el ejecutable. Las credenciales de Admin SDK y `PRIMARY_ADMIN_UID` permanecen en el entorno del servidor; la app guarda únicamente una sesión individual de Firebase Auth. Las reglas Firestore del repositorio son **candidatas locales**: el éxito del emulador no demuestra que estén publicadas. Revisar Storage por separado antes de cualquier cambio real.

La app administrativa consumirá las funciones Netlify por **origen HTTPS explícito y configurable**, con token Firebase cuando proceda. Las rutas relativas `/.netlify/functions/*` usadas hoy por `progressClient`, IGDB, proxy de imágenes, Xbox, presencia Nintendo y exportación social apuntarían al origen local de Tauri y fallarían. La futura capa de cliente HTTP debe resolver origen, CORS, validación de token y manejo de errores sin incrustar secretos. `role-management` ya existe en `netlify/functions/role-management.js` y `lib/role-management.js`; **no duplicarlo**. Su interfaz privada futura enviará solo `action` (`grant-publisher` o `revoke-publisher`) y `targetUid` con `Authorization: Bearer <ID token>`. El servicio verifica el token con revocación, UID principal configurado, rol actual `admin` y bloqueo actual dentro de la transacción. No hay UI conectada todavía ni activación del endpoint confirmada en producción. La allowlist del candidato prohíbe editar `users.role` desde el cliente, incluso al administrador.

## Rutas y módulos comprobados

`src/router/index.js` monta las rutas de gestión **dentro del build web actual**, aunque el guard use `publisherOnly`/`adminOnly`. El guard protege navegación, no datos. `DashboardPage.vue` carga de forma diferida ocho pestañas: `posts` para publicador/administrador; `themes`, `pages`, `communities`, `users`, `events`, `rewards`, `overlays` para administrador. Las pantallas de compartir y los editores de posts son rutas independientes.

| Ruta actual | Módulo/permiso visible | Destino previsto |
|---|---|---|
| `/admin`, `/admin/dashboard`, `/dashboard` | Dashboard y redirecciones; publicador o admin | Router privado; preservar marcadores antiguos solo durante transición, sin dejar cargar gestión desde el build web final. |
| `/admin/posts`, `/admin/posts/new`, `/admin/posts/:id/edit` | `PostPanel`, `PostEditorPage`; publicador | App privada; lectores `/post/:id`, categorías y búsqueda quedan públicos. |
| `/admin/event-share/:id`, `/admin/post-share/:id` | Exportación/compartir editorial; publicador | App privada; revisar proxy de imágenes, descarga, canvas y plantillas locales. |
| `/admin/users`, `/admin/recompensas`, `/admin/eventos`, `/admin/overlays` | Redirecciones a pestañas admin | App privada; gestión de usuarios, catálogo, eventos y escenas. |
| `/editor` | `OverlayEditorPage`; admin | App privada; adaptar generación de enlace OBS a un origen público configurado. |
| `/overlay/:id` | `OverlayViewPage`; lectura pública por Firestore `onSnapshot` | Web pública y Browser Source de OBS; conservar URL y compatibilidad. |
| `/login`, `/perfil/:uid`, `/perfil/:uid/recompensas`, `/mis-favoritos` | Identidad y funciones de miembro | Web pública; la app privada tendrá login propio y no copiará toda la UI de perfil. |
| `/comunidades`, `/comunidad/:slug?`, `/eventos`, `/p/:slug`, slugs legales | Directorios, interacción y contenido público | Web pública; extraer solo acciones de gestión. |
| `/ruzafa-impresora`, `/ruzafa-impresora/vacaciones/:local?` | Herramientas Ruzafa con autenticación/almacenamiento propios | **Quedan en sus rutas actuales temporalmente**; sin incluirlas en la primera app privada ni cambiar su backend. |

Además del router, `PublicNavbar.vue` todavía enlaza al gestor y monta `PublicQuickAdminModals.vue` para crear comunidades. La Fase 11 retiró de allí la asignación rápida de roles, pero no toda la gestión. `CommunityPage.vue` importa directamente `CommunityPanel.vue`, el mismo componente que usa el dashboard: **no puede retirarse entero del build web** sin afectar hilos, membresía y contenido de miembros. Separar sus operaciones de gestión y su vista pública antes de cortar imports. `AdminSidebar.vue` y `managementNavigation.js` contienen navegación de gestor; confirmar usos efectivos antes de mover o dejar como compatibilidad temporal. No eliminar archivos en esta fase.

## Matriz F01–F30 de destino y dependencia

**P:** web pública. **A:** interfaz administrativa privada. **C:** modelos/servicios/render compartidos o backend común. **L:** herramienta local o ajena a la división inicial. Una fila con P+A conserva dos superficies de la misma función; no implica dos bases de datos.

| ID | Destino | Límite de separación y dependencia principal |
|---|---|---|
| F01 Inicio | P+C | Carruseles y destacados leen posts/eventos/comunidades; su configuración editorial pasa a A. |
| F02 Noticias, categorías, búsqueda | P+C | Consultas públicas e índices intactos; taxonomía administrada desde A. |
| F03 Lectura, valoración, favoritos | P+C | Progreso, favoritos y `profile-progress` continúan para miembros. |
| F04 Gestión de publicaciones | A+C | `PostPanel`, `PostEditorPage`, importación y piezas sociales; lectura de posts sigue F02/F03. |
| F05 Eventos públicos | P+C | `EventsPage` y detalle; feed compartido con editor. |
| F06 Gestión de eventos | A+C | `EventsManager`, importación e `EventSharePage`; validar permisos e imágenes. |
| F07 CMS/páginas | P+A+C | Render `SitePage` y bloques públicos; `SitePagesPanel`/editor privados. |
| F08 Comunidades | P+A+C | Directorio, miembros e hilos públicos; configuración/moderación privada. `CommunityPanel` está mezclado. |
| F09 Hilos y composición social | P+A+C | Publicación/edición propia pública; moderación editorial privada; permisos Firestore comunes. |
| F10 Auth, registro, roles y bloqueo | P+A+C | Login individual en ambos; el alta pública nunca concede rol. `users.role` es autoridad compartida. |
| F11 Usuarios y publicadores | A+C | `UserPanel` reutilizable; roles solo por `role-management`, otras operaciones con allowlist/backend explícitos. |
| F12 Perfiles y relaciones | P+C | Lectura pública sin correo; edición propia. `publicProfiles` sigue como contrato pendiente; no confundir la variable local de `ProfilePage` con colección desplegada. |
| F13 Estrellas, iconos, logros | P+A+C | `ProfileRewardsHub` para miembros; `ProfileRewardsManager` y catálogo en A; `profile-progress` sigue en backend. |
| F14 Overlays | P+A+C | `OverlayPanel`/`OverlayEditorPage` privados; `OverlayViewPage` y URLs OBS públicos. |
| F15 Widgets | P+A+C | Editores privados; `WidgetRenderer` y dependencias visuales compartidos para el viewer. |
| F16 Vacaciones Ruzafa | L+C | Mantener ruta y función Netlify actuales temporalmente; no mezclarlas con Auth/roles de Galaxia. |
| F17 Impresora Ruzafa | L | Mantener ruta, impresión y preferencias locales actuales; confirmar audiencia antes de rediseñar. |
| F18 Nintendo | P+C | Vinculación/perfil público y función Netlify; URL absoluta en shell privado solo si un editor la necesita. |
| F19 Xbox | P+C | Perfil y función Netlify autenticada; claves exclusivamente servidor. |
| F20 YouTube | P+C | Feed público y reutilización en edición de comunidades, con adaptador de origen Netlify. |
| F21 IGDB/Giphy/proxy | A+C | Pickers de editores y funciones remotas; proxy también puede servir imágenes públicas/sociales. |
| F22 Notificaciones | P+A+C | Campana y avisos de miembros públicos; creación administrativa y permisos en backend/Rules según operación. |
| F23 Temas visuales | A+C | Editor privado; render y snapshots de posts compartidos. Biblioteca e integraciones viven parcialmente en `localStorage`: exportación/sincronización pendientes. |
| F24 Cache, carga, accesibilidad | P+C | Service worker y cache web públicos; no registrar `sw.js` en el shell Tauri por copiar `src/main.js` sin revisar. |
| F25 Acceso a gestión/enlaces | A+C | Router privado y guard por rol; enlaces legacy de `/admin/*` requieren plan de transición. |
| F26 TikTok/Socket.IO/chat en vivo | P+A+C | Configuración y editor privados, render/chat en viewer; servicio Socket.IO externo compartido, seguridad propia. |
| F27 SEO/robots/sitemap | P+C | Solo web desplegada y función Netlify; no incluir en APK. |
| F28 PWA | P | Manifest y service worker exclusivos del sitio web. |
| F29 Labs/verificadores | L | Scripts de desarrollo fuera de ambos artefactos de usuario. |
| F30 Emails/plantillas | Pendiente | Auditoría no confirmó integración real; verificar antes de asignar un destino. |

## Dependencias que bloquean el corte del build

1. **Comunidad mixta:** `CommunityPage` y dashboard usan `CommunityPanel`; sus escrituras de membresías/contadores y moderación no se separan por ocultar botones. Crear una fachada de miembro pública y una de gestión privada sobre servicios compartidos, con pruebas de ambas. `PublicQuickAdminModals` y acciones del navbar deben revisarse junto con esa fachada.
2. **Perfiles y recompensas:** `users` contiene datos privados; la colección `publicProfiles` aún requiere proyección/sincronización segura y cambio de lectores. La Fase 11 no ha implementado ese flujo. El build público debe conservar perfiles, favoritos, logros y estrellas sin lectura abierta de `users` ni edición cliente de recompensas. `profile-progress` sigue autenticando por sí mismo al usar Admin SDK.
3. **Operaciones admin no cubiertas por roles:** `role-management` solo concede/retira `publisher`; no sustituye edición de usuarios, bloqueo, `canChat`, verificación, catálogo, importación ni permisos de Storage. El candidato Firestore ya impide cambios directos a campos privilegiados de `users`, por lo que esas operaciones necesitan contratos pequeños y probados antes de afirmar paridad. No ampliar Rules para que una pantalla funcione.
4. **Origen de servicios:** `vite.config.js` emula varias funciones Netlify en desarrollo, pero no incluye `role-management` en ese middleware. La app Tauri necesitará cliente HTTPS configurable y prueba de CORS/Auth para cada función que use; la emulación local de Vite no demuestra ese flujo. No distribuir service account ni secretos de IGDB/Xbox.
5. **Estado por dispositivo:** temas visuales, ajustes de temas, biblioteca/plantillas sociales y preferencias de Ruzafa aparecen en `localStorage`; el shell tendrá otro origen y otro almacenamiento. Preservar exportación y definir sincronización de lo editorial antes de retirar el editor web. Historial de lectura, búsquedas, hints y caché públicos pueden seguir locales si no son configuración administrativa.
6. **Reglas reales y Storage:** la suite 40/40 valida el candidato en emulador, no las reglas desplegadas. El cambio de build no corrige permisos de datos. Confirmar lecturas, consultas e índices de web pública, escrituras de editor y Storage en staging antes de un corte. Firestore Rules no protegen las funciones Admin SDK.

## OBS y herramientas locales

`OverlayEditorPage.vue` guarda documentos `overlays/{uid}/items/{id}`; `OverlayViewPage.vue` escucha el documento con `onSnapshot` y renderiza `WidgetRenderer`. MagicPad y Windows pueden compartir configuración mediante Firebase: guardar en uno, reabrir en otro y recibir actualización del visor. La URL OBS **actual** es `/overlay/{uid}_{overlayId}` en el dominio público. `OverlayPanel.vue` y el editor la construyen con `window.location.origin`; en Tauri esto produciría una URL del shell, no una fuente OBS válida. El adaptador futuro debe usar el origen HTTPS público configurado y conservar IDs, dimensiones, formato, widgets, chat, now playing y demás ajustes existentes. Probar acceso de lectura del visor con Rules reales; una URL con ID no equivale por sí sola a autorización.

**Primera opción:** conservar el visor HTTPS existente como Browser Source. Permite cerrar la interfaz admin mientras OBS sigue mostrando la escena; no necesita servicio local. Mantener Socket.IO/TikTok y otros proveedores externos como dependencias del visor con su propio endurecimiento. **Opción posterior, si se confirma necesidad de URL local:** un pequeño proceso Windows ligado a `127.0.0.1`, independiente de la ventana Tauri, con arranque/parada configurables y cache limitada. `localhost` en MagicPad sería la tablet, no el PC. Esa opción requiere pruebas de ciclo de vida, permisos y equivalencia de todos los widgets; no forma parte del primer corte.

Vacaciones F16 e impresora F17 siguen en sus rutas y mecanismos actuales durante la transición. Esta decisión conserva su uso; **no implica que su seguridad actual sea suficiente**. La auditoría previa señaló riesgos propios de vacaciones y una ruta de impresora sin guard visible. Tratarlos en una tarea separada y coordinada con sus usuarios, sin trasladarlos por accidente al shell Tauri ni borrarlos del build web ahora.

## Tauri 2: preparación y puerta de compatibilidad

Tauri 2 es el **primer shell a probar** porque admite un frontend HTML/JS/CSS existente en Windows y Android. Windows utiliza WebView2 y Android el WebView del sistema; la compilación requiere Rust, herramientas C++/WebView2 en Windows y Android Studio con SDK, NDK, Build Tools, JDK y variables de entorno para Android. Java 21 disponible para el emulador no demuestra que el SDK/NDK, Rust o la cadena Android estén listos. Configurar capacidades Tauri mínimas para archivos, portapapeles, enlaces y comandos nativos que realmente se usen; no conceder permisos generales al WebView. [Prerequisitos de Tauri 2](https://v2.tauri.app/start/prerequisites/), [versiones de WebView](https://v2.tauri.app/reference/webview-versions/), [capacidades](https://v2.tauri.app/security/capabilities/).

Prueba corta en la **Honor MagicPad 4 real** y Windows antes de migrar paneles: login correo/contraseña y Google (`LoginPage.vue` usa `signInWithPopup`, que puede comportarse distinto en WebView), persistencia/cierre de sesión, Firestore y Storage, llamada HTTPS a Netlify con ID token, WebSocket, selector de archivos, portapapeles, canvas/PNG, descargas/ZIP, orientación y layout. Firebase documenta límites de popup/redirect; si Google falla, diseñar navegador del sistema y retorno seguro, sin convertir la app en portadora de credenciales administrativas. [Firebase Auth y redirecciones](https://firebase.google.com/docs/auth/web/redirect-best-practices). La factibilidad de firma/distribución de APK y actualización de Windows queda por verificar; no se afirma compatibilidad del dispositivo por inferencia del código.

Si la prueba de MagicPad bloquea una capacidad crítica de Tauri, evaluar **Capacitor solo como shell Android** y mantener una interfaz Vue admin compartida con Windows. No introducir dos implementaciones de negocio por anticipado. La decisión final sobre shell se toma con resultados del dispositivo, no con la compilación del escritorio.

## Orden recomendado de implementación posterior

Cada unidad debe conservar las rutas actuales hasta demostrar paridad y prever reversión. Este documento no inicia esas tareas.

| Unidad | Objetivo y archivos principales | Dependencia / riesgo | Prueba y aceptación / reversión |
|---|---|---|---|
| 0 | Línea base F01–F30, rutas y reglas activas; comparar candidato local, Storage e índices. | Acceso de solo lectura a configuración real; riesgo de suponer reglas desplegadas. | Matriz de flujos pública/privada aprobada; sin cambios que revertir. |
| 1 | Extraer cliente HTTP con origen Netlify configurable y contratos Firebase/roles; `src/services/*`, Functions. | CORS, token y funciones Admin SDK. | Web actual sin regresiones; pruebas unitarias y staging; revertir adaptador. |
| 2 | Separar entrada y router web/admin; `src/main.js`, `src/router/index.js`, `vite.config.js`, `netlify.toml`, navegación. | Imports cruzados (`CommunityPanel`, navbar, loader, service worker). | Dos artefactos inspeccionados: web sin herramientas admin, privada sin PWA/SEO; web pública F01–F03/F05/F08–F10/F12/F13/F22/F27/F28 conserva uso; revertir selección de build. |
| 3 | Prototipo Tauri Windows + MagicPad con Auth, Firestore, Storage y Netlify. | WebView/OAuth, SDK/NDK, permisos y CORS. | Inicio/cierre de sesión, Guardar/reabrir documento de prueba, llamada con token y export en ambos; desechar prototipo si falla. Revisión Sol si cambia shell/Auth. |
| 4 | Primer módulo editorial: CMS F07, editor privado y visor público. | Entradas separadas, Rules/Storage compatibles. | Crear/editar/publicar en staging con publisher/admin según política aprobada; verificar `/p/:slug`; conservar editor web hasta corte. |
| 5 | Posts F04 y eventos F06; compartir, pickers F21 y temas F23. | Origen de funciones, archivos, localStorage. | Paridad de importación, imágenes, social, publicación y lectura pública F01–F05; reversión por módulo. |
| 6 | Comunidades F08/F09 y gestión de usuarios F11; conectar `role-management`. | Panel mixto, membresías, operaciones de bloqueo pendientes. | Miembro/visitante siguen interactuando; solo principal concede/revoca publisher; casos negativos y cuenta bloqueada; revertir UI por módulo, nunca abrir Rules. Revisión Sol para permisos. |
| 7 | Recompensas F13, perfiles F12 y notificaciones F22. | Proyección `publicProfiles`, `profile-progress`, escrituras privilegiadas. | Perfil público sin correo, recompensas auténticas, edición propia y denegaciones probadas; revertir lectores/UI de forma coordinada. Revisión Sol para privacidad. |
| 8 | OBS F14/F15/F26: editor privado, viewer web estable. | URL de origen, Rules y Socket.IO. | MagicPad guarda → OBS se actualiza → Windows reabre; siete familias de widgets e integraciones verificadas; mantener viewer web anterior. Revisión Sol para enlaces/servicio local. |
| 9 | Corte gradual de enlaces/rutas admin web y regresión F01–F30. | Unidades 0–8 y decisiones F16/F17/F30. | Auditoría de bundle, rutas legacy, pruebas en Windows/MagicPad y web, plan de rollback de build; no cortar si alguna función queda sin destino. |

El **primer módulo funcional a mover sigue siendo F07 (CMS)** tras la puerta técnica Tauri y la separación de entradas: ofrece lectura pública y edición privada claramente distinguibles. Antes de retirar la administración web se necesita definir si los publicadores podrán editar páginas, eventos, comunidades y overlays; el dashboard actual concede solo `posts` a `publisher` y reserva los demás paneles a `admin`. No ampliar esos permisos por simple traslado de interfaz.

## Decisiones y verificaciones pendientes

- Confirmar por módulo qué puede gestionar `publisher` además de posts; documentar operaciones concretas antes de crear controles privados.
- Definir sincronización/export de biblioteca de temas y plantillas sociales y resolver `publicProfiles` sin exponer correo ni credenciales.
- Decidir si alguna necesidad real exige URL OBS local; el visor HTTPS ya satisface actualización y continuidad al cerrar la ventana admin.
- Probar OAuth Google, CORS Netlify, Storage, WebSocket, exportación y layout en la MagicPad 4 física; la compatibilidad sigue **sin verificar**.
- Confirmar reglas Firestore/Storage **activas** y desbloquear de forma acotada moderación/gestión de usuarios; las 40 pruebas cubren el candidato local.
- Determinar distribución, firma, actualización y recuperación de acceso de la app privada. F16/F17 permanecen donde están; F30 sigue sin integración confirmada.

**Límite de esta fase:** documento de planificación. No se ha ejecutado build, emulador, APK, despliegue ni operación sobre datos reales para esta revisión.

# 37. Preparación final del monitor de imágenes

Fecha: 15 de noviembre de 2026. Inspección local y de solo lectura para la Fase A definida en [36](36-implementacion-monitor-fase-a.md). No se implementó el monitor ni se ejecutaron pruebas.

## Estado Git actual

Se ejecutaron `git status --short`, `git diff --stat`, `git diff --cached --stat` y `git ls-files --others --exclude-standard`. Justo antes de escribir este documento había **40 archivos seguidos modificados, `src.zip` eliminado localmente, 60 archivos nuevos sin seguimiento y ningún cambio preparado**. El diff seguido abarca 41 archivos, 673 inserciones y 464 eliminaciones, además del binario eliminado. `git diff --cached --stat` no produjo entradas. La creación de este informe suma un archivo sin seguimiento. No se alteró ni restauró ningún cambio previo.

El listado completo de archivos nuevos obtenido por `git ls-files --others --exclude-standard` incluye los informes 01–21, 23–30, 32–33, 35–36 de `docs/arquitectura-migracion/`; documentos de ejemplo; el endpoint y servicio de `role-management`; los tres archivos del candidato/emulador Firestore; `backendClient.js` y sus pruebas; componentes/estilos de home, posts y widgets, y pruebas de servicios. El directorio de arquitectura figura como un solo `??` en `git status --short`, pero sus documentos aparecen individualmente en `git ls-files`. Ninguno de esos archivos nuevos se consideró ya comprometido o desplegado.

## Inspección por archivo necesario

**Estados:** M = modificado sin preparar; ?? = sin seguimiento; limpio = sin diferencia frente a Git. «Cambio previsto» es una propuesta, no una edición realizada.

- `src/components/posts/PostEditor.vue` (**M**). El diff local añade frase destacada, componente de presentación y búsqueda IGDB por `backendRequest` con cancelación; no cambia todavía la lógica de `savePost`. Esta guarda `posts` con `addDoc` o `updateDoc`, y usa un `writeBatch` adicional para desanclar entradas de Inicio. **Cambio previsto:** conservar el ID devuelto por `addDoc`, asignar IDs a nuevos elementos de imagen y llamar a la sincronización después del guardado, con estado pendiente/reintento visible. **Riesgo alto:** editar un archivo ya modificado, mantener las tres ramas de guardado y no ocultar éxito del post si falla el monitor.
- `src/services/postSectionGames.js` (**M**). Su `normalizePostSections` reconstruye secciones y hoy descarta un ID extra. El diff local conserva `highlightQuote` y ajusta el filtro de secciones vacías. **Cambio previsto:** conservar un `mediaSlotId` validado; generar IDs solo en el editor para secciones nuevas. **Riesgo medio:** perder el campo `highlightQuote` o asignar IDs a contenido heredado al normalizar.
- `src/services/postSectionGames.test.js` (**M**). Contiene pruebas locales relacionadas con secciones/frases destacadas. **Cambio previsto:** añadir casos de ID persistente, copia y legado sin quitar los actuales. **Riesgo bajo** con extensión puntual.
- `src/services/socialContent.js` (**limpio**). `normalizeSocialContent` reconstruye slides y descarta cualquier ID de entrada; conserva `sectionIndexes` como referencias editoriales por posición. **Cambio previsto:** preservar `mediaSlotId` de slides nuevos, sin alterar `sectionIndexes` ni la salida de slides históricos. **Riesgo medio:** importación JSON y render de carruseles.
- `src/services/socialContent.test.js` (**limpio**). **Cambio previsto:** casos de preservación de ID y compatibilidad de slides antiguos. **Riesgo bajo**.
- `src/services/homeHero.js` (**limpio**). `normalizeHomeHero` reconstruye `hero.images` con `url`, `alt`, `position` y deduplica por URL; descarta un ID. **Cambio previsto:** preservar `mediaSlotId` cuando existe. **Riesgo medio:** galería reconstruida desde texto en el editor y deduplicación de URLs.
- `src/services/homeHero.test.js` (**limpio**). **Cambio previsto:** ID estable con misma imagen y datos sin ID. **Riesgo bajo**.
- `src/components/modals/EventEditorModal.vue` (**limpio**). `saveEvent` usa `updateDoc` o `addDoc` de `galaxyEvents`; el formulario escribe `backgroundUrl` y lee `imageUrl` como legado. **Cambio previsto:** retener ID de `addDoc`, marcar nuevo/cambio de imagen y llamar a sincronización posterior. **Riesgo medio:** evento guardado con monitor pendiente; no registrar `imageUrl` histórico automáticamente.
- `src/components/events/EventsManager.vue` (**limpio**). Muestra imagen y puede actualizar `featured`; no guarda la URL del evento. **Cambio previsto:** ninguno para sincronización; solo enlazar al panel si se decide navegación contextual. **Riesgo bajo**, no incluirlo en la primera edición.
- `netlify/functions/role-management.js` y `netlify/functions/lib/role-management.js` (**??**). Muestran el patrón Admin SDK, `verifyIdToken(token, true)` y transacción que lee rol/bloqueo vigente. **Cambio previsto:** ninguno; servir de referencia para el nuevo endpoint. **Riesgo medio:** son archivos sin seguimiento, por lo que no se debe reemplazarlos ni asumir despliegue.
- `src/services/backendClient.js` (**??**). Construye origen HTTPS configurable, obtiene ID token bajo `authenticated: true` y envía `Authorization: Bearer`. **Cambio previsto:** ninguno; reutilizar desde un servicio cliente nuevo. **Riesgo medio:** es código local sin seguimiento y Tauri/CORS requerirá validación futura.
- `security/firestore/firestore.candidate.review.rules` (**??**). Define `admin()` por `users.role` y `isBlocked`; `posts` y `galaxyEvents` tienen permisos existentes; no existen coincidencias para `imageReferences`, `imageIncidents` o `imageHistory`, por lo que el deny final las rechaza. **Cambio previsto:** solo en candidato local, permitir lectura a admin activo y negar todas las escrituras cliente en esas tres rutas. **Riesgo alto:** Rules combina allows coincidentes con OR; Admin SDK omite Rules. No inferir reglas desplegadas.
- `security/firestore/rules.candidate.emulator.mjs` (**??**). Carga exactamente el candidato anterior, exige `demo-galaxia-security` y `127.0.0.1:8055`; incluye fixtures de admin, publisher, bloqueado y visitante. **Cambio previsto:** pruebas de lectura/listado admin y denegación de toda escritura cliente, incluso técnica y de roles. **Riesgo medio:** mantener las pruebas actuales y el aislamiento.
- `src/services/notifications.js` (**limpio**). Escribe `users/{uid}/notifications` para acciones sociales y posts; `notifyNewPost` también puede encolar correos. **Cambio previsto:** ninguno; el monitor deriva avisos de `imageIncidents` abiertos. **Riesgo alto si se reutiliza para administración:** duplicados y difusión a usuarios.
- `src/router/index.js` (**limpio**). Rutas `/admin/...` con guard `adminOnly`/`publisherOnly`, dentro del router de la web actual. **Cambio previsto:** añadir ruta de monitor solo si el build administrativo la incluirá; el guard visual no reemplaza permisos Firebase. **Riesgo medio:** publicar interfaz administrativa en build público antes de la separación.
- `src/components/nav/AdminSidebar.vue` (**limpio**). Muestra navegación por rol en el espacio administrativo. **Cambio previsto:** enlace `Monitor de imágenes` condicionado a admin, cuando exista la ruta privada. **Riesgo bajo**. `src/components/nav/PublicNavbar.vue` (**M**) retira controles públicos de creación/roles; **no requiere edición** para el monitor. Tocarlo podría reintroducir controles administrativos en la web pública.

## Plan exacto de archivos por bloque

**A. Identificadores estables.** Modificar `postSectionGames.js`, `socialContent.js`, `homeHero.js` y `PostEditor.vue`; ampliar sus tres archivos de prueba. `mediaSlotId` se crea al añadir/copiar una sección, slide o elemento de galería nuevo; los normalizadores lo preservan y los lectores antiguos toleran su ausencia. El reordenamiento de secciones usa `splice` del objeto, así que conserva el ID; la duplicación hace copia profunda y necesita ID nuevo. `sectionIndexes` y los IDs visuales `social-${index}` permanecen como lógica editorial, no como identidad del monitor.

**B. Modelo y permisos.** Crear un módulo pequeño de contrato/validación de referencias en `netlify/functions/lib/` y sus pruebas; modificar exclusivamente `security/firestore/firestore.candidate.review.rules` y `rules.candidate.emulator.mjs`. Modelo aprobado: `imageReferences`, `imageIncidents`, `imageHistory`; disponibilidad `unverified`, estados administrativos separados. Lectura cliente admin activo; escritura cliente denegada; backend verifica rol vigente. No crear colección adicional de notificaciones.

**C. Endpoint de sincronización.** Crear `netlify/functions/image-monitor.js` y `netlify/functions/lib/image-monitor.js`, con pruebas Node. Verificar ID token, usuario activo y titularidad del post/evento para publisher; leer documento guardado y sincronizar solo ranuras nuevas/cambiadas indicadas, usando URL del documento y transacción/ID de operación para idempotencia. Rechazar versiones antiguas. Reutilizar `backendClient.js` desde un nuevo `src/services/imageMonitorClient.js`. Ninguna petición a URL de imagen.

**D. Incidencias e historial.** Extender el mismo endpoint/servicio con acciones de admin para crear incidencia, observar, revisar, ignorar, resolver y consultar historial. No crear otro backend. Referencias e historial se escriben transaccionalmente en el backend; los avisos se derivan de incidencias abiertas y no silenciadas. Sustituir una imagen requiere guardar el post/evento mediante su editor y luego sincronizar la referencia; cambiar solo el documento del monitor no modifica contenido público.

**E. Interfaz administrativa.** Crear `src/pages/ImageMonitorPage.vue` y su servicio cliente anterior; modificar `src/router/index.js` y `src/components/nav/AdminSidebar.vue` únicamente al disponer de una ruta exclusiva del build privado o una barrera de build verificada. Integrar `PostEditor.vue` y `EventEditorModal.vue` con estado `pending/synchronized/failed` y reintento con el mismo `operationId`. No modificar `PublicNavbar.vue`, `image-proxy.js`, `imageLibrary.js` ni el servicio de notificaciones sociales.

**F. Pruebas.** Ampliar normalizadores, Node del servicio/endpoint y suite del emulador. Probar guardado normal y home pin, creación y edición de eventos, caída entre guardado y sincronización, reintento, edición concurrente, copia/reordenamiento, contenido histórico sin ID, permisos por rol, duplicados e historial inmutable. Al implementar: pruebas dirigidas, Vitest completo, Node, Emulator aislado y `npm run build`; registrar resultados sin inferir que reglas candidatas equivalen a producción.

## Conflictos y orden seguro

No hay un archivo cuyo estado impida **determinar** el cambio: los diffs de `PostEditor.vue`, `postSectionGames.js` y `PublicNavbar.vue` son visibles, y los demás puntos necesarios están limpios o son nuevos. Sí hay **riesgo de colisión al editar** `PostEditor.vue` y `postSectionGames.js`; antes de cada parche se vuelve a leer su contenido/diff actual y se verifica el diff después. El endpoint `role-management` y `backendClient.js` son locales sin seguimiento: se reutilizan sus contratos, no se reconstruyen ni sobrescriben. El `src.zip` eliminado permanece intacto.

Orden: (1) IDs y regresión de normalizadores; (2) candidato de reglas y pruebas de permisos; (3) endpoint y pruebas de idempotencia; (4) servicio cliente; (5) sincronización tras guardado de posts, luego eventos; (6) incidencias e historial; (7) ruta/interfaz solo con protección de build; (8) suites completas. La ruta privada y la política de CORS Tauri requieren verificación al crear los builds; no bloquean los módulos puros o el endpoint local. La ventana entre guardar contenido y sincronizar el monitor exige estado pendiente visible y reintento seguro, como consta en 36.

**Resultado:** inventario y secuencia listos para implementación posterior; no se editaron código, reglas, colecciones ni datos.

## Block A gallery editor update (15 November 2026)

Implemented the visual gallery editor in `src/components/posts/PostGalleryEditor.vue` and connected it to `post.hero.images` in `PostEditor.vue`. The previous multiline URL field is removed. The editor supports adding an image, replacing URL/text, deleting, duplicating, and moving up/down. It adds no dependency and uses responsive controls suitable for desktop and touch layouts.

Gallery operations live in `src/services/homeHero.js` so their identity behavior is testable without a DOM. Existing historical items receive local `mediaSlotId` values on the first explicit gallery edit; no URL or previous array position is used to infer identity. Replacement preserves the selected slot, removal drops it, duplication creates a new slot, and reorder retains all slots. `normalizeHomeHero` preserves valid IDs, repairs duplicate IDs, preserves deliberately duplicated URLs when each has an ID, and leaves legacy entries without IDs alone until edited. Existing PostEditor changes (`highlightQuote`, IGDB via backendClient and request cancellation) were retained.

### Files changed for this gallery work

- `src/components/posts/PostGalleryEditor.vue` (new)
- `src/components/posts/PostEditor.vue` (gallery field/import only; pre-existing local changes retained)
- `src/services/homeHero.js`
- `src/services/homeHero.test.js`

### Validation

- Directed homeHero tests: **12/12 passed**.
- Full Vitest: **55 files, 323 tests passed**.
- `npm run build`: **passed**, 643 modules transformed.
- The SFC is build-compiled, but interactive browser/device-level UI behavior is not independently tested because the current test setup has no DOM component-test environment. Operation and persistence semantics are covered by pure unit tests.

This completes the gallery-editor portion of Block A only; it does not implement the image-monitor backend, collections, or rules.

## Auditoría final del bloque A (15 de noviembre de 2026)

**Veredicto: NO APROBADO.** El editor de galería y sus operaciones puras funcionan en las pruebas disponibles, pero la identidad de secciones y diapositivas todavía puede asociarse al elemento equivocado durante la importación. El bloque A exige identidad persistente para los tres tipos de elemento; las pruebas verdes no cubren ese flujo.

### Hallazgos que impiden aprobarlo

1. `PostEditor.vue`, `pasteJsonIntoPost()` (aprox. líneas 1420-1435): al importar secciones y diapositivas se toma `currentSections[index]?.mediaSlotId` o `currentSocialSlides[index]?.mediaSlotId` antes del ID importado. Un elemento nuevo o reordenado hereda así la identidad del que antes ocupaba la misma posición. El mismo bloque hereda `image` por índice si la importación no trae imagen, con riesgo de asociar contenido e imagen incorrectos. Es imprescindible conservar un ID previo solo cuando se demuestre que es el mismo elemento, validar su unicidad y generar ID nuevo para elementos nuevos o copiados. La posición y la URL no demuestran identidad.
2. `PostEditor.vue` permite cambiar `section.image` mediante `ClipboardUrlField` y el selector IGDB (aprox. líneas 496 y 1513), pero una sección histórica sin `mediaSlotId` no recibe ID cuando se sustituye expresamente su imagen. Esto incumple la decisión del informe 36. La corrección debe asignar un ID a esa sección concreta en la edición explícita, sin tocar otras secciones históricas.
3. `normalizePostSections()` y `normalizeSocialContent()` preservan IDs válidos, pero no detectan IDs repetidos de entrada. Una importación con dos secciones o slides que comparten `mediaSlotId` persiste ambas identidades duplicadas. Debe definirse y probarse una reparación o rechazo antes de guardar, sin añadir IDs a contenido histórico por una simple lectura.
4. `homeHeroGallery()` aún deduplica por URL aunque `normalizeHomeHero()` conserva dos ocurrencias con IDs distintos. Una imagen duplicada en el gestor se guarda y reaparece en el editor, pero la galería pública puede mostrar una sola. Hay que decidir y probar el comportamiento visual de dos ranuras distintas que comparten URL.

### Interfaz, compatibilidad y alcance de la evidencia

- `PostGalleryEditor.vue` recibe `images` y emite `update:images`; `v-model:images="post.hero.images"` actualiza el estado padre. Cada operación usa la lista actual, devuelve una nueva lista y mantiene los IDs de las ranuras existentes. Las galerías históricas reciben IDs al primer cambio explícito; abrir y guardar sin editar no les añade IDs. La clave visual `legacy-${index}` solo se usa antes de esa primera edición.
- `savePost()` normaliza `hero`, `sections` y `social` antes de `updateDoc`/`addDoc`; los IDs válidos se conservan. Las pruebas de galería comprueban la secuencia operación → normalización → reapertura normalizada, pero no ejecutan un guardado Firestore ni montan el componente en un navegador. No hay prueba interactiva de clics, reactividad real, imágenes IGDB o guardado completo.
- La búsqueda IGDB sigue llamando a `backendRequest('igdb', ...)` con `AbortSignal`; `resetImageSearch()` cancela la petición. `highlightQuote` sigue presente en editor, vista previa y normalizador. La suite existente valida partes de esos servicios; no constituye una prueba interactiva de regresión de PostEditor. Los carruseles sociales conservan `sectionIndexes`, pero carecen de pruebas específicas de IDs de slides.

### Validación ejecutada en este estado

- Pruebas dirigidas (`homeHero`, `postSectionGames`, `socialContent`, `backendClient`): **30/30**, cuatro archivos.
- Vitest completo: **323/323**, 55 archivos.
- `npm run build`: **correcto**, 643 módulos transformados.

### Correcciones y pruebas mínimas para una nueva revisión

Corregir la importación por índice y la asignación de ID al cambiar la imagen de una sección histórica; garantizar unicidad de IDs de secciones y slides; resolver la representación pública de URLs duplicadas con ranuras distintas. Añadir regresiones para importación reordenada, elementos nuevos/copias, IDs repetidos, sustitución de imagen histórica y persistencia tras guardar y reabrir. Una prueba de componente o una sesión interactiva debe verificar los eventos y la reactividad de la galería. Esta auditoría solo modificó este informe; no cambió código funcional, reglas, datos ni producción.

## Validación final del bloque A (15 de noviembre de 2026)

**Veredicto: NO APROBADO.** Se confirmaron en el código las correcciones parciales de importación (IDs explícitos validados, nuevos IDs para ausencia/colisión, sin heredar sección o imagen por índice), asignación de ID al reemplazar imagen de sección y conservación de URLs repetidas en `normalizeHomeHero()`/`homeHeroGallery()`. `HomeNewsHero.vue` registra fallos por `mediaSlotId` cuando existe, no por URL.

Los normalizadores regeneran IDs repetidos de secciones, slides y galerías. Los IDs de sección y slide regenerados se vuelven estables en la segunda normalización porque ya son únicos. La galería hero mantiene el orden y las URLs repetidas, incluidas referencias históricas sin ID.

Validación ejecutada después de los cambios:

- Pruebas dirigidas de `homeHero`, `postSectionGames` y `socialContent`: **25/25**.
- Vitest completo: **55 archivos, 325/325**.
- `npm run build`: **correcto, 643 módulos**.

La aprobación queda pendiente porque no hay pruebas automatizadas que invoquen el flujo real `pasteJsonIntoPost()` para verificar importaciones con IDs ausentes, explícitos, duplicados y URLs repetidas, ni que demuestren que cambiar una imagen histórica genera/preserva el ID desde los eventos reales del editor. Las pruebas actuales cubren los normalizadores, operaciones de galería, conservación de IDs al normalizar/abrir y consumidor puro `homeHeroGallery`, pero no el cableado del componente PostEditor. No se declara aprobada una regresión de importación que no se ejecutó.

## Continuación ejecutada: cierre de A y bloques B–F (15 de noviembre de 2026)

Esta sección reemplaza el veredicto anterior, que correspondía al estado previo a las pruebas nuevas. Se mantuvieron todos los cambios locales existentes; no se prepararon ni restauraron archivos.

### Bloque A — APROBADO

Se extrajo la operación de medios del portapapeles a `src/services/postEditorMedia.js`; `PostEditor.vue` ahora invoca esa misma operación desde `pasteJsonIntoPost()`. Las pruebas ejecutan lectura de portapapeles simulada → parseo → aplicación de medios → normalización de guardado y reapertura. Cubren IDs importados, ausentes y repetidos, no heredar IDs ni imágenes por posición, URLs duplicadas y reemplazo explícito de una imagen histórica que asigna un ID solo a su sección. La selección IGDB y el campo de URL usan la misma función de identidad.

`homeHeroGallery()` conserva las ocurrencias repetidas como ranuras distintas. En posts existentes, asignar IDs locales a filas históricas de Inicio durante la primera edición no registra esas filas por accidente: solo se sincronizan cambios explícitos de URL, copia, alta o retirada. Un cambio de título, reordenamiento o guardado sin modificación de imagen no registra una URL histórica.

La prueba cubre el flujo de datos invocado por el editor y el build compila los componentes. El proyecto no tiene entorno de montaje de componentes Vue/DOM; no se afirma cobertura de clics en navegador. Esto no afecta las operaciones de identidad probadas ni la compilación.

### Bloques B–E — implementación local

- **B. Modelo y reglas:** añadido el contrato validado para `imageReferences`, `imageIncidents` y `imageHistory`. El candidato Firestore concede lectura/listado solo a administradores activos y deniega toda escritura del SDK cliente, incluso a administradores. Disponibilidad permanece `unverified`; el historial no almacena URLs anteriores.
- **C. Backend autenticado:** añadido `netlify/functions/image-monitor.js` con verificación revocable del ID token y `IMAGE_MONITOR_ENABLED`. El servicio consulta el rol y bloqueo actuales, limita al publisher a sus posts y eventos propios, exige versión `updatedAt`, acepta claves de ranura pero nunca una URL del cliente y extrae el valor del documento guardado. La transacción crea/actualiza o archiva referencias e historial idempotente.
- **D. Incidencias:** añadido flujo admin para abrir, anotar, revisar, silenciar y resolver incidencias. Los estados administrativos no cambian disponibilidad; las transiciones y reaperturas llevan secuencia e historial.
- **E. Interfaz:** añadido `ImageMonitorPage.vue`, con referencias, incidencias e historial y lectura de URL sin parámetros. Ahora forma parte del proyecto separado `C:\Users\admin\Desktop\Galaxia Studio`; el build público principal ya no registra las rutas de administración. PostEditor y EventEditorModal conservan el estado pendiente y el reintento con el mismo `operationId` en Studio.

La sincronización de editores sigue requiriendo `IMAGE_MONITOR_ENABLED=true` en el backend. Studio activa su indicador de cliente; la función sigue apagada hasta configurar el servidor. No se copiaron credenciales privadas.

### Validación final

- Pruebas dirigidas de identidad, importación, cliente y normalizadores: **40/40**, seis archivos.
- Vitest completo: **333/333**, 57 archivos.
- Node del monitor: **9/9**. Node de gestión de roles existente: **5/5**.
- Firebase Emulator aislado (`demo-galaxia-security`, `127.0.0.1:8055`): **42/42**. Incluye denegación de lectura/escritura cliente por rol y transacción backend Admin SDK para sincronización, cambio de URL, incidencia, nota, resolución e historial.
- Build público: **correcto**, 645 módulos. No emite `ImageMonitorPage`.
- Build administrativo: **correcto**, 647 módulos. Emite `ImageMonitorPage` en `dist-admin`.
- `git diff --check`: sin errores de whitespace.

El candidato de Rules y las pruebas se mantuvieron locales. No se desplegó, no se consultó ni modificó Firebase de producción, vacaciones ni impresora Ruzafa. La página admin y el endpoint no están activados hasta configurar sus variables y desplegar los artefactos por separado.

### Separación completa en Galaxia Studio

El gestor global se copió a una carpeta independiente, `C:\Users\admin\Desktop\Galaxia Studio`, fuera del repositorio público. Su router incluye dashboard admin/publisher, publicaciones, eventos, usuarios, recompensas, overlays y el monitor; excluye las páginas de vacaciones e impresora Ruzafa. La ruta inicial abre `/admin/dashboard`; el monitor usa `/admin/image-monitor`. La pantalla de acceso no permite registrar cuentas nuevas.

El proyecto principal conserva su carpeta y despliegue habitual, pero `npm run build` genera únicamente el sitio público. `netlify.toml` limita sus funciones a ocho wrappers públicos; no publica image-monitor ni role-management. Studio tiene su propio `package.json`, dependencias, `netlify.toml` y carpeta de funciones con ocho wrappers administrativos/de apoyo, sin la función de vacaciones. La configuración pública Firebase ya está en el `.env.local` ignorado de Studio; no se copió ninguna credencial privada. La carpeta Studio no pertenece al repositorio Git principal y no se sincroniza ni se publica al hacer push de la web pública.

Validación del estado separado:

- Galaxia Studio: Vitest **306/306**, 53 archivos; Node monitor **9/9**; Node roles **5/5**; build correcto, **532 módulos**; `npm audit`: **0 vulnerabilidades**.
- Proyecto principal: Vitest **333/333**, 57 archivos; Node monitor **9/9**; Node roles **5/5**; build público correcto, **443 módulos**. La búsqueda de artefactos confirma que `DashboardPage`, `PostEditorPage`, `ImageMonitorPage` y `/admin/image-monitor` no aparecen en `dist`.
- Firebase Emulator aislado con Temurin 21 en `JAVA_HOME` temporal: **42/42** en `demo-galaxia-security`; apagado al terminar.
- `npm audit` del proyecto principal: **0 vulnerabilidades**. `git diff --check`: sin errores de whitespace (avisos LF/CRLF de Windows).

La carpeta y el sitio de Studio no están publicados ni vinculados a un dominio. Para operar datos reales, las reglas candidatas de Firestore y el backend monitor deben publicarse/configurarse por separado; permanecen locales y el backend sigue desactivado. No se desplegó, no se modificaron Rules de producción, vacaciones ni impresora Ruzafa. La configuración por sitio y directorio de funciones sigue el modelo documentado por [Netlify Functions](https://docs.netlify.com/build/functions/configuration/) y [su configuración basada en archivos](https://docs.netlify.com/build/configure-builds/file-based-configuration/).

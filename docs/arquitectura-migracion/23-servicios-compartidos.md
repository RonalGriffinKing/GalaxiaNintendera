# 23. Servicios compartidos — registro Unidad 1

## Validación IGDB — Unidad 1.2

Revisión realizada sobre `GameImagePicker.vue`, `backendClient.js`, `imageLibrary.js` y sus consumidores. `GameImagePicker.vue` importa `backendRequest` y ejecuta `backendRequest('igdb', { method: 'POST', body: { query: name }, signal: controller.signal })`. IGDB no solicita autenticación en el código anterior; `authenticated` no se activa y el cambio no añade token. El cliente serializa el cuerpo como JSON, conserva la señal y convierte respuestas HTTP no exitosas en errores con el código del backend.

El componente conserva la búsqueda con mínimo de dos caracteres, selección inicial de la primera imagen, filtro de juegos/tipos, selección de imagen, cancelación al cambiar la consulta/desmontar y supresión de errores AbortError. La búsqueda vacía evita llamada de red por el watcher y deshabilita el botón. La presentación del resultado y del error usa los mismos campos antes existentes (`images`, `games`, `error`).

### Consumidores localizados

- `EventEditorModal.vue` usa el selector para imágenes de eventos.
- `CommunityPanel.vue` usa el selector para imágenes de eventos de comunidad.
- `PostEditor.vue` tiene una segunda búsqueda IGDB propia (no usa `GameImagePicker`); sigue pendiente su adaptación.
- `EventImageSearchModal.vue` usa `searchIgdbMedia` en `imageLibrary.js`, que ya llama a `backendRequest`.
- `imageSearchPreview` usa `backendFunctionUrl('image-proxy', ...)` para la previsualización externa.

### Pruebas ejecutadas

- `npx vitest run src/services/imageLibrary.test.js`: **5 aprobadas, 0 fallidas**.
- `npx vitest run src/services/backendClient.test.js src/services/imageLibrary.test.js`: **10 aprobadas, 0 fallidas**.
- `npm run build`: correcto; Vite compiló 640 módulos.

No hay `@vue/test-utils` ni entorno DOM configurado en `package.json`/Vitest. Por ello no se añadió una prueba interactiva de SFC. La compilación verifica el import y la plantilla, pero no simula en navegador los estados vacíos, cancelación, selección y error del componente. El transporte sí se cubre por las pruebas de backendClient y los consumidores de imageLibrary. Esa interacción permanece pendiente de prueba manual o de incorporar posteriormente un entorno de componentes autorizado.

## Registro anterior de Unidad 1

En este checkout, `docs/arquitectura-migracion/22-linea-base-migracion.md` no está disponible y no se reconstruyó su contenido. Se usa como referencia el documento 21 y el código presente.

El historial de trabajo de esta unidad indica que `backendClient.js` ya proporciona origen configurable, restricción HTTPS fuera de desarrollo local, token Firebase opcional obtenido desde `auth.currentUser`, manejo de 401/403 y errores de red. Se adaptaron `profile-progress`, Nintendo y Xbox. Las pruebas dirigidas de esos clientes se habían reportado como 39/39 en la continuación anterior; en esta Unidad 1.2 solo se volvieron a ejecutar backendClient e imageLibrary, **no Xbox/Nintendo/profileProgress**.

## Estado y pendientes

La validación IGDB de `imageLibrary.js` y el transporte utilizado por `GameImagePicker.vue` está satisfactoria en pruebas de servicio y build. La validación de interacción del componente queda limitada según lo descrito arriba.

La Unidad 1 completa continúa **abierta**. En el código inspeccionado durante esta validación siguen pendientes:

- Proxy de imágenes en `EventSharePage.vue`, `PostSharePage.vue` y `constants/assets.js` requiere revisar consumidores/formatos (`url`/`src`) y convertir URLs sin romper `img src` ni descargas.
- `youtube-feed` sigue llamado directamente en `HomeMediaPanel.vue` y `CommunityPanel.vue`.
- Exportación social y cualquier endpoint restante deben recibir una revisión de contrato dedicada.
- No se ejecutó el conjunto completo de pruebas ni se volvió a ejecutar Xbox/Nintendo/profileProgress en esta unidad.

No se modificó producción, Firebase, vacaciones ni impresora Ruzafa. No se añadieron dependencias ni se desplegó.

## Cierre IGDB de PostEditor — Unidad 1.3

Inspeccionado `PostEditor.vue`: su modal de imágenes tenía una búsqueda POST a IGDB con `{ query }`, sin token ni cabecera de autorización. La respuesta se interpreta como `images`, `games` o `game`; luego se conserva caché local, filtro de juego/tipo, asignación a portada/sección y manejo de errores. El transporte se cambió a `backendRequest('igdb', { method: 'POST', body: { query }, signal })`, manteniendo el contrato JSON y sin añadir autenticación.

Se añadió un `AbortController` para abortar la solicitud anterior al reset/cambio de búsqueda/desmontaje. El número de secuencia que ya protegía resultados obsoletos permanece. Errores de abortado se ignoran y no aparecen como fallo de búsqueda. Consumidores IGDB localizados: `GameImagePicker.vue`, `EventImageSearchModal.vue` vía `imageLibrary.js`, y búsqueda integrada `PostEditor.vue`. La búsqueda de `PostEditor.vue` ya no llama directamente a `/.netlify/functions/igdb`.

### Verificación Unidad 1.3

- `npx vitest run src/services/backendClient.test.js src/services/imageLibrary.test.js src/services/xboxProfileClient.test.js src/services/nintendoPresenceClient.test.js src/services/profileProgress.test.js`: **7 archivos, 45 pruebas aprobadas**.
- `npm run build`: correcto; Vite compiló 640 módulos.
- `rg` de consumidores confirmó que las llamadas de IGDB usan `backendRequest`; no queda `fetch('/.netlify/functions/igdb')` en `src`.
- `npx vitest run` completo: **75 archivos y 464 pruebas aprobaron**, pero el comando termina con error por 5 archivos de respaldo descubiertos bajo `.restore-backups/` y `netlify/functions/lib/role-management.test.mjs` (prueba Node, no suite Vitest). Los dos tests de respaldo importan componentes que dependen de `@/utils/publicIdentity`, ausente en esas copias. Ninguna de estas cinco fallas es de IGDB; deben resolverse en la configuración/alcance global de Vitest para obtener un comando global limpio.
- No se añadió una prueba de interacción para `PostEditor.vue`: no hay entorno DOM ni Vue Test Utils configurados. El caso de abortado se cubre a nivel del contrato `backendClient` (señal enviada y `AbortError` propagado); esto no simula los estados visuales del modal. La compilación verifica el SFC, no la interacción real.

La adaptación IGDB de PostEditor queda completada con pruebas de cliente y compilación. La Unidad 1 permanece **abierta** por proxy, YouTube y exportación social; el conjunto completo también sigue fallando por los cinco archivos ajenos descritos arriba.

## Estabilización de pruebas — Unidad 1.4

### Hallazgos

- `.restore-backups/` contiene snapshots de restauración fechados, manifests, parches y copias de archivos, no un directorio de pruebas activas. Los dos `publicIdentityRendering.test.js` y los dos `socialRendering.test.js` hallados en las dos snapshots tienen hashes coincidentes por pareja; no existen copias activas de esos tests bajo `src`. Se conservan intactos y Vitest deja de descubrirlos.
- `netlify/functions/lib/role-management.test.mjs` usa `node:test`/`node:assert`, y sus cinco casos se ejecutan con `node --test`. No es una suite Vitest. Sus pruebas de seguridad se conservan y pasan por un script separado.
- Firebase Rules usan `node:test` y `@firebase/rules-unit-testing`; `rules.candidate.emulator.mjs` exige `demo-galaxia-security` y `FIRESTORE_EMULATOR_HOST=127.0.0.1:8055`, y carga el candidato local por ruta relativa. Debe ejecutarse solo bajo Firebase Emulator.

### Configuración añadida

`vite.config.js` usa `defineConfig` de `vitest/config` (y `loadEnv` de Vite) y excluye snapshots `.restore-backups`, archivos Node `role-management`, y scripts de emulator Firestore del descubrimiento Vitest. No se excluyeron pruebas activas.

`package.json` define comandos separados: `npm test` para Vitest; `npm run test:node:roles` para el test Node de roles; y `npm run test:firestore:emulator` para `firebase emulators:exec` con `security/firestore/firebase.emulator.candidate.json`, proyecto demo y suite candidata.

### Resultados ejecutados

- Dirigidas `backendClient` + `imageLibrary`: **11/11**.
- Suite Vitest completa (`npm test`): **53 archivos, 312 pruebas aprobadas**. No se descubren snapshots ni suites Node ajenas.
- Node roles (`npm run test:node:roles`): **5/5 aprobadas**.
- Build (`npm run build`): correcto, 640 módulos.
- Firebase Emulator (`npm run test:firestore:emulator`): **no ejecutada**. Firebase CLI 15.17.0 intenta iniciar el emulador, pero el proceso actual no encuentra `java` (`spawn java ENOENT`); `Get-Command java` tampoco lo encuentra. No se instaló software. Aunque Java se reportó instalado previamente, no está disponible en el PATH de este entorno de ejecución; configurar PATH/JAVA_HOME en la sesión y repetir. No se afirma que las reglas compilaron en esta ejecución.

Los cambios de esta unidad solo afectan configuración de pruebas/scripts y este informe; no afectan código funcional, Firebase real ni despliegues. La Unidad 1 de servicios compartidos continúa abierta por las adaptaciones pendientes de proxy, YouTube y exportación social.

## Recuperación Firebase Emulator — Unidad 1.5

El proceso inició sin `JAVA_HOME` y sin `java.exe` en PATH. Se localizó Temurin JDK **21.0.13** en `C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot`. Se establecieron `JAVA_HOME` y `PATH` únicamente en el proceso PowerShell de verificación, sin cambiar variables permanentes ni instalar software. `java -version` confirmó OpenJDK 21.0.13 LTS.

Se ejecutó `npm run test:firestore:emulator`, cuyo comando usa exclusivamente `security/firestore/firebase.emulator.candidate.json` y el proyecto `demo-galaxia-security`. Firebase CLI 15.17.0 confirmó el proyecto demo y Firestore ligado a `127.0.0.1:8055`; el emulador cargó `security/firestore/firestore.candidate.review.rules`. Resultado: **40 aprobadas, 0 fallidas**. Los logs muestran errores `PERMISSION_DENIED` generados por intentos denegados de las pruebas negativas; el proceso Node concluyó con código 0. No se alteraron reglas, ni se desplegó o accedió a producción.

## Adaptadores proxy, YouTube y exportación — Unidad 1.6

### Proxy de imágenes

Se revisó `netlify/functions/image-proxy.js`: es un GET público, admite `src` base64url y `url`, valida protocolos HTTP/HTTPS, limita tamaño a 12 MiB y devuelve imagen binaria (no JSON). Por ese contrato, consumidores de `<img>` necesitan una URL directamente cargable, así que utilizan `backendFunctionUrl` del cliente compartido para resolver el origen; no pasan la respuesta binaria por `backendRequest`, que es el cliente JSON. Se adaptaron `constants/assets.js` (preserva el formato `src`), `imageLibrary.js` (parámetro `url`), `EventSharePage.vue` (`url`) y `PostSharePage.vue` (`url` + `cb` para invalidar caché). No se añadió autenticación.

Pruebas: `src/constants/assets.test.js` cubre origen configurado, decodificación/compatibilidad de `src`, URL same-origin e inline. `imageLibrary.test.js` cubre URL proxy con el parámetro `url`. Resultado conjunto: **8/8 aprobadas**.

### YouTube feed

`youtube-feed` es un GET público al feed Atom de YouTube con `channelId`, respuesta JSON `{ items }`, caché y sin autenticación. Se añadió `youtubeFeedClient.js`, adaptador delgado sobre `backendRequest`, y se adaptaron `HomeMediaPanel.vue` y `CommunityPanel.vue`. Ambos conservan sus comportamientos de fallback cuando el feed falla. Las llamadas directas a YouTube Data API en esos componentes permanecen intactas; no son funciones Netlify y conservan su flujo actual.

`youtubeFeedClient.test.js` valida canal, señal opcional y propagación de error para el fallback. Resultado: **2/2 aprobadas**. No se añadieron secretos ni se cambió el contrato del endpoint.

### Exportación social

`PostSharePage.vue` y `EventSharePage.vue` cargan imágenes mediante Browser Source; la exportación rasteriza el DOM con `html-to-image` y no hace una petición Netlify JSON. Sus URL de proxy usan el origen configurado por `backendFunctionUrl`, conservando los parámetros de imagen y cache bust. Se añadió una prueba explícita de URL pública social (`url` y `cb`) en `backendClient.test.js`. El proxy binario queda servido directamente al elemento de imagen. No hay endpoint de exportación social adicional en el código inspeccionado.

### Validación final Unidad 1.6

- Pruebas dirigidas de proxy, YouTube, backendClient e imageLibrary: **4 archivos, 17 aprobadas**.
- `npm test`: **55 archivos, 318 aprobadas**.
- `npm run test:node:roles`: **5/5 aprobadas**.
- `npm run test:firestore:emulator`, con Temurin Java 21.0.13 configurado solo en el proceso: **40/40 aprobadas**; Firebase CLI 15.17.0, proyecto demo y Firestore en `127.0.0.1:8055`, cargando el candidato local.
- `npm run build`: correcto; Vite compiló **641 módulos**.
- Búsqueda de llamadas confirma que `image-proxy` y `youtube-feed` no se invocan ya con `fetch('/.netlify/functions/...')` desde componentes. Las llamadas `fetch` restantes en HomeMediaPanel/CommunityPanel son a YouTube Data API; `fetch` en EventSharePage descarga el PNG generado por navegador.

Los tests prueban construcción del URL, contrato de cliente, canal y fallback. No se ejecutó una prueba de navegador real para render de `<img>` con CORS ni para descargar/exportar PNG desde los dos editores; el build y las pruebas de URL no sustituyen ese smoke manual. No hubo cambios de producción ni despliegues. La Unidad 1 queda adaptada y validada a nivel de cliente, suite, emulador y build, con esa verificación manual de exportación como limitación documentada.

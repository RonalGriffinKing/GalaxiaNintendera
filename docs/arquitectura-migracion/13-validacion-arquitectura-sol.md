# 13. Validación de arquitectura — Sol

**Alcance:** revisión crítica de los documentos 01–12 y comprobación selectiva del código. Sin cambios funcionales, pruebas ejecutadas ni acceso a producción. F01–F30 conservan sus IDs y destino en la matriz 11; ninguna fila puede cerrarse sin prueba de equivalencia.

## Arquitectura validada y correcciones

La separación es viable con dos entradas Vue/Vite: web pública para visitante y usuario normal (incluidos login, perfiles, favoritos, comunidades, lectura, recompensas y render público de overlays); app administrativa local para Windows/Android; Firebase/Netlify/servicio TikTok como backend; y módulos de modelo, render y estilos compartidos. La UI admin no necesita hosting web. **No mover al cliente privado todo componente de una funcionalidad mixta:** F03, F07–F10, F12–F15, F22 y F26 mantienen superficies públicas y privadas distintas. El diagrama del doc 07 mezcla “Android: Capacitor candidato” con una recomendación Tauri única; debe interpretarse como alternativa, no decisión de dos shells.

El flujo Firestore propuesto funciona: `OverlayEditorPage.vue` guarda en `overlays/{uid}/items/{id}` con `setDoc`; `OverlayViewPage.vue` lee por `onSnapshot`. Guardar desde MagicPad actualizaría el viewer y Windows recuperaría con `getDoc`, siempre que Auth, Rules y conectividad permitan esos accesos. El viewer actual usa URL web construida desde `window.location.origin`, por tanto no hay servidor local hoy. Para evitar pérdida por edición simultánea, la futura app necesita versión/revisión y detección de conflicto antes de sobrescribir documento completo. Tema visual y ajustes sociales viven en `localStorage`; los snapshots de posts y las plantillas remotas parciales no equivalen a sincronización global de la biblioteca.

## Tauri 2 frente a Capacitor

**Recomendación condicionada: Tauri 2 como primer prototipo de shell único.** Reutiliza Vue 3/Vite y ofrece Windows y Android; Windows usa WebView2 y Android el WebView del dispositivo. Capacitor encaja bien en Android, pero sus plataformas oficiales son Android, iOS y Web; requeriría otro shell para Windows. [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), [Tauri WebView versions](https://tauri.app/reference/webview-versions/), [Capacitor platforms](https://capacitorjs.com/docs/getting-started/environment-setup).

La compatibilidad no se demuestra por compilar: validar en MagicPad real Auth Google, email, Firestore, Storage, URLs/functions Netlify, WebSocket, canvas/PNG/ZIP/media, clipboard, selección de archivos, exportación y layout. El código usa `signInWithPopup` para Google (`LoginPage.vue`); popup/redirect en WebView y origins personalizados son el mayor bloqueo probable. Diseñar OAuth con navegador del sistema y retorno profundo si el flujo web falla; no presumir que el plugin nativo existe o que el mismo código de login funciona sin adaptación. Firebase advierte límites de popup y redirect. [Firebase Auth redirect guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices), [Cordova OAuth guidance](https://firebase.google.com/docs/auth/web/cordova). Firebase JS SDK/Netlify functions seguirían siendo servicios HTTPS; probar CORS, tokens y persistencia segura del dispositivo. Para APK hacen falta Rust, herramientas C++/WebView2 en Windows y Android Studio, SDK, NDK, JDK, Gradle y firma; verificar versiones actuales y WebView/Android de Honor MagicPad 4 en el equipo, sin asumir especificaciones. [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

**Puerta de decisión:** si Tauri falla Auth o plugins críticos en MagicPad, usar Capacitor para Android y Tauri para Windows manteniendo una sola app Vue y adaptadores nativos pequeños. Eso son dos shells, no dos interfaces admin.

## OBS: solución mínima y opción local

Primero conservar la Browser Source web `/overlay/:id`, cuyo listener ya actualiza en vivo; sacar solo el editor a la app privada. Esto satisface edición MagicPad/Windows, Firestore común y persistencia al cerrar ventana admin con menor mantenimiento. Revisar permiso de lectura del overlay y necesidad de URL de capacidad revocable: el ID actual `uid_overlayId` no debe tratarse como secreto suficiente. Si el usuario exige URL local, crear en fase separada un renderer HTTP en `127.0.0.1` sobre el PC de OBS, empaquetado como proceso de usuario independiente, con arranque/cierre configurables, caché/versionado y credencial de lectura limitada. `localhost` de la tablet no llega al PC. Una URL local no elimina dependencia de red para Firebase, TikTok ni presencia; sin red solo puede mostrar última configuración cacheada. Mantener URLs web antiguas mientras se prueban todas las familias de widgets, chat y TikTok F14/F15/F26. El sidecar no debe abrir LAN ni heredar secretos permanentes del admin.

## Riesgos que preceden a la migración

1. **Rules reales desconocidas:** las propuestas de `security/firestore` no prueban despliegue. Exportar reglas Firestore/Storage activas y comprobar acceso guest/user/publisher/admin/blocked. Firestore Rules no filtra consultas: las lecturas amplias actuales pueden fallar completas con reglas restrictivas. [Firebase rules and queries](https://firebase.google.com/docs/firestore/security/rules-query).
2. **Datos y privilegios de `users`:** varias pantallas consultan toda la colección; inspeccionar PII y separar perfiles públicos de privados. Verificar que cliente no puede cambiar `role`, `isBlocked`, estrellas, iconos, contadores ni acceso a posts/eventos/páginas.
3. **Operaciones administrativas directas:** UI y router no son autorización. Probar cada escritura Firestore/Storage, borrados, import masivo y membresías contra Rules; Admin SDK de funciones omite Rules y necesita controles propios. [Firebase rules and queries](https://firebase.google.com/docs/firestore/security/rules-query).
4. **Socket.IO:** `server/server.js` permite CORS amplio y `joinTikTok` sin auth visible; una conexión sustituye la conexión global. Restringir origen, usuario/canal y cuotas, medir efectos con clientes existentes.
5. **Vacaciones:** `vacations.js` tiene credencial de respaldo en código y GET sin autenticación. Eliminar fallback/rotar en fase urgente coordinada, después de probar acceso legítimo y rollback. No se reproduce el valor aquí.
6. **Secretos:** revisar historial Git y variables de hosting para claves privadas, sin imprimir valores; config Firebase web es pública por diseño. Mantener OpenXBL/IGDB/service account exclusivamente servidor. Verificar Storage Rules y permisos de uploads.

Contención previa: obtener copia de reglas y configuración, fixtures anonimizados, backup y entorno staging; añadir pruebas positivas/negativas con Emulator Suite para paths, queries reales, batch/transaction y Storage; smoke de web pública/admin contra emuladores; desplegar Rules por cambios pequeños con rollback de versión y vigilancia de `permission-denied`. El emulador no garantiza índices de producción: validarlos aparte en staging. [Firebase Emulator rules tests](https://firebase.google.com/docs/firestore/security/test-rules-emulator), [emulator/index caveat](https://firebase.google.com/docs/emulator-suite/connect_firestore).

## Plan en unidades pequeñas para Luna

Cada unidad mantiene UI/rutas antiguas hasta pasar la matriz 11. “Sol” indica revisión de diseño/seguridad adicional.

| Fase | Objetivo y módulos | Dependencias / riesgo | Prueba y aceptación | Reversión / revisión |
|---|---|---|---|---|
| 0a | Exportar Rules Firestore/Storage activas, índices y mapa de entornos; `security/firestore`, Firebase console | acceso de lectura; riesgo de confundir proyectos | export con fecha/proyecto, diff frente a propuestas | sin cambio; Sol |
| 0b | Contener vacaciones, Socket.IO y secretos: `vacations.js`, `server.js`, configuración | 0a, usuarios reales; riesgo cortar acceso | tests existentes + smoke de clientes, auth/abuso/GET | configuración/release anterior; Sol |
| 1a | Contratos de lectura pública: posts, users públicos, communities, events, sitePages; queries reales | 0a; Rules no filtran | emulator guest/user + UI rutas F01–F09/F12/F27 | reglas previas; Sol para PII |
| 1b | Contratos de escritura usuario: favoritos, hilos, miembros, relaciones, notificaciones, chats | 1a; escrituras cruzadas | matriz por dueño/ajeno/blocked, batch y queries | reglas/endpoint anterior; Sol si requiere servicio |
| 1c | Contratos admin y Storage: posts, eventos, CMS, usuarios, iconos, overlays, uploads | 1a/1b; elevación/borrados | admin/publisher/owner negativos y positivos, Storage | rules previas; Sol |
| 2a | Inventario y export local: temas, social templates, impresora | F23/F17; datos por navegador | backup/restore de muestras sin perder snapshots | guardar export original |
| 2b | Contrato shared Vue/API y feature flags; `src/services`, componentes mixtos | 1c; imports/bundle | parity de render/rutas, artefactos build | revertir paquete |
| 3a | Prototipo Tauri Windows + MagicPad: Auth/Firestore/Netlify/files/canvas | 2b; WebView/OAuth | login, Guardar/abrir, export y APK firmada en dispositivo | desechar prototipo; Sol decide shell |
| 3b | Primer módulo editorial controlado: editor de páginas CMS F07 con preview público | 1c,3a; draft/public | crear/editar/publicar en staging, roles y rollback | UI antigua; Sol revisa permisos |
| 4 | Migrar admin por módulos F04,F06,F08,F11,F13,F14,F23 y F16 solo si se decide incluir | 3b; dependencias y datos | cada fila F probada en ambos dispositivos y web pública | feature flag/UI antigua; Sol en F11/F13/F14 |
| 5a | OBS con viewer web existente: F14/F15/F26 | 1c,4; permisos/link | MagicPad guarda, OBS se actualiza, Windows reabre, cerrar UI | mantener viewer anterior; Sol |
| 5b opcional | Servicio local Windows para OBS | 5a + aprobación de URL local; ciclo de vida | 127.0.0.1, reinicio, cerrar ventana, siete widgets, offline | Browser Source HTTPS; Sol |
| 6 | Regresión F01–F30, retirada gradual de UI admin pública y optimización medida | todas; enlaces legacy | matriz 100% y métricas baseline, links OBS | rollback build y rutas |

**Primer módulo de migración recomendado:** CMS F07, empezando por un tipo de página simple en staging. Tiene lectura pública separable de edición privada y permite validar Auth, Firestore, preview, permisos y publicación sin la complejidad de widgets/OBS, usuarios o recompensas. La unidad 3b no autoriza retirar el editor web ni cambiar producción.

## Preguntas que necesitan aprobación del propietario

1. ¿La URL local OBS es requisito de primera entrega o puede llegar tras validar la URL HTTPS actual con lectura segura?
2. ¿Se acepta que OBS en Windows dependa de Firebase/red para cambios en vivo, con caché local solo de respaldo?
3. ¿Qué preferencias creativas se sincronizan entre dispositivos: temas, plantillas sociales, ajustes de impresora?
4. ¿Vacaciones/impresora F16–F17 pertenecen a esta app administrativa o se segregan como sistema aparte?
5. ¿El viewer OBS debe ser accesible por enlace revocable sin login, o se exige pairing por dispositivo?

Estas decisiones afectan alcance y seguridad. No se toma como aprobado ningún despliegue ni cambio de producción.

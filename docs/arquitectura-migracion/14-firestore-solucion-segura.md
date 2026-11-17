# Firestore: candidato local y bloqueos de compatibilidad

**Estado:** las reglas mostradas por el propietario expiraron a las 00:00 UTC del 15-11-2026. No se ha consultado ni cambiado producción. `security/firestore/firestore.candidate.review.rules` es copia de la propuesta ya existente, **candidato para revisión y emulador, no desplegable aún**. `rules.candidate.emulator.mjs` reutiliza su suite local y apunta al candidato. Copiar la propuesta evita introducir una segunda política nueva sin resolver incompatibilidades conocidas; contiene `deny` final, pero varias operaciones del cliente fallarán.

## Por qué fallaban reglas anteriores

La regla temporal permitía cualquier lectura/escritura hasta su vencimiento. Las reglas por documento no filtran resultados de queries: `getDocs(collection(db,'posts'))` no puede leer una colección que contenga borradores cuando `list` permite solo publicados. Igual ocurre con `users`, `sitePages` y perfiles. El archivo propuesto reconoce estas roturas. Además el cliente actual realiza actualizaciones cruzadas (contadores, membresías, notificaciones, chat) que la propuesta restringe. El bloqueo no se arregla ampliando acceso global; requiere consultas filtradas, proyección pública de perfiles o un endpoint para operaciones concretas.

## Política sencilla por colección

| Ruta | Lectura | Escritura |
|---|---|---|
| `posts` | publicado/visible para visitantes; borrador para autor/editor autorizado | admin; publisher propio según estado |
| `users` | propio/admin; perfil público requiere proyección mínima o consentimiento explícito | crear perfil propio con rol `user`; editar campos personales allowlist; rol/bloqueo/estrellas nunca usuario |
| favorites, readPosts, readingSessions | propietario; progreso desde servicio | favorito propio; lectura/premio solo servidor |
| followers/following, communities membership | relaciones públicas mínimas | usuario participante con invariantes; contadores agregados requieren backend o regla transaccional probada |
| notifications, directChats/messages | destinatario/participantes | read propio, autor del mensaje, admin/servicio para avisos; campos protegidos |
| communities, threads, events, sitePages | públicos según visibilidad y producto; drafts privados | usuario en su hilo; admin/publisher en gestión según permisos reales |
| overlays/{uid}/items | lectura por enlace actual; verificar privacidad | admin propietario; nunca visitante |
| profileIcons, siteConfig, siteSettings | catálogo/config públicos necesarios | operaciones privilegiadas mediante servidor o admin según análisis; usuario jamás modifica progreso |
| liveGoals, liveChats, videoChats, mailQueue, ruzafaPrinterProducts/History | preservar rutas según propuesta, validar usos reales | cada operación y rol por reglas específicas, sin catch-all abierto |

**Roles:** `router/index.js` y UI leen `users/{uid}.role`; `LoginPage.vue` crea rol `user`, mientras `UserPanel.vue` y atajos de navbar pueden asignar roles. Es seguro usar el rol del documento solo si Rules impiden que el usuario cambie `role`, `isBlocked`, `canChat` y campos privilegiados. La propuesta usa `get(users/{request.auth.uid})` para `admin()/publisher()` y protege cambios del usuario, pero permite escritura admin directa; probar elevación, cuentas bloqueadas y creación vía UI, y considerar servicio admin para auditoría. La UI y el router no son frontera de seguridad.

## Consultas que necesitan adaptación pequeña o decisión de datos

- `Home2Page.vue:140`, `PostPage.vue:170,245`, `SearchResultsPage.vue:81`, `PublicNavbar.vue:336`, `CommunityPanel.vue:718`: lectura completa de `posts`; filtrar por `status`, `visibility` y release. El filtro temporal `releaseAt <= now` y fallback `scheduledAt` requieren normalizar datos o definir query compatible, además de índices. `CategoryPage.vue:208`, `ProfilePage.vue:82,459`, `imageLibrary.js:30` deben comprobarse por sus constraints reales.
- `PublicNavbar.vue:338`, `ProfilePage.vue:460`, `DirectChatBubble.vue:97`, `GalaxiaHub.vue:486`, `services/notifications.js:72`: consultas completas de `users`; no se resuelven con un filtro trivial si el documento contiene PII. Elegir una proyección pública mínima o un endpoint que solo devuelva campos autorizados; cambiar sus lectores.
- `sitePages.js:437,514`, `DynamicHomeSection.vue:17`: añadir `status == published` y visibilidad pública a slug/footer/home, manteniendo query admin separada. `sitePages.js:432` queda admin/editor con rol verificado.
- `ProfilePage.vue:83` consulta hilos por autor; si threads dejan de ser enteramente públicos debe filtrar visibilidad. `useEventFeed.js` y `Home2Page.vue` usan colecciones completas de eventos/comunidades/hilos; si se introducen privados/drafts, filtrar en query o conservar lectura pública deliberada.
- `PublicNavbar.vue:471-480`, `ProfilePage.vue:773-805`: follow y contadores cruzados; la propuesta bloquea actualización de `users` ajenos. `CommunityPanel.vue:1058-1086` cambia membresía y `membersCount`; necesita transacción/reglas completas o pequeña función servidor. `notifications.js` crea notificaciones para terceros; propuesta solo admin.
- `GalaxiaHub.vue` y `DirectChatBubble.vue` escriben resúmenes/estado en `directChats`; la propuesta limita campos, así que validar create/send/ack/hide contra emulador y ajustar campos o backend sin abrir participantes.
- `ProfilePage.vue:166,196` actualiza socialLinks propios; propuesta lo permite. `PostEditor.vue`, `PostPanel.vue`, `EventsManager.vue`, `SitePagesPanel.vue`, `UserPanel.vue` necesitan pruebas de roles con las estructuras de escritura reales; no basta que el router abra la pantalla.

## Storage y backend

No se encontró uso directo de `uploadBytes` en `src`; `firebase.js` inicializa Storage. Subida de iconos usa `netlify/functions/profile-progress.js` y `lib/icon-image.js` con Admin SDK. `icon-storage.fragment.rules` niega escritura cliente en `profile-icons/{fileName}` pero es un **fragmento**, no reglas activas; un allow amplio en otro match puede seguir permitiendo escritura. Exportar Storage Rules reales, comprobar paths y permisos de otros objetos antes de proponer política completa.

El Admin SDK omite Firestore Rules: `profile-progress` verifica token y rol para acciones de catálogo; revisar límites/validaciones. `seo-files` consulta Firestore server-side para sitemap. `vacations` usa Netlify Blobs, fuera de Firestore. Otras funciones de proxy/external API protegen secretos pero requieren auth/cuotas propias si se usan administrativamente.

## Pruebas mínimas y secuencia

1. Revisar candidato con diff frente a Rules activas exportadas; no asumir que propuesta representa producción. Mantener copia de rollback. No desplegar candidato ahora.
2. Ejecutar `rules.candidate.emulator.mjs` solo con emulador local `127.0.0.1:8055` y proyecto demo; probar guest (`posts` publicados, overlay viewer, bloqueo de writes), user (perfil/favorito/hilo/chat propio, bloqueo de role/stars, ajeno), publisher (post propio/draft), admin (CRUD, bloqueado). La suite copiada cubre parte; añadir casos para queries reales y Storage antes de despliegue.
3. Arreglar primero consultas públicas de posts/páginas y estrategia de perfil público en pequeños cambios funcionales posteriores, cada uno con prueba UI contra emulador. No modificar esos archivos en esta fase.
4. Resolver escrituras cruzadas de seguimiento/membresía/notificaciones/chat con reglas transaccionales comprobables o funciones servidor mínimas.
5. Probar Storage y backend, luego staging con datos representativos e índices. El emulador no valida todos los índices de producción.
6. Publicar por dominios solo tras la adaptación y smoke completo; monitorizar `permission-denied`, tener Rules previas listas para rollback inmediato. No extender el acceso temporal abierto.

**Primer cambio pequeño recomendado:** preparar una query pública de posts que excluya borradores y privados y probarla en Home contra el candidato y datos mixtos. Antes de aplicarla, decidir cómo representar `releaseAt/scheduledAt` de forma uniforme para que la query demuestre lo mismo que la regla. El siguiente bloqueo es el perfil público de `users`.

## Confirmaciones pendientes

No se ha confirmado el estado actual de Rules de producción, Storage Rules, índices, formatos de documentos reales, configuración de proveedores ni si existen datos privados en `users` ya expuestos. Esos datos son necesarios antes de declarar seguro un despliegue.

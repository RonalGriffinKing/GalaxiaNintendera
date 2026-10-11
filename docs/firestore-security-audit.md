# Auditoría de Firestore — GALAXIA NINTENDERA

Fecha: 11 de octubre de 2026. Etapa: análisis y preparación, sin despliegue.

## Resultado y límites

No publicar todavía `security/firestore/firestore.proposed.rules`. Es una propuesta
restrictiva que identifica expresamente las incompatibilidades del código actual,
no una sustitución inmediata compatible con todos los flujos. No se han modificado
componentes de aplicación, datos, autenticación, reglas publicadas ni escrituras
de nuevos módulos. Los cambios anteriores del árbol de trabajo se conservan.

Se revisaron importaciones y llamadas Firestore en `src`, `netlify`, `scripts` y
`server`, incluidas referencias mediante variables y la lectura REST del sitemap.
Se identificaron 17 colecciones raíz y 12 patrones de subcolección utilizados en
el código. Esto no enumera documentos reales ni garantiza que no existan otras
colecciones creadas por versiones antiguas o servicios externos. No se consultó
la base de producción. El inventario de permisos está en el Canvas de la auditoría.

Las reglas abiertas publicadas fueron confirmadas por el usuario y su captura:
lectura/escritura general hasta 26/05/2027. No hay copia de reglas efectivas en el
repositorio ni configuración Firebase de despliegue. El archivo propuesto se
mantiene fuera de cualquier `firebase.json` de producción.

## 1. Inventario de colecciones y permisos propuestos

- `users/{uid}`: perfil privado, correo, proveedor, consentimientos, rol, bloqueo,
  permiso de chat, estrellas, lecturas, iconos y contadores. Lectura propia o admin;
  listado admin. Registro propio con rol user y progreso inicial fijo. El propietario
  solo edita campos de presentación/consentimiento/presencia explícitos. Roles,
  permisos, bloqueo, saldo y desbloqueos requieren autoridad administrativa.
  Fuentes: `src/pages/LoginPage.vue:165`, `src/components/shared/UserPanel.vue:549`,
  `src/services/profileProgress.js:178`, `src/pages/ProfilePage.vue:847`.
- `users/{uid}/notifications/{id}`: lectura propia/admin; destinatario marca `read`
  y elimina; creación admin en la propuesta. Las notificaciones sociales desde
  otro usuario necesitan validación del evento o rediseño.
  Fuente: `src/services/notifications.js:14` y `:88`.
- `users/{uid}/readPosts/{postId}`: historial con premio, privado propio/admin;
  escritura reservada en esta propuesta, pendiente del nuevo protocolo de premios.
  Fuente: `src/services/profileProgress.js:195`.
- `users/{uid}/favorites/{postId}`: lectura propia/admin; propietario añade/elimina
  referencias a posts públicos. Los favoritos públicos del perfil necesitan una
  proyección deliberada. Fuente: `src/pages/PostPage.vue:538`.
- `users/{uid}/socialTemplates/{id}`: plantillas sociales del editor; acceso del
  propietario con rol admin/publisher. Fuente: `src/pages/PostSharePage.vue:393`.
- `users/{uid}/communities/{id}`: copia de membresía, no un rol administrativo;
  acceso propio/admin y membresía propia ordinaria con rol literal `Miembro`.
  Fuente: `src/components/community/CommunityPanel.vue:1166`.
- `users/{uid}/followers/{actor}` y `following/{target}`: relaciones destinadas
  a perfiles públicos. Cada actor modifica su relación, no el contador del otro
  usuario. Solo campos públicos conocidos; revisar documentos antiguos antes de
  permitir lectura pública. Fuente: `src/pages/ProfilePage.vue:950`.
- `posts/{id}`: lectura pública de aprobados públicos, excluyendo futuros; obtener
  un post unlisted por ID es compatible con PostPage, pero no listarlo. Admin
  gestiona/aprueba; publisher crea y edita sus propios draft/pending, no aumenta
  premios de un aprobado. Fuente: `src/components/posts/PostEditor.vue:1564`,
  `src/components/shared/PostPanel.vue:611`, `src/pages/PostPage.vue:144`.
- `sitePages/{id}`: publicado/público para visitantes; edición admin/publisher,
  como el gestor existente. Fuente: `src/services/sitePages.js:432` y
  `src/components/sitePages/SitePagesPanel.vue:31`.
- `siteSettings/postCategories`: lectura pública, escritura admin. No otros IDs
  autorizados. Fuente: `src/services/postCategories.js:14`.
- `siteConfig/profileAchievements`: lectura pública, escritura admin.
  Fuente: `src/pages/ProfilePage.vue:344`.
- `profileIcons/{id}`: catálogo público (incluidos los metadatos de ocultos que
  actualmente se descargan); edición admin. Ocultar una ficha en la UI no hace
  privada su imagen pública. Fuente: `src/services/profileProgress.js:96`.
- `communities/{id}`: público; administración admin. Contador de miembros no
  editable libremente. `members/{uid}`: nombres e imágenes públicos; solo membresía
  propia ordinaria, admin gestiona; comunidad oficial protegida.
  Fuente: `src/components/community/CommunityPanel.vue:1075`, `:1176`.
- `communityThreads/{id}`: hilos públicos, autoría real por UID, miembros pueden
  crear en su comunidad; oficial solo admin/publisher. Admin modera; autor elimina
  su hilo; publisher destaca/fija. Likes validan delta propio y cantidad. Añadir
  una respuesta valida autor y conserva respuestas previas. Editar/eliminar
  respuestas embebidas como arrays requiere normalización (pendiente).
  Fuentes: `src/components/community/ThreadComposer.vue:300`,
  `src/components/community/CommunityPanel.vue:1929` y `:1975`.
- `galaxyEvents/{id}`: público, administración admin/publisher por el gestor
  oficial; cada usuario cambia únicamente su UID en `notifyBy`.
  Fuente: `src/pages/EventsPage.vue:94`, `src/components/modals/EventEditorModal.vue:92`.
- `liveGoals/{id}`: público, definición/objetivos admin/publisher; incrementos de
  likes solo en el contador propio y de uno en uno. El diseño actual permite
  repetir clicks: esto no prueba interacción real y no debe conceder premios.
  Fuente: `src/components/community/CommunityPanel.vue:1898`.
- `liveChats/{id}`: estado público, administración admin/publisher; `messages/{id}`
  público, envío con permiso chat y sesión activa, identidad propia. El resumen
  escrito por cualquier emisor queda bloqueado hasta validarlo con su mensaje.
  Fuente: `src/components/widgets/chat/DirectChatBubble.vue:296` y `:303`.
- `videoChats/{video}/messages/{id}`: mensajes públicos, autenticado no bloqueado
  publica con UID propio; autor/admin elimina; likes delta propio. Replies
  embebidas quedan pendientes. No operaciones encontradas en el padre videoChats.
  Fuentes: `src/components/shared/GalaxiaHub.vue:780`,
  `src/components/community/CommunityPanel.vue:1512`.
- `directChats/{id}` y `messages/{id}`: solo participantes autorizados para chat;
  ni visitantes ni admin ajeno reciben lectura global. Participantes inmutables,
  marcas de visto/oculto/fijado solo en la clave propia. Resúmenes y reapertura de
  `deletedFor` ajeno requieren flujo atómico verificado. El Hub actualmente envía
  el mensaje antes de crear el padre: hay que invertir ese orden.
  Fuentes: `src/components/shared/GalaxiaHub.vue:454` y `:461`,
  `src/components/widgets/chat/DirectChatBubble.vue:313`.
- `overlays/{uid}/items/{id}`: obtener documento exacto público para OBS sin login;
  listado/edición solo admin propietario, conforme a `/editor` y `/admin/overlays`.
  Esto publica la escena completa: revisar contenido real antes de confirmar que
  no contiene secretos. No se encontró credencial Twitch en los campos de widget
  del código; no se inspeccionaron escenas reales. Si una escena debe ser privada,
  necesitará otra presentación sin secretos o un acceso controlado, no un permiso
  supuesto por conocer la URL. Fuentes: `src/pages/OverlayViewPage.vue:38`,
  `src/pages/OverlayEditorPage.vue:248`, `src/router/index.js:134`.
- `mailQueue/{id}`: correo de destinatarios, solo admin. No se identificó un
  consumidor Firestore de esta cola en el código revisado; confirmar extensiones
  o servicios externos. Fuente: `src/services/notifications.js:105`.
- `ruzafaPrinterProducts/{id}`: catálogo público; gestión admin. La ruta impresora
  pública actual puede editarlo sin autenticación: incompatibilidad explícita.
- `ruzafaPrinterHistory/{id}`: etiquetas e historial privado, solo admin en la
  propuesta. La impresión visitante escribe actualmente y debe pasar a historial
  local o sesión de operador autorizada. No conceder escritura mundial para
  mantener el historial. Fuente: `src/services/ruzafaProducts.js:5` y `:6`,
  `src/pages/RuzafaPrinterPage.vue:493` y `:650`.
- `publicProfiles/{uid}` es una nueva proyección PROPUESTA, no creada/migrada:
  presentación pública sin correo, moderación ni campos financieros privados.
  La publicación/sincronización requiere diseño y validación antes de implementarse.

## 2. Riesgos encontrados

### Críticos

1. Cualquier cliente puede modificar o borrar cualquier documento con las reglas
   confirmadas. Incluye correo, chats privados, saldo, roles y escenas. No se ha
   comprobado si ha ocurrido abuso; ausencia de evidencias aquí no demuestra
   integridad de los datos históricos.
2. El rol está en `users/{uid}.role`, no en custom claims Auth. Router, Dashboard,
   UserPanel y componentes lo leen. Cambiarlo concede privilegios de frontend.
   Las reglas deben validar el rol protegido en cada operación privilegiada.
3. `UserPanel.vue:397` intenta crear el primer admin desde el navegador si no hay
   perfiles. Ese bootstrap debe retirarse en una fase de código; nunca autorizarlo
   con una regla «primero que llega». Verificar manualmente los UID admin existentes
   contra Firebase Authentication y la identidad del titular, fuera de los roles
   potencialmente manipulables actuales, antes del primer despliegue seguro.

### Altos

4. `users` se lista y obtiene públicamente desde Navbar, Home, Category, Profile,
   Community y chats. Ocultar email en HTML no evita descargarlo. Firestore entrega
   documentos completos: no puede devolver solo campos públicos mediante reglas.
   Separar documentos públicos/privados y cambiar lectores es requisito.
5. `awardPostRead` utiliza valores `post` recibidos por el navegador, no vuelve a
   leer el post autorizado dentro de la transacción. La transacción asegura
   atomicidad, no la legitimidad del premio. Un cliente puede saltar el temporizador,
   falsificar premio/postId y registrar lecturas arbitrarias.
6. `redeemIcon` reduce saldo y amplía `unlockedIcons` desde cliente; el precio puede
   proceder de un catálogo local si no existe documento. No hay ledger autorizado
   ni validación equivalente en servidor. `ensureUserProgress` también reescribe
   estado protegido; limitarlo a inicialización segura y evitar reseteos/concurrencia.
7. Consultas descargan posts/pages sin filtrar y después ocultan draft/private.
   `PostPage` no verifica `status` antes de mostrar una ficha por ID; el sitemap
   REST lista todos los posts y filtra en Netlify. Las reglas restrictivas denegarán
   esas consultas completas. Reescribir consultas; no hacerlas públicas por comodidad.

### Compatibilidad y abuso

8. Seguimientos/membresías usan Promise.all e incrementos en documentos ajenos.
   Un cliente puede falsificar contadores o dejar pares desincronizados. Algunas
   denegaciones se silencian con catch. La UI puede mostrar éxito parcial.
9. Comentarios/replies se guardan dentro de arrays de otro documento; edición y
   borrado reemplazan listas completas. Normalizar por autor/ID, con reglas propias;
   no autorizar `comments` enteros a cualquier autenticado.
10. Notificaciones sociales escriben documentos de terceros; los textos/actorId
    proceden del cliente. Reservarlas o validar evento/autor/receptor y un ID
    determinista para impedir falsificación y spam duplicado.
11. Mensajes privados no comprueban participantes inmutables en reglas actuales;
    el Hub cambia `deletedFor` de ambos usuarios y resúmenes. Hace falta verificación
    de mensaje real y mapas propios; no otorgar edición completa a participantes.
12. Impresora Ruzafa realiza escrituras públicas y masivas de productos/historial.
    El rol real del operador no está definido en el código; no inventarlo. La
    propuesta exige admin y debe revisarse si se necesita un rol de operador distinto.
13. `emailVerified`, `adminCreated`, `canChat`, `isBlocked` son campos del documento:
    no equivalen a claims Auth. La verificación de correo, cuando se exija, debe
    basarse en `request.auth.token.email_verified`; refrescar el token tras verificar.
    Auth (creación, suspensión, borrado de cuentas) no se protege con reglas Firestore.
14. El gestor elimina solo el documento users, no la cuenta Auth ni subcolecciones.
    No prometer que borra/desactiva completamente una identidad. Diseñar lifecycle
    y mantener recuperación del último administrador.

## 3. Roles y protección propuesta

Reutilizar inicialmente el rol Firestore real: registro propio solo `user`,
creación inicial con saldo cero y un único icono inicial; updates propios mediante
lista explícita de campos. Solo admin puede cambiar role/bloqueo/chat. Helpers
rechazan roles privilegiados bloqueados. Ninguna aprobación de rol se deduce de
email escrito por el cliente. No introducir cuentas de servicio ni secretos.

Los permisos del publisher observados son editor de posts propios, páginas y
contenido oficial de comunidad/eventos/metas. La aprobación de posts y la gestión
de usuarios/logros/iconos/overlays quedan admin. Revisar estos límites con el dueño
antes de desplegar; no ampliar permisos porque la ruta sea accesible.

Custom claims podrían desacoplar roles de perfiles en el futuro, pero requieren
un proceso privilegiado de asignación; no se implementan ni se necesitan para
proteger el modelo inicial. App Check puede reducir ciertos abusos, pero no
sustituye las reglas ni la validación del saldo.

## 4. Cambios de código necesarios ANTES de publicar reglas

1. Retirar bootstrap admin del cliente y verificar administradores existentes.
2. Crear una proyección pública validada y adaptar lecturas de perfiles/directorio;
   decidir explícitamente visibilidad de favoritos, historial y membresías. No
   copiar email o bloqueos a publicProfiles. Validar y limpiar campos antiguos de
   relaciones públicas antes de conceder lecturas; no ejecutar esa migración ahora.
3. Normalizar status/visibility/releaseAt de posts antiguos y filtrar consultas
   públicas antes de descargar: aprobados, públicos y ya publicados. Mantener
   unlisted solo por get cuando esa sea la política aprobada. Las previsualizaciones
   de anuncios futuros requieren un documento teaser sin contenido privado.
   Separar queries admin de las de autor. Revisar índices compuestos requeridos.
4. Cambiar getSitePageBySlug, Footer y DynamicHomeSection para filtrar publicación;
   el sitemap debe consultar solo posts autorizados (consulta REST estructurada
   equivalente), no listDocuments indiscriminado.
5. Diseñar premio/canje con ID determinista, importes desde catálogos protegidos y
   operación atómica/idempotente. Alternativa sin nuevo servidor: ledger inmutable
   validado con get/getAfter y saldo derivado de una operación concreta. Materializar
   antes precios locales protegidos. Las reglas no prueban que una persona leyó
   una noticia: definir límites y política de elegibilidad verificable. Otra opción
   es una autoridad backend para premios, a valorar por separado, sin imponer
   hosting/plan de pago ni implementarla en esta auditoría.
6. Hacer relaciones y contadores atómicos con verificación de transición real o
   dejar contadores derivados. `getAfter` exige batch/transacción; no sirve para
   los Promise.all actuales. Evitar doble incremento/repetición y reparar fallos
   parciales mediante una migración revisada, nunca automática.
7. Normalizar respuestas a subcolecciones con authorId inmutable. Los likes
   actuales sí admiten validación de delta propio; no conceder suplantación.
8. Cambiar notificaciones a eventos verificados con IDs deterministas o proceso
   autorizado. Mantener lectura y marcado propios. Confirmar consumidor de mailQueue.
9. Crear/verificar el padre de chat antes del mensaje. Validar resúmenes contra
   mensaje persistido y campos de actor, participantes inmutables y mapas propios.
   Añadir manejo de errores a listeners y evitar éxito cuando una operación falla.
10. En live chat validar previews contra mensaje real; respetar active/canChat.
11. Impresora: definir acceso de operador, proteger administración de productos y
    decidir historial local o autenticado; no dejar escritura visitante abierta.
12. Guardar selectedIcon solo si está desbloqueado y resolver URL/efectos desde el
    catálogo autorizado, no campos arbitrarios del cliente.
13. Auditar escenas reales sin publicar credenciales; separar datos privados si
    existen. El get público de OBS es intencionado, no una garantía de privacidad.

## 5. Pruebas y resultados reales

Preparadas 22 pruebas de emulador en `security/firestore/rules.emulator.mjs`, con
fixtures sintéticos de visitante, propietario, ajeno, publisher, admin y admin
bloqueado. Cubren registro, rol, saldo, privacidad, publicación, filtros, páginas,
configuraciones, OBS, chats, notificaciones, membresías, likes/comentarios, eventos,
metas, live/video chat, impresora y denegación de namespaces desconocidos.

Protección del ejecutor: exige FIRESTORE_EMULATOR_HOST=127.0.0.1:8055 y proyecto
literal `demo-galaxia-security`. La carga/limpieza de fixtures ocurre únicamente en
ese emulador mediante la API de test; no importa src/firebase.js ni credenciales.
Las dependencias de pruebas se declaran en una carpeta separada; no se instalaron
ni añadieron dependencias a la web.

Hay Firebase CLI 15.17.0. No se encontró Java en PATH ni un JAR Firestore en la
caché comprobada. El intento de arrancar el emulador demo falló con `spawn java
ENOENT`: no se puede ejecutar `java -version`. La suite de seguridad no se ejecutó.
Hasta que arranque y pase esta suite,
NO se considera compilada ni verificada la semántica de las reglas. Una revisión
estática y las pruebas Vue existentes NO sustituyen pruebas de seguridad.

Comprobaciones ejecutadas: `node --check` del ejecutor correcto; JSON de configuración
y manifiesto válidos; revisión estática de denegación por defecto sin write global
ni fecha de bypass. `npm run build` correcto y las 49 pruebas existentes pasan en
ocho archivos en el momento de la auditoría. No son las 22 pruebas de reglas, que siguen pendientes. Las pruebas exclusivas del módulo cancelado se retiraron posteriormente.

Además de la suite, pendientes pruebas de compatibilidad desde la app conectada
EXCLUSIVAMENTE al emulador en una rama separada: registro Google/email, refresh de
claims, perfiles, directorio, sitemap, noticias programadas/unlisted, aprobación,
favoritos, lectura/canje idempotentes y concurrencia, membresía/seguimiento,
comentarios editados/borrados, live chat, mensajes/GIF/visto/oculto, impresora y
OBS sin sesión con actualizaciones en tiempo real. Revisar acceso de todas las
categorías con datos antiguos anonimizados y tipos faltantes.

## 6. Qué puede hacer el propietario, paso a paso

1. Guardar una copia privada de las reglas publicadas y sus fechas en Firebase
   Console. No publicar el borrador de esta auditoría todavía.
2. Verificar en Authentication los UID de administradores legítimos y cotejarlos
   manualmente con users. No confiar solo en el campo role actual. Revisar cambios
   inesperados; esta auditoría no demuestra compromiso ni lo descarta.
3. Confirmar quién usa Ruzafa, qué se desea mostrar públicamente en perfiles y si
   OBS contiene datos privados. Confirmar servicios externos/extensiones y otras
   colecciones que no estén en el código. No enviar contraseñas ni cuentas de servicio.
4. Preparar emulación: instalar un Java compatible con la versión de Firebase CLI
   (la guía consultada indica JDK 11 o superior; elegir una versión compatible
   con la CLI instalada), y después, en una terminal:

   ```powershell
   Set-Location C:\Users\admin\Desktop\GalaxiaNintendera-main\security\firestore
   npm install
   firebase emulators:exec --only firestore --project demo-galaxia-security --config emulator.json "npm test"
   ```

   Este comando descarga herramientas de prueba locales si faltan; no despliega
   reglas ni conecta la app a producción. No ejecutar firebase deploy en esta etapa.
5. Revisar juntos las incompatibilidades y autorizar la siguiente fase de cambios
   de código. Ejecutar pruebas de permisos y regresión con datos sintéticos.
6. Aprobar un conjunto de reglas compatible y verificado, junto con una copia de
   datos válida para recuperar errores. Verificar opciones de exportación/backup
   disponibles para Spark antes de elegir un método; no asumir backups/PITR de pago.

## 7. Despliegue seguro y recuperación (solo plan)

Antes: código compatible, reglas compiladas y suite en verde, roles revisados,
inventario real de colecciones confirmado, datos/índices y backup verificados,
ventana breve coordinada, segundo admin legítimo disponible y versión de retorno
RESTRICTIVA probada. Ninguna fase implica publicar automáticamente estas reglas.

Publicación manual futura: revisar diff completo en Firebase Console, sustituir
la regla abierta (no dejarla junto a las específicas), probar escenarios en la
zona de reglas con identidades sintéticas, y solo tras aprobación explícita
publicar. La zona de pruebas complementa pero no reemplaza el emulador.

Comprobar inmediatamente visitantes, cuenta normal, publisher, admin, OBS e
impresora; observar permission-denied y fallos parciales, consumo de lecturas y
consultas/índices. Probar rechazo de roles/saldo sin usar documentos de usuarios
reales. No activar nuevos módulos hasta validar el entorno.

Recuperación: si aparece una incompatibilidad, volver a la última configuración
RESTRICTIVA validada o aplicar una corrección mínima revisada para esa colección;
evitar volver a permitir write global. Conservar copia de las reglas antiguas
para análisis, no como rollback recomendado. Rollback de reglas no restaura datos
ni devuelve funciones rotas del frontend: coordinar versión de código, índices y
restauración selectiva desde una copia verificada si llegara a hacer falta.

## Fuentes técnicas oficiales

- [Acceso a campos: lecturas son de documentos completos](https://firebase.google.com/docs/firestore/security/rules-fields).
- [Consultas: las reglas no filtran resultados](https://firebase.google.com/docs/firestore/security/rules-query).
- [Coincidencia de reglas: basta una autorización](https://firebase.google.com/docs/firestore/security/rules-structure).
- [Pruebas de reglas con emulador](https://firebase.google.com/docs/firestore/security/test-rules-emulator).
- [Instalación del emulador y requisitos](https://firebase.google.com/docs/emulator-suite/install_and_configure).

## Archivos entregados

`docs/firestore-security-audit.md`: este informe y plan.
`security/firestore/firestore.proposed.rules`: propuesta por colección, sin despliegue.
`security/firestore/rules.emulator.mjs`: suite local preparada.
`security/firestore/emulator.json`: configuración aislada local/demo.
`security/firestore/package.json`: dependencias opcionales de test, separadas de la web.
El Canvas presenta el inventario, prioridades y decisiones de compatibilidad.

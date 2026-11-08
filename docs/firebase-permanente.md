# Firebase permanente: preparación local

La referencia vigente es `security/firestore/firestore.permanent.rules`, probada
como conjunto completo. Las propuestas anteriores y los fragmentos están
superados; no mezclarlos ni conservar el antiguo `allow` general.

## Identidad y fecha confirmadas

- El propietario confirmó `vOWD2r82tSgrSqHL8PUfCkPcrhG2` como su UID de Firebase
  Authentication y único administrador/publisher. Se conserva en
  `security/authorized-identities.json`. Administrador implica permisos editoriales;
  no se autorizó ninguna cuenta publisher adicional. No se consultó Auth real.
- Reglas y funciones verifican ese UID, no `users.role`, correo o contraseña.
  El antiguo bootstrap «primer usuario = admin» se ha retirado. Los cambios de rol
  en documentos antiguos no conceden autoridad.
- La regla copiada por el propietario desde Console vence el **15/11/2026 a las
  00:00 UTC (01:00 en Madrid)**. Copia archivada en
  `security/backups/firestore.confirmed-2026-11-08.txt`; no es un rollback seguro.
- La candidata permanente no tiene fecha global de vencimiento y deniega por
  defecto las colecciones desconocidas.

## Compatibilidad comprobada y ajustes necesarios

- `users`: lectura propia/admin y cambios propios limitados por campos. Puntos,
  derechos, historial y selección de iconos se escriben solo por el servicio.
- `posts`, `sitePages`, `galaxyEvents`: la función **de solo lectura**
  `public-content` filtra borradores, contenido privado y publicaciones futuras.
  Mantiene documentos antiguos sin requerir una migración de campos nuevos.
  Los listados públicos de noticias/eventos/perfiles ya usan ese mecanismo.
- Esa función entrega únicamente campos públicos de `users`, sin correos, saldo
  anterior, secretos, permisos privados o roles declarados. En eventos devuelve
  solo el recordatorio del UID verificado. No crea `publicProfiles` ni otra colección.
  Firestore no permite autorizar solo ciertos campos de un documento leído.
- Lecturas públicas paginadas y limitadas por tamaño, caché de 15 segundos.
  Nombres/presencia/eventos públicos se actualizan cada 30 segundos; los mensajes
  mantienen sus listeners Firestore. No es una nueva plataforma de contenido.
- `communityThreads`, `communities`/`members`, `videoChats`/`messages`: publicación,
  edición propia, comentarios y respuestas; no se permite suplantar autor ni fijar
  hilos sin permiso. Altas/bajas y contador de miembros usan transacción conjunta.
- Seguidores/following y notificaciones: actor real y evento verificable. Los
  contadores de perfil se calculan desde relaciones; no se escribe el perfil ajeno.
- `directChats`/`messages`, `liveChats`/`messages`, `liveGoals`: participantes y
  permisos reales; mensaje y resumen se guardan en un único lote verificable.
  Se probaron primera conversación, respuesta, recibos y previsualizaciones falsas.
- `overlays/{uid}/items`: OBS conserva la lectura anónima de una escena exacta.
  Listado y edición requieren el administrador propietario; sin listado público.
- `profileIcons`, `siteConfig/profileAchievements`: catálogo/logros públicos,
  administración por función y UID confirmado. Eventos/editoriales permanecen en
  el Gestor Global; la página pública de eventos no carga editores.
- `siteSettings`, `mailQueue`, `ruzafaPrinterProducts`, `ruzafaPrinterHistory`,
  favoritos, plantillas sociales, membresías, lecturas y notificaciones personales
  tienen permisos específicos. La impresora sigue imprimiendo localmente si el
  historial no se guarda; edición de productos e historial requieren admin.
- SEO y vínculo público Xbox usan Admin SDK con filtrado en servidor; dejan de
  depender de REST anónimo sobre documentos privados. El calendario de vacaciones
  en Netlify Blobs y el relay Socket.IO no usan Firestore y no se modifican aquí.

## Storage: preparación condicional

El código usa Storage para las nuevas imágenes administrativas de iconos. No se
ha comprobado si el bucket real está habilitado ni se ha creado ninguno.
`security/storage.permanent.rules` permite leer `profile-icons/` y deniega todas
las escrituras cliente, incluso del admin: la subida verificada usa Admin SDK.
Otros paths quedan privados. Se probaron archivos exclusivamente de emulador.
Antes de publicar estas reglas, confirmar los paths históricos reales; no aplicar
una candidata de Storage a ciegas ni borrar imágenes existentes.

## Pruebas reproducibles: siempre demo y local

Configuración local: `security/firebase.emulators.json`. Arrancar con proyecto
`demo-galaxia-permanent`, nunca el proyecto real. No es un archivo de despliegue.
Los tests se niegan a ejecutarse contra hosts ajenos a los emuladores previstos.
Resultado local: **286 pruebas de código con Node 22**, **17 pruebas de Firestore/servicios**
y **3 de Storage** aprobadas; compilación real con Node **22.23.4**, cuatro
funciones empaquetadas y separación del bundle público comprobadas. Esto valida
código/fixtures locales, no datos ni configuración desconocidos de producción.

Comprobación final: el cliente real recorre 451 perfiles paginados a través de la
función real de lectura; conserva nombres/avatares y excluye correo, contraseña y
permisos privados. Se prueban las consultas del frontend de seguidores/seguidos,
contadores, membresías y autores, y listeners de comentarios y OBS con las reglas
exactas. La subida real mediante Admin SDK y el servicio de iconos se prueba solo
contra Storage local, incluyendo rechazo de un falso administrador y una imagen
inválida. Se ha retirado el fallback al correo en autores/miembros/seguidores.

Bloqueo de datos históricos: las reglas leen documentos completos. Los documentos
públicos antiguos de miembros, relaciones, hilos y comentarios podrían contener
campos privados o correos incrustados durante la etapa de reglas abiertas. Sin
acceso autorizado a esos datos no se puede certificar su ausencia ni prometer
compatibilidad total con todas sus variantes. Antes de publicar, autorizar una
comprobación de solo lectura de esos campos y de las rutas reales de imágenes.
Si aparecen datos privados, presentar la corrección mínima para aprobación
independiente; no borrarlos ni migrarlos automáticamente. La proyección pública
de `users` ya excluye campos privados incluso en documentos antiguos.

```powershell
firebase emulators:start --project demo-galaxia-permanent --config security/firebase.emulators.json --only firestore,storage
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8055'
$env:FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9199'
node --test --test-timeout=45000 security/firestore/permanent.emulator.mjs
node --test --test-timeout=30000 security/firestore/storage.emulator.mjs
npx vitest run --exclude '**/.restore-backups/**'
npm run build -- --manifest
node scripts/verify-profile-bundle.mjs
```

## Publicación: acciones que siguen requiriendo autorización

1. Guardar las reglas efectivas de Console y una copia de los datos necesarios;
   revisar la copia, sin migrar ni corregir automáticamente datos históricos.
   La nueva autorización por UID no necesita modificar los antiguos roles.
2. Confirmar el proyecto/UID y la situación de Storage. Configurar en Netlify,
   alcance Functions, el proyecto, bucket existente si procede y credencial Admin
   privada. Nunca `VITE_*`. Mantener `PROGRESS_ENABLED=false`; no poner variables
   de emuladores en producción. Node 22 y empaquetado están preparados localmente.
3. Probar en un entorno aislado el mismo paquete: cliente y funciones de lectura,
   sitemap, Xbox, reglas completas y rutas públicas. Verificar tamaño/configuración
   de las variables de Lambda y permisos mínimos de la cuenta de servicio.
4. Autorizar una ventana breve. Publicar primero el cliente compatible y sus
   funciones (o un paquete previo de compatibilidad); sustituir inmediatamente
   la regla abierta por la candidata completa. Las pestañas anteriores deben
   recargarse: algunas de sus lecturas/escrituras directas serán rechazadas.
   No cambiar reglas antes de disponer de esas funciones/cliente compatibles.
5. Comprobar noticias, perfiles, comunidades, primer mensaje y respuesta, eventos,
   recordatorios, SEO, logros y una escena OBS con cuentas previstas. Activar
   `profile-progress` solo con autorización independiente. La migración histórica
   sigue siendo independiente y no se ejecuta durante build o inicio de sesión.
6. Ante fallo, mantener reglas seguras y revertir únicamente a una versión del
   cliente compatible. Desactivar progreso mediante configuración y nueva
   publicación; nunca restaurar la regla abierta del backup.

Contingencia si no se termina antes del vencimiento: **no ampliar la fecha abierta**.
Publicar un modo de lectura con las funciones/cliente ya compatibles, mantener
progreso desactivado y pausar escrituras de usuarios y administración durante la
corrección. Si tampoco hay credenciales para las lecturas filtradas, no se puede
prometer que el cliente antiguo siga funcionando de forma segura: habría que
pausar esos listados/perfiles/eventos y ofrecer contenido público estático validado.
La lectura exacta permitida de OBS puede conservarse. Cualquier contingencia real
también necesita autorización; no se ha activado ninguna.

Referencias: [campos y lecturas completas](https://firebase.google.com/docs/firestore/security/rules-fields),
[consultas y operaciones atómicas](https://firebase.google.com/docs/firestore/security/rules-conditions).

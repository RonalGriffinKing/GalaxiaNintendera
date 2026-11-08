# Estrellas permanentes: implementación local y publicación pendiente

Rama: `audit/estrellas-sin-gacha`. Recuperación inicial: etiqueta
`recovery/antes-redisenio-estrellas`. No se han modificado datos ni reglas activas.

## Modelo y compatibilidad

`participationStars` contiene exclusivamente progreso confirmado del nuevo sistema.
Cada noticia pública aprobada, publicada y distinta concede 1 punto, ignorando los
antiguos `starReward` y `rewardMultiplier`. `users.stars` conserva el saldo anterior
sin cambios; **no se interpreta como total histórico**. El perfil señala esta
separación mientras `progressMigrationVersion` no sea 2. Los perfiles nuevos
empiezan con cero puntos, como los anteriores empiezan con cero puntos futuros;
los importes históricos permanecen en su campo original.

`unlockedIcons` conserva derechos anteriores y los adquiridos al ganar puntos,
sin duplicados. El servidor conserva los iconos ya disponibles antes de subir un
requisito o retirar disponibilidad. Esto incluye usuarios que no hayan abierto
recientemente su colección. Los iconos adquiridos siguen seleccionables aunque
se oculten o desactiven después. No se borran imágenes ni documentos históricos.

`profileIconDefaults.json` mantiene los IDs/nombres/archivos integrados. Los cinco
primeros iconos son gratuitos; los demás se distribuyen en grupos entre
10/25/50/100 estrellas. No se convierten precios antiguos en requisitos.
El gestor permite modificar `requiredStars` (cualquier entero no negativo),
`order`, `visible`, `active`, nombre e imagen URL. Los iconos personalizados
existentes se combinan con los integrados. Sin requisito previo, un icono
personalizado usa 25 puntos; sus propietarios históricos siguen conservándolo.

El prestigio es `floor(participationStars / 100)`, decorativo, calculado al vuelo.
No existe límite de producto; se validan enteros seguros de JavaScript para evitar
desbordamientos. No se persiste una colección de insignias.

## Función y seguridad

`profile-progress` valida el ID token Firebase, usa únicamente el UID verificado,
consulta usuario/bloqueo/noticia/catálogo desde Firestore y realiza transacciones.
`begin-read` guarda hora de servidor. `award-read` requiere al menos 30 segundos y
un documento de lectura inexistente. Repetir la petición o abrir otra pestaña no
vuelve a recompensar. El navegador conserva la comprobación de llegar al final.
El tiempo de servidor no demuestra lectura humana: impide adelantar el reloj del
cliente, pero no convierte una petición automatizada en prueba de comprensión.

No hay escrituras cliente de puntos ni de propiedad/selección de iconos. Si la
función falla, no se ofrece una escritura directa como alternativa. Los cambios
del catálogo requieren administrador verificado. Reducir acceso conserva derechos
en la misma transacción que cambia el catálogo. Por seguridad, con más de 450
usuarios ese cambio se rechaza íntegramente y requiere mantenimiento por lotes
revisado (no se hace una actualización parcial). Cambiar nombre/imagen/orden o
bajar un requisito no necesita recorrer usuarios.

`security/firestore/firestore.participation.proposed.rules` es una **propuesta
sin desplegar**, derivada de la propuesta anterior. Impide escrituras cliente de
lecturas, sesiones y catálogo, y cambios propios de campos protegidos del perfil.
La función Admin SDK valida permisos por su cuenta. Las reglas activas no se
han inspeccionado ni cambiado; por tanto la protección de escrituras directas
no puede darse por desplegada. No publicar el cliente solo sin revisar reglas.

## Configuración pendiente (sin credenciales en el navegador)

- Servidor: `PROGRESS_ENABLED=true`, `FIREBASE_PROJECT_ID` y credencial privada
  mediante `FIREBASE_ADMIN_SERVICE_ACCOUNT` JSON o Application Default Credentials.
- No introducir claves Admin en variables `VITE_*`. La función está desactivada
  por defecto y responde 503 sin tocar datos.
- Para pruebas locales usar exclusivamente un proyecto `demo-*` y emuladores
  Auth/Firestore; exportar `FIREBASE_AUTH_EMULATOR_HOST`,
  `FIRESTORE_EMULATOR_HOST`, `FIREBASE_PROJECT_ID` y `PROGRESS_ENABLED` en la shell
  que inicia Vite. No cargar credenciales de producción para validar localmente.
- Dependencia nueva: `firebase-admin`, exclusiva de la función; no forma parte
  del bundle del navegador. No había una dependencia exclusiva de gacha que retirar.

Referencia de autenticación: https://firebase.google.com/docs/auth/admin/verify-id-tokens

## Migración histórica separada: sin acceso a producción

`node scripts/plan-star-migration.mjs export.json plan.json` funciona **offline**.
Entrada: `{ "users": [{ "id": "...", "data": { ...perfil }, "reads": [
{ "id": "id-noticia", ...camposLectura } ] }] }`. La exportación debe contener
todos los perfiles y subcolecciones `readPosts`, sin la paginación del perfil UI.
El programa guarda una copia exacta `plan.json.backup.json`, SHA-256 y plan; crea
archivos de forma exclusiva, sin sobreescribir. No contiene código para aplicar
datos a Firestore ni lee credenciales.

Se suman cantidades realmente guardadas en lecturas anteriores a v2, manteniendo
su valor original, y se añade el progreso futuro existente **una sola vez**.
Se comprueba recuento de lecturas, duplicados, importes, saldo y estado de migración.
Un candidato no es aprobación ni prueba de integridad de una exportación: debe
contrastarse con una copia confiable y con otras fuentes de estrellas antes de
aplicarlo. No se deducen gastos a partir de precios, iconos o tiradas actuales.

Ante historial incompleto: recuperar una copia fiable o mantener separados el
saldo anterior y los puntos futuros hasta aprobar una política explícita. No
se inventa una cantidad ni se modifica el perfil de ese usuario.

Una futura aplicación autorizada debe verificar las precondiciones del plan en
transacción, conservar saldo/iconos/lecturas, sumar la base histórica una sola vez
y marcar versión 2 con ID de migración. Si llegan nuevas lecturas, regenerar el
plan antes de aplicar. La reversión usa el backup y compara la versión aplicada;
debe restar solo la base histórica añadida, conservando lecturas y puntos nuevos
ganados desde entonces. No restaurar a ciegas el documento completo de usuario.

## Antes de publicar: autorizaciones independientes

1. Revisar datos/exportación, resolver perfiles ambiguos y aprobar la política
   histórica. No es requisito ejecutar migración para ensayar el sistema v2 local.
2. Las pruebas locales de reglas y concurrencia en Firestore emulado pasan. Antes de publicar, ampliar la comprobaci?n de altas, lectores, admins y
   clientes antiguos. Revisar que ninguna regla amplia existente permita manipular
   puntos, propiedad, catálogo o icono seleccionado por fuera de la función.
3. Aprobar configuración privada, reglas finales, despliegue coordinado de función
   y cliente. Solo entonces habilitar `PROGRESS_ENABLED`.
4. Aprobar por separado la ejecución de la migración histórica. Nada en esta rama
   la ejecuta automáticamente durante build, arranque o inicio de sesión.
5. Las páginas CMS ya guardadas pueden conservar textos económicos antiguos:
   los valores iniciales se actualizaron, pero revisarlas y editar su contenido
   real requiere una acción aparte autorizada. No se sobrescribieron documentos.

## Código retirado

- Archivo `src/components/profile/gachapon/GachaponModal.vue` y sus animaciones.
- Funciones `redeemIcon`/`drawProfileIcon`, precios/costes y transacciones de gasto
  de `profileProgress.js`.
- Suscripciones a precios, modal, estados, eventos y botones de sorteo del perfil.
- Opciones de cantidad/multiplicador de recompensa en el editor de noticias.
- Pruebas económicas sustituidas por pruebas de progreso, permisos y migración.

Noticias/perfiles/comunidades/eventos/logros/overlays mantienen sus servicios.
La eliminación de `src.zip` anterior al trabajo continúa fuera de los commits.

## Verificacion local

- Suite Vitest: 263 pruebas, 47 archivos aprobados (excluyendo copias antiguas de `.restore-backups`).
- Emulador Firestore local `demo-galaxia-participation`: 2 pruebas de reglas y transacciones concurrentes aprobadas.
- Compilaci?n Vite de producci?n aprobada.
- El emulador se ejecut? en `127.0.0.1:8055`, sin datos reales.
- `npm audit` informa avisos en dependencias del proyecto; no se aplic? una actualizaci?n masiva ajena al redise?o. Revisar por separado antes de publicar.

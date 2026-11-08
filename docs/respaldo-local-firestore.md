# Respaldo local privado de Firestore

Preparado y probado solo con datos ficticios. **No se ha ejecutado la copia de
producción.** No requiere bucket ni activar facturación: usa lecturas normales de
Firestore, sujetas a la cuota disponible. No cambia datos, reglas ni Netlify.

## Qué incluye y cómo se protege

`scripts/firestore-private-backup.mjs` recorre todas las colecciones y
subcolecciones de la base `(default)`, incluso hijos de documentos padre ausentes.
Conserva rutas/IDs, campos, enteros int64 sin pérdida, doubles (incluido -0 y
valores especiales), bytes, fechas, coordenadas, referencias, vectores, listas y
mapas. Las fechas internas de creación/actualización se archivan como metadatos;
al restaurar, Firestore asigna nuevas fechas internas. No incluye Auth, índices,
reglas, configuración TTL ni archivos de proveedores externos.

Los documentos se guardan comprimidos y cifrados con AES-256-GCM, nunca como JSON
personal sin cifrar. La clave aleatoria de 32 bytes se guarda separada. Los dos
destinos deben estar fuera del repositorio y ser carpetas nuevas: en Windows se
restringe la carpeta al usuario actual mediante ACL; en POSIX, modo 0700/0600.
No elegir carpetas compartidas o sincronizadas. Las salidas contienen únicamente
recuentos, tamaños y estado; no documentos, IDs, rutas personales ni claves.

Se realizan dos recorridos completos y se comparan contenido, estructura y
metadatos. Si hay cambios, se rechaza la copia. **No es una instantánea atómica**:
la copia debe realizarse durante una ventana sin escrituras (usuarios, tareas y
administradores). Una pausa de escrituras de producción requeriría autorización
separada; el script no la impone ni cambia reglas. No publicar basándose solo en
dos lecturas coincidentes si la web continúa escribiendo.

## Lo que hace el propietario, tras autorizar la copia

1. Preparar fuera de Git una credencial local con lectura Firestore, preferiblemente
   una cuenta dedicada `roles/datastore.viewer`. No copiar secretos al chat. La
   sesión Firebase CLI y las variables privadas de Netlify no se leen por este
   script ni sustituyen ese archivo local. Proteger el JSON con permisos del usuario.
2. Acordar la ventana sin escrituras. Mantener `PROGRESS_ENABLED=false`; no crear
   Storage. Ejecutar desde esta rama con Node 22 y dependencias instaladas (`npm ci`).
3. Ejecutar estos comandos **solo después de aprobar la copia de producción**:

```powershell
$backupStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path $env:LOCALAPPDATA "GalaxiaFirestoreBackup-$backupStamp"
$backupKey = Join-Path $env:LOCALAPPDATA "GalaxiaFirestoreKey-$backupStamp\key.bin"
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\RUTA-PRIVADA\cuenta-solo-lectura.json'
$env:PROGRESS_ENABLED = 'false'
Remove-Item Env:FIRESTORE_EMULATOR_HOST -ErrorAction SilentlyContinue
node scripts/firestore-private-backup.mjs init-key --key $backupKey
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la clave privada' }
node scripts/firestore-private-backup.mjs export --project widget-dreams --authorize-production-read widget-dreams --dir $backupDir --key $backupKey
if ($LASTEXITCODE -ne 0) { throw 'Respaldo incompleto: no publicar' }
node scripts/firestore-private-backup.mjs verify --dir $backupDir --key $backupKey
if ($LASTEXITCODE -ne 0) { throw 'Verificación fallida: no publicar' }
```

Se generan `documents.enc` y `manifest.json`. La verificación comprueba SHA-256,
autenticación GCM, estructura, rutas únicas, tipos y recuentos, sin conectar a
Firestore. No usar una carpeta incompleta. Guardar una segunda copia del archivo
cifrado y conservar la clave por separado: perderla hace irrecuperable la copia.

## Restauración probada, exclusivamente en emulador vacío

Antes de publicar, la copia real deberá pasar también esta restauración local;
todavía no se ha creado y no se ha restaurado ningún dato real. La restauración
de la copia real necesita aprobación adicional porque descifra datos personales
en memoria del emulador. Usar equipo privado; no exportar su disco ni activar
logs de documentos. Firebase Emulator crea logs de infraestructura: no adjuntarlos.

Arrancar el emulador sin `--import`, con un proyecto `demo-` nuevo y sin reglas
de producción publicadas; este comando solo inicia infraestructura local:

```powershell
firebase emulators:start --only firestore --project demo-galaxia-restore --config security/firebase.emulators.json
```

En otra consola privada, con `$backupDir` y `$backupKey` definidos como antes:

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8055'
Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS -ErrorAction SilentlyContinue
node scripts/firestore-private-backup.mjs restore-emulator --project demo-galaxia-restore --dir $backupDir --key $backupKey
```

Rechaza destinos no vacíos y proyectos que no sean `demo-`. El escritor está
fijado a `127.0.0.1:8055`; no existe comando de restauración de producción. Valida
toda la copia antes de escribir y usa creación exclusiva, sin sobrescrituras.
Después recorre el emulador y compara todos los datos/tipos/IDs y subcolecciones
con el archivo. Las referencias internas apuntan al proyecto de prueba y las
externas conservan su destino. No seguir referencias ni ejecutar la web contra
los datos restaurados. Detener el emulador al terminar; no usar `--export-on-exit`.
Si falla a mitad, no continuar sobre el destino parcial: usar otro proyecto demo
vacío. El script no borra destinos ni restaura sobre producción.

## Tamaño y pruebas

Sin leer producción completa no hay una estimación fiable del tamaño real.
Reservar **1 GB libre** para copia y segunda copia; es una reserva de trabajo,
no una medición de esta base. El límite de esta herramienta es **256 MiB sin
comprimir** por copia; si lo supera, se detiene y requiere adaptar el proceso,
sin generar un respaldo que declare éxito. Para el caso límite conviene disponer
de varios GB de RAM por los dos recorridos y el cifrado en memoria. El comando
informa `bytes` y `plainBytes` reales cuando se autorice y complete la copia.

Cinco pruebas de emulador cubren exportación/restauración completa con tipos
especiales y padres ausentes, corrupción/clave incorrecta, rechazo de producción
y destinos no vacíos, rechazo de una fuente que cambia y el flujo completo de
los comandos documentados con salida agregada. Datos sintéticos
temporales se eliminan tras la prueba. No se ha ampliado la auditoría de la web.

Referencias oficiales:
[enumerar subcolecciones](https://firebase.google.com/docs/firestore/query-data/get-data),
[listDocuments incluye padres ausentes](https://googleapis.dev/nodejs/firestore/latest/CollectionReference.html#listDocuments).

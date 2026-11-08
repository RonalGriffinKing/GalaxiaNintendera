# Publicar estrellas e iconos: pasos pendientes

Preparación local del 8 de noviembre de 2026. No se publicaron reglas, código,
imágenes ni datos. Servicio desactivado por defecto. Recuperación:
`recovery/antes-centralizar-iconos` y commits de la rama `audit/estrellas-sin-gacha`.

## Configuración mínima

- Firebase: conservar el proyecto/Auth/Firestore existentes. Habilitar un bucket
  Storage para las imágenes si aún no existe. La cuenta privada del servidor
  necesita lectura/escritura de Firestore, consultar usuarios para verificar
  tokens revocados y crear/leer objetos del bucket. No necesita eliminar imágenes.
- Netlify: cargar `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET` y
  `FIREBASE_ADMIN_SERVICE_ACCOUNT` privados con alcance Functions. Mantener
  `PROGRESS_ENABLED=false` hasta la autorización. Plantilla sin secretos:
  `docs/profile-progress.env.example`. Ninguna clave Admin en variables `VITE_*`.
- Build fijado a Node 22 y esbuild en `netlify.toml`. Revisar que el runtime de
  Functions sea compatible; si hay un override antiguo, configurar
  `AWS_LAMBDA_JS_RUNTIME=nodejs22.x` en Netlify UI y volver a publicar.
  Cambiar variables de funciones requiere desplegar para aplicarlas; no es un
  interruptor instantáneo.
- Subidas: PNG/JPG/WEBP/GIF hasta 512 KB, validadas por tipo, firma y tamaño.
  Solo la función verificada puede subir a `profile-icons/`. Cada subida crea
  un archivo nuevo; no sobrescribe ni borra imágenes anteriores.

## Reglas: solo el cambio necesario

No usar como reemplazo los archivos completos `firestore.*proposed.rules`.
Usar `security/firestore/progress.fragment.rules` y
`security/firestore/icon-storage.fragment.rules` al integrar el cambio en una
exportación de las reglas efectivas. Los fragmentos no se despliegan solos.
Conservar las lecturas/edición normal del perfil y los permisos de módulos ajenos.

En usuarios, combinar los permisos existentes de creación/actualización con los
guards del fragmento. Impedir que un propietario se cambie rol/bloqueo/permisos y
que cualquier cliente cambie puntos, lecturas, derechos, icono seleccionado o
marcas de migración. Catálogo, sesiones y logros se escriben por la función.
Eliminar o excluir de las autorizaciones generales las rutas protegidas: un
`allow ... if true` coincidente anula cualquier restricción más específica.

**Vencimiento pendiente de confirmar:** el documento del usuario indica
15/11/2026 (7 días desde esta preparación); una nota antigua del repositorio
indicaba 26/05/2027. La consulta de reglas efectivas no fue posible porque la
autenticación Firebase CLI disponible está caducada/no es válida. No se renovó
sesión ni se modificó producción. Antes de publicar, exportar reglas vigentes
y ejecutar `node scripts/check-progress-rules.mjs effective.rules`.
El script es una comprobación local orientativa, no una prueba de seguridad.
No renovar a ciegas una regla abierta ni dejar expirar módulos ajenos al cambio.

## Orden de publicación (requiere autorización)

1. Obtener las reglas efectivas, comprobar vencimiento y preparar su diferencia
   mínima. Guardar copia del código/reglas/configuración y una exportación de
   perfiles/lecturas. No ejecutar migración histórica.
2. Probar ese cambio exacto y la función en proyecto aislado/emuladores. Ensayar
   registro, lectura única, selección bloqueada, gestión admin, logros y módulos
   existentes. Confirmar el runtime y el bucket en ese entorno.
3. En una ventana breve, pausar recompensas/personalización antiguas; la lectura
   de noticias y el resto de la web pueden seguir disponibles. Esta pausa debe
   prepararse antes del cambio real; aún no hay una pantalla de mantenimiento.
4. Aplicar primero las reglas mínimas para rechazar escrituras de pestañas viejas.
   Publicar cliente y función juntos, con el servicio todavía desactivado.
5. Configurar `PROGRESS_ENABLED=true` y publicar para activarlo. Comprobar con
   cuentas autorizadas: una lectura = un punto, reintento = cero puntos nuevos,
   icono bloqueado rechazado, icono adquirido conservado, CRUD admin e imágenes.
6. Retirar la pausa y pedir recarga a las pestañas antiguas. Estas no podrán
   volver a gastar/conceder puntos directamente; pueden mostrar un error hasta
   recargar. No se promete compatibilidad silenciosa con código antiguo.
7. Si falla: volver a publicar con `PROGRESS_ENABLED=false`, mantener aviso de
   indisponibilidad de estas operaciones y conservar las reglas seguras. No
   restaurar permisos abiertos ni revertir a la economía antigua.

## Historial y derechos

Saldo `users.stars`, lecturas históricas e iconos adquiridos no se migran ni
reinician. Los puntos futuros quedan separados; la UI muestra el aviso de
historial pendiente. El planificador offline y la política independiente siguen
en `docs/estrellas-sin-gacha.md`. Solo se borra del catálogo un icono personalizado
sin usuarios con derechos ni selección; nunca sus archivos ni historial.
Los integrados se ocultan/desactivan, conservando los archivos.

Se mantiene el rechazo íntegro de operaciones que necesiten conservar derechos
con más de 450 usuarios. El procedimiento paginado/idempotente/reanudable se
preparará solo si hace falta; no se añadieron colas ni nuevos servicios.

## Dependencias publicadas

Parches compatibles aplicados al lock: protobufjs y módulos asociados,
websocket-driver, socket.io-parser, ws usado por tmi/Storybook y el parche
compatible de grpc de Firebase. No se usó `--force` ni un downgrade de Firebase.

Quedan avisos diferenciados: grpc antiguo de Firebase cliente Node no es el grpc
de Firebase Admin ni se usa en el bundle Firebase del navegador; ws antiguo de
engine.io corresponde a su transporte Node (el navegador usa WebSocket nativo).
Vue server-renderer afecta SSR, que aquí se usa en pruebas y no en el sitio
estático. Storybook/Vite/Vitest/PostCSS/globs afectan desarrollo/compilación;
las cadenas google-gax/gaxios/rimraf requieren revisar la condición del aviso,
no reciben rutas o esquemas arbitrarios desde profile-progress. No se presenta
el contador de npm como prueba de explotabilidad ni como cero riesgo.
No exponer servidores de desarrollo y aplicar futuras actualizaciones compatibles
por separado; repetir pruebas ante cualquier cambio del lock.

Referencias: [runtime Netlify](https://docs.netlify.com/build/functions/configuration/),
[permisos coincidentes](https://firebase.google.com/docs/rules/rules-behavior).

# Preparación de publicación — 08/11/2026

Solo preparación local. No se autorizan ni ejecutan cambios en Netlify/Firebase,
respaldos de datos reales, despliegues, creación de buckets ni activación de progreso.

**Decisión final del propietario (08/11/2026):** detener el respaldo de datos y
preparar la publicación sin seguir desarrollándolo. La lectura se ha detenido;
no existe una copia completa verificada de Firestore. La copia de datos deja de
ser un requisito de este procedimiento por instrucción posterior del propietario.
No se ejecutará ningún despliegue hasta recibir su aprobación expresa.

## 1. Lo que configura el propietario en Netlify

Abrir el proyecto correcto → **Project configuration → Environment variables →
Add a variable**. Introducir estas variables desde la interfaz privada, con alcance
**Functions** y contexto **Production**. Si el plan no ofrece selección de alcance,
usar el alcance disponible que incluya Functions. No dar credenciales de producción
a previews de PR; un entorno remoto aislado debe usar otro proyecto y otros datos.

- `FIREBASE_PROJECT_ID`: `widget-dreams`.
- `FIREBASE_ADMIN_SERVICE_ACCOUNT`: JSON completo de la cuenta de servicio del
  proyecto, pegado solo en el valor privado de Netlify, no en chat, Git ni `VITE_*`.
  Debe contener `project_id=widget-dreams`. Preferir una cuenta dedicada con lectura
  Firestore (`roles/datastore.viewer`) para esta fase; no necesita escritura ni
  permisos de Storage mientras el progreso esté desactivado. Crear/obtener la clave
  es una acción manual del propietario en Google Cloud IAM → Service Accounts →
  cuenta dedicada → Keys → Add key → Create new key → JSON. No generar otra si ya
  existe una credencial adecuada y protegida. Si la organización prohíbe claves,
  detener este paso y preparar acceso federado por separado.
- `PROGRESS_ENABLED`: exactamente `false`.

No definir `FIREBASE_STORAGE_BUCKET` para el nuevo servicio en esta fase: no hay
bucket y no se habilitan subidas. La variable pública histórica del frontend puede
permanecer; no crea un bucket por sí sola. No configurar hosts de emuladores ni
`GOOGLE_APPLICATION_CREDENTIALS` apuntando al ordenador local en Netlify.

Node 22 ya está en `netlify.toml`. Si se necesita fijar explícitamente la versión
de Functions, `AWS_LAMBDA_JS_RUNTIME=nodejs22.x` se define desde la interfaz con
alcance **Builds**, pues selecciona el runtime durante el empaquetado.
Guardar variables no equivale a verificar el despliegue; se comprobarán en la
publicación autorizada. No se ha accedido a la configuración real de Netlify.

## 2. Lo que prepara y prueba el agente

Emuladores locales `demo-galaxia-permanent`, Firestore 8055 y Storage 9199,
fixtures sintéticos, sin copias ni credenciales de producción. Se ejecutan las
reglas exactas candidatas, funciones/servicios, flujo real de perfiles paginados,
permisos administrativos, pruebas y compilación con Node 22.
El test de subida utiliza únicamente Storage emulado; no habilita la función
real ni crea un bucket. `PROGRESS_ENABLED=false` se fija durante la validación.

Resultado de esta ejecución: **286 pruebas de código y 20 de permisos/servicios/
Storage aprobadas**, compilación Node 22 correcta, cuatro funciones empaquetadas
localmente y verificaciones del bundle público superadas.

Esta prueba no certifica la configuración de Netlify ni su runtime desplegado.
No se ha creado un sitio remoto de pruebas: hacerlo sería un despliegue y requiere
autorización independiente y un proyecto Firebase de pruebas sin datos reales.

## 3. Respaldos: preparar ahora, ejecutar solo tras autorización

Esta sección describe alternativas históricas. El respaldo de Firestore está
detenido por petición expresa; no volver a ejecutarlo durante la publicación.
Para recuperación del código se han conservado el tag local
`recovery/antes-publicar-firebase-20261108`, el código anterior de `main` y el
paquete compatible en `.restore-backups/firebase-release-20261108/` (ignorado por
Git). El paquete incluye `dist`, las nueve funciones empaquetadas y las reglas
completas, además de los manifiestos de dependencias/configuración. Los recursos
públicos actuales descargados son una referencia adicional, no una exportación
del despliegue de Netlify. Antes del despliegue autorizado registrar su ID actual
en Netlify Deploys y conservarlo como referencia histórica. La versión antigua
no debe reactivarse sin verificar compatibilidad con las reglas restrictivas.

Alternativa local preparada posteriormente: [respaldo local cifrado](respaldo-local-firestore.md).
Permite evitar bucket y activación de facturación, con lectura Admin SDK durante
una ventana sin escrituras. La copia real sigue pendiente de autorización;
no es una instantánea transaccional ni un respaldo de Authentication/configuración.
Los requisitos de bucket/Blaze siguientes aplican solo a la alternativa administrada.

1. Conservar commit/tag local, artefacto cliente/funciones compatible, IDs de
   despliegue Netlify y copia de reglas efectivas. Guardar configuración y secretos
   únicamente en almacenamiento privado; no adjuntarlos al informe ni a Git.
2. Respaldar Firestore completo, incluidas subcolecciones, en almacenamiento privado.
   La exportación administrada necesita facturación Blaze, permisos y un bucket
   de Cloud Storage. Actualmente no existe bucket en este proyecto: **el respaldo
   está pendiente** de elegir y autorizar destino/configuración y posibles costes.
   Un bucket privado de respaldo no activa Storage de iconos ni sus subidas.
3. Tras autorización, exportar desde Google Cloud Console → Firestore →
   Import/Export → Export, seleccionar base `(default)` y todas las colecciones,
   destino privado aprobado. Esperar estado satisfactorio y verificar metadatos
   de integridad. Una prueba de restauración solo se haría en otro proyecto, con
   autorización independiente; nunca importar sobre producción para comprobarlo.

## 4. Orden de publicación, sujeto a aprobación expresa

1. Confirmar proyecto/UID correctos, variables privadas y
   `PROGRESS_ENABLED=false`; acordar una ventana breve y conservar versión segura
   compatible para reversión. No publicar reglas si falla la configuración.
2. Publicar juntos el cliente y las funciones compatibles: `public-content`,
   `seo-files`, `xbox-profile`, `profile-progress` (esta última desactivada).
3. Comprobar que la función pública responde y filtra datos privados, carga una
   noticia/perfil/evento y el progreso devuelve desactivado. Si falla, corregir
   antes de publicar reglas; no dejar la regla abierta como solución permanente.
4. Sustituir inmediatamente las reglas Firestore por el archivo completo
   `security/firestore/firestore.permanent.rules`. No mezclar fragmentos ni
   conservar el permiso global temporal. No publicar reglas de Storage ahora.
5. Recargar pestañas antiguas y comprobar visitante/usuario/admin: perfiles,
   comentarios, comunidades, seguidores, chats, eventos, recordatorios, SEO y OBS.
   Una lectura ajena directa de `users` debe ser denegada; el perfil público sigue
   disponible a través de la función. No activar estrellas ni migrar datos.
6. Si falla: mantener reglas restrictivas y volver solo a un paquete compatible
   previamente validado. Si no existe uno, pausar el módulo afectado; no restaurar
   el permiso global abierto ni la web antigua que depende de él.

### Comandos preparados: no ejecutados

Desde `audit/estrellas-sin-gacha`, con autorización expresa y sesión Netlify
disponible. Revisar en su interfaz que las tres variables incluyen alcance
Functions/contexto Production y que el proyecto es `warm-flan-768d6e`. Las rutas
públicas actuales de las nuevas funciones devuelven HTML de la SPA, no sus
respuestas JSON: esto no demuestra todavía que reciban las variables en runtime.
No mostrar ni pasar el JSON privado como argumento de consola.

```powershell
npx netlify-cli deploy --prod --context production --site warm-flan-768d6e
```

El comando actual de Netlify compila y publica cliente y funciones conjuntamente.
No usar subida manual de `dist` sin funciones. Después comprobar como mínimo:

- `GET /.netlify/functions/profile-progress`: JSON 503 `progress-not-configured`.
- `GET /.netlify/functions/public-content?collection=sitePages`: JSON 200 sin
  borradores ni datos privados; verificar además una noticia y un perfil público.
- Verificar sitemap, imágenes existentes y pantalla administrativa del UID
  confirmado. Si falla, **detener aquí y no publicar reglas**.

Solo con esas comprobaciones correctas, aplicar el archivo completo, sin Storage,
índices, migraciones ni ampliación de la fecha abierta:

```powershell
firebase deploy --project widget-dreams --config security/firebase.release.json --only firestore:rules
```

Guardar el ID del nuevo despliegue compatible: será la versión de recuperación
con las reglas restrictivas activas. Una corrección posterior de reglas debe
mantener la denegación por defecto y los campos privados protegidos; nunca usar
el archivo histórico abierto como rollback. Ningún comando anterior se ha ejecutado.

Vencimiento vigente: **15/11/2026, 01:00 Madrid**. No ampliar la regla abierta.

Fuentes oficiales:
[variables de Functions](https://docs.netlify.com/build/functions/environment-variables/),
[configuración de variables](https://docs.netlify.com/build/environment-variables/get-started/),
[respaldo administrado Firestore](https://firebase.google.com/docs/firestore/manage-data/export-import).

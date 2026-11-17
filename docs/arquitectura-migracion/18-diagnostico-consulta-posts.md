# Fase 8 — Diagnóstico de la consulta pública de `posts`

Fecha: 15 de noviembre de 2026. Alcance: candidato local `security/firestore/firestore.candidate.review.rules` y suite `security/firestore/rules.candidate.emulator.mjs`. El diagnóstico inicial se hizo sin modificar archivos; tras la aprobación del usuario se aplicó el cambio local y se repitieron las pruebas. Firebase de producción no se modificó.

## Causa exacta

El rechazo de la consulta filtrada se debe a la comprobación `data.get('releaseAt', data.get('scheduledAt', 0)) is number` dentro de `publicPost()` (línea 31 del candidato). Para un `get` por ID, el motor conoce el documento y puede evaluar su tipo. Para `list`, debe autorizar *todas* las respuestas potenciales de la consulta antes de leerlas: el filtro `where('releaseAt', '<=', Date.now())` no le permite demostrar esa condición de tipo. Por eso deniega toda la consulta, aunque el documento de prueba `posts/public` tiene `releaseAt: 0` numérico.

La condición de tiempo `releaseAt <= request.time.toMillis()` **no es la causa**. En el emulador, una regla de listado con estado, visibilidad y comparación temporal, pero sin `is number`, autorizó exactamente `posts/public`. Añadir de nuevo `is number` hizo fallar la misma consulta. Una variante en memoria que eliminó **solo** esa comprobación del candidato autorizó la consulta; no se guardó como regla nueva.

## Regla, consulta y datos comprobados

En el candidato previo, `publicPost()` requería `status == 'approved'`, visibilidad `public` o `unlisted`, valor temporal numérico y fecha no posterior a `request.time.toMillis()`. `discoverablePost()` añade visibilidad `public`. En `/posts/{id}`, `allow get` usa `publicPost()` y `allow list` usa `discoverablePost()`; los permisos administrativos y del publisher son ramas separadas. La consulta que fallaba era:

```js
getDocs(query(
  collection(guest(), 'posts'),
  where('status', '==', 'approved'),
  where('visibility', '==', 'public'),
  where('releaseAt', '<=', Date.now())
))
```

Los fixtures originales de la suite crean `posts/public` (aprobado, público, `releaseAt: 0`), `posts/private` (aprobado, privado, `0`), `posts/draft` (borrador), `posts/unlisted` (aprobado, no listado, `0`) y `posts/future` (aprobado, público, fecha futura numérica). La escritura actual de `PostEditor.vue` calcula `releaseAt` con `Date.getTime()` o `0`: milisegundos de época como número. El cliente conserva una lectura heredada de `scheduledAt`; no se han inspeccionado documentos de producción para confirmar sus tipos reales.

Con el candidato anterior al cambio, `get` público permitía `public` y `unlisted` y denegaba `draft`, `private` y `future`; el `list` sin filtros se denegaba. El único fallo de la suite de 32 casos era este `list` filtrado (31 aprobados, 1 fallido, según la ejecución de fase 7).

## Pruebas diagnósticas ejecutadas

Se ejecutaron variantes **solo en memoria** con Firebase Emulator Suite, configuración `firebase.emulator.candidate.json`, proyecto `demo-galaxia-security` y Firestore en `127.0.0.1:8055`:

- Candidato original: consulta filtrada **denegada** (`permission-denied`).
- Único cambio temporal: quitar `is number` de `publicPost()`; consulta filtrada **permitida**, devuelve solo `posts/public`.
- Regla temporal con estado, visibilidad y comparación temporal directa: **permitida**; al añadir `releaseAt is number`: **denegada**.
- Con la condición de tipo retirada, `get` de un documento con `releaseAt: '0'` (cadena), de `private`, de `draft` y de `future`: **denegados**. Una consulta cuyo límite abarcaría `future`: **denegada** por la comprobación temporal de la regla.

Estas pruebas aíslan la causa; no sustituyen la ejecución completa de la suite tras una eventual modificación aprobada.

## Cambio aprobado y aplicado localmente

**A. Reglas.** Se retiró únicamente la cláusula `is number` de `publicPost()`. Permanecen intactos `status`, `visibility`, `discoverablePost()` y la comparación `<= request.time.toMillis()`. No se cambiaron los permisos de otras colecciones ni se concedió lectura global de `posts`.

**B. Consulta.** Para *este* fallo, ya contiene los tres filtros necesarios y no requiere cambio. Las consultas públicas reales que hacen `getDocs(collection(db, 'posts'))` o filtros incompletos seguirán rechazadas: son adaptaciones independientes registradas en las fases anteriores. El reloj del cliente se usa como límite en esta consulta; conviene probar el caso de reloj adelantado antes de adoptar el patrón en la web.

**C. Datos.** No cambiar datos para reparar la prueba: los fixtures y el escritor actual usan números. Los documentos heredados sin `releaseAt` o solo con `scheduledAt` no aparecerán en una consulta que filtra por `releaseAt`, aunque el `get` por ID pueda aplicar el valor de respaldo. Su presencia y formato en producción no están confirmados; deben inventariarse antes de migrar consultas públicas.

**D. Documentos de prueba.** Los fixtures originales se conservaron. Los nuevos casos de fecha como texto, campo ausente y `scheduledAt` heredado se crean solo dentro de cada prueba, en el emulador.

## Ejecución de la suite completa tras la aprobación

Comando ejecutado con JDK 21 disponible en el entorno del proceso:

```powershell
firebase emulators:exec --project demo-galaxia-security --config security/firestore/firebase.emulator.candidate.json --only firestore "node security/firestore/rules.candidate.emulator.mjs"
```

El registro de arranque confirma `--project_id demo-galaxia-security`, `--host 127.0.0.1`, `--port 8055` y `--rules ...\security\firestore\firestore.candidate.review.rules`. La suite carga ese mismo archivo directamente. El proceso terminó con código 0: **39 pruebas ejecutadas, 39 aprobadas, 0 fallidas**. Las **32 pruebas originales** pasaron, incluida la consulta pública antes fallida. Pasaron también estas **7 pruebas permanentes nuevas**:

1. `releaseAt` numérico válido: `get` permitido y `list` filtrado devuelve solo la publicación esperada.
2. `releaseAt` futuro: `get` denegado y `list` con límite futuro denegado.
3. `releaseAt` como texto: `get` denegado.
4. `releaseAt` ausente: `get` permitido por el respaldo `0`; el `list` filtrado no incluye ese documento.
5. Solo `scheduledAt` heredado: `get` permitido; el `list` filtrado por `releaseAt` no lo incluye.
6. Publicación privada: `get` y `list` con visibilidad privada denegados.
7. Borrador: `get` y `list` con estado borrador denegados.

Las denegaciones esperadas generan mensajes `PERMISSION_DENIED` en el log del emulador; no son fallos de prueba. El candidato local compila y pasa esta suite, pero aún no equivale a una validación de todos los datos y flujos reales ni autoriza un despliegue. La adaptación de consultas públicas sin filtros y la revisión de documentos heredados siguen pendientes según los informes previos.

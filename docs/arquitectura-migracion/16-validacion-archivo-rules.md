# Validación del archivo Firestore Rules original en disco

Fecha: 15-11-2026. Archivo examinado directamente: `security/firestore/firestore.candidate.review.rules`. SHA-256: `D30EED682DC2ED2037648E88FFA8CA18811ACC56E26692EA1D0D1C24267159BD` (17 950 bytes; 263 líneas según separación CRLF/LF). No se usó texto pegado en el chat. Solo se creó este informe; no se cambiaron reglas ni código funcional.

## 1. Comprobación estática — realizada

- Los bytes decodifican y vuelven a codificar como UTF-8 sin diferencia de longitud. El contenido tiene **0 caracteres fuera de ASCII**; no hay Unicode inesperado, BOM transformado ni entidades HTML detectadas (`&amp;`, `&lt;`, `&gt;`, `&quot;`, entidades numéricas).
- Se detectaron **154 operadores literales `&&`** y **23 signos `$`**. Los `$` examinados forman parte de la interpolación de rutas de Firebase `$(database)`, `$(request.auth.uid)`, `$(id)`, `$(uid)`, `$(target)`, `$(communityId)`, `$(data.communityId)` o `$(chat)`. No hay expresiones Markdown literales `*&&*` o `*$*`.
- El archivo declara `rules_version = '2'`, `service cloud.firestore` y `match /databases/{database}/documents`. Las rutas `get()`/`exists()` usan paths absolutos con interpolación propia del lenguaje. Las estructuras `match` cubren colecciones/subcolecciones previstas. El catch-all final es `allow read, write: if false`; no hay `allow read, write: if true` ni regla temporal abierta en el candidato.
- Revisión manual de operadores/funciones: `&&`, `||`, `!`, `in`, `is`, `get`, `exists`, `Map.get`, `diff`, `affectedKeys`, `List.toSet`, `removeAll`, `Set.union/difference`, `request.time.toMillis` concuerdan con la sintaxis documentada de Firebase. Esta inspección **no prueba compilación**.
- Las reglas coincidentes se combinan con **OR**. El catch-all denegatorio no revoca un `allow` de otro `match`; la seguridad depende de no mezclar el candidato con reglas globales permisivas. Las subcolecciones no heredan automáticamente el `allow` del padre.

## 2. Comparación con la suite — realizada

- `rules.candidate.emulator.mjs` usa `readFile(new URL('./firestore.candidate.review.rules', import.meta.url), 'utf8')`: carga exactamente este archivo desde su mismo directorio; no contiene una copia interna de las reglas.
- La suite fija proyecto `demo-galaxia-security`, Firestore local `127.0.0.1:8055`, rechaza `FIRESTORE_EMULATOR_HOST` distinto y también `GCLOUD_PROJECT` no demo. `node --check security/firestore/rules.candidate.emulator.mjs` terminó con código 0.
- **Matiz de configuración:** `security/firestore/emulator.json` todavía apunta a `firestore.proposed.rules`. Al arrancar con ese JSON, Firebase CLI intentaría cargar primero la propuesta original; al inicializar `initializeTestEnvironment`, la suite cargaría el candidato y sustituiría las reglas de prueba. Para una compilación aislada del candidato, se necesitará un archivo de configuración local que apunte al candidato o invocar la suite una vez arranque el emulador. No se cambió ese JSON porque forma parte de las pruebas previas y el usuario pidió corregir únicamente el candidato si hiciera falta.
- La suite prueba rutas permitidas y denegadas de roles, posts, perfiles, comunidades, chats, eventos, iconos y OBS. Varias pruebas **esperan denegaciones de flujos que hoy se usan** (contador de miembros, resumen de chat, queries públicas incompletas); son documentación de bloqueo, no prueba de paridad funcional. Storage no está incluido en esta suite.

## 3. Compilación con Firebase CLI — intentada, no completada

Comando local ejecutado: `firebase emulators:exec --project demo-galaxia-security --config security/firestore/emulator.json --only firestore "node security/firestore/rules.candidate.emulator.mjs"`.

Resultado: salida 1 antes de arrancar Firestore, **`Error: spawn java ENOENT`**. `java` no está en PATH. Firebase CLI **no llegó a compilar** ni la propuesta del JSON ni el candidato de la suite. No se instaló Java. Hace falta un JDK compatible con Firebase Emulator Suite, disponible en PATH para el proceso local, y volver a ejecutar. La advertencia del endpoint de notificaciones VSCode es secundaria.

## 4. Pruebas de permisos — no ejecutadas

Ninguna aserción `assertSucceeds`/`assertFails` de la suite llegó a ejecutarse porque el emulador no arrancó. Por tanto no se afirma que reglas y pruebas pasen. Pendientes específicos: compilar candidato; ejecutar suite completa; comprobar registro sin perfil, query con `releaseAt`/`scheduledAt`, perfiles públicos, membresía/contador, envío/resumen/lectura/ocultación de chat, vista OBS, casos de cuenta bloqueada, y reglas Storage por separado. Después, contrastar índices y esquema real en staging. Ninguna de estas acciones implica desplegar producción.

**Conclusión:** el archivo en disco está íntegro y coincide con la suite y con las protecciones documentadas en el informe 15. No se detectó error que justificase modificar el candidato. Su validez sintáctica compilada y su comportamiento siguen pendientes hasta disponer de Java y ejecutar Firebase Emulator Suite.

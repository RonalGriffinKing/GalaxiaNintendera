# Xbox mediante OpenXBL

Acceso: Editar perfil → Conectar sistemas → Conectar Xbox. Se introduce el gamertag completo (con #sufijo si corresponde), se revisa la vista previa y se confirma su publicación. La búsqueda exige una coincidencia exacta única; nunca se vincula el primer resultado aproximado. No se solicitan credenciales de Microsoft/Xbox ni una clave API al usuario. Esta vinculación pública no verifica la propiedad de la cuenta.

La función `netlify/functions/xbox-profile.js` utiliza `OPENXBL_API_KEY` exclusivamente en el servidor mediante `X-Authorization`. La clave ya configurada en Netlify debe estar disponible para Functions. No se ha consultado ni impreso su valor. No se usa `/account` sin XUID, para evitar atribuir al visitante el perfil del propietario de la clave.

Endpoints comprobados en la especificación oficial `https://api.xbl.io/docs/json`:
- `/v2/search/{gamertag}`: búsqueda de perfiles públicos.
- `/v2/account/{xuid}`: datos del perfil guardado.
- `/v2/presence/{xuid}`: estado y títulos activos.
- `/v2/titles/{xuid}`: historial público de juegos.

El plan gratuito anuncia acceso a todos los endpoints con 150 peticiones/hora en `https://xbl.io/pricing`. Esto se ha verificado en documentación, no con la clave de esta cuenta. La clave solo existe en Netlify; no hay CLI, sesión de Netlify ni clave local en este entorno. La prueba autenticada con la clave real queda pendiente de conectar un gamertag en el sitio publicado.

## Datos y límites

Se guarda únicamente `{xuid, gamertag}` en `users/{uid}.socialLinks.xbox` con una actualización de campo anidado. Cambiar y eliminar la vinculación requieren ser el propietario autenticado. No se cambian colecciones, reglas, estrellas, logros ni recompensas. El gamerscore se muestra como dato de Xbox, sin convertirlo a estrellas.

El perfil y el editor muestran nombre, avatar, gamerscore y estado si están disponibles. La vista principal reutiliza la identidad gamer existente para juego activo e historial (hasta tres destacados recientes). No se infieren horas jugadas, biblioteca completa ni logros. Se excluyen títulos marcados como privados o que no son juegos en el historial. Si hay varios títulos activos distintos, no se escoge uno arbitrariamente. Si la presencia o el historial están restringidos o fallan, se conserva el perfil y se informa de que parte de la actividad no está disponible.

## Protección de las consultas

- Solo destinos fijos de OpenXBL; no se aceptan URLs ni XUIDs arbitrarios del navegador.
- La vista previa por gamertag verifica la sesión Firebase mediante Identity Toolkit antes de usar la clave. Se limita a seis búsquedas nuevas por usuario/hora y por instancia.
- La consulta pública acepta el UID de Galaxia; lee el documento de Firebase con los permisos del visitante y obtiene exclusivamente el XUID ya vinculado. Esta lectura se comprueba incluso si los datos Xbox están en caché. No hay permisos de administrador que eludan las reglas.
- Caché acotada de cinco minutos y solicitudes compartidas en servidor y navegador; sin sondeo automático. Una búsqueda nueva suele consumir tres peticiones (búsqueda, presencia e historial). Una consulta sin caché de un perfil guardado también consume hasta tres (cuenta, presencia e historial).
- Los límites en memoria son por instancia de Netlify, no un contador global distribuido. Se respeta el 429/Retry-After del proveedor y se pausa temporalmente tras agotarse el cupo.
- Timeout, límite de respuesta y redirecciones prohibidas. No se devuelven errores crudos ni cabeceras del proveedor. Se filtran datos no utilizados (nombre real, biografía y otros campos personales).

Para una configuración Firebase distinta se pueden definir `FIREBASE_API_KEY` (clave pública del proyecto) y `FIREBASE_PROJECT_ID` en Functions. Por defecto se usa el proyecto ya configurado en la aplicación. Nunca se debe utilizar un nombre `VITE_` para la clave privada de OpenXBL.

## Comprobaciones

- Compilación de producción.
- 67 pruebas en el conjunto de perfil, Nintendo, Xbox, normalizadores, cachés y funciones.
- `node scripts/profile-lab.mjs`, seguido de `node scripts/verify-xbox-link.mjs`, `node scripts/verify-nintendo-link.mjs` y `node scripts/verify-profile.mjs`.

El laboratorio reemplaza Firebase y OpenXBL por fixtures explícitos; las escrituras solo existen en memoria del navegador. Comprueba validación, errores, confirmación antes de persistir, cambio de gamertag, eliminación, permisos de visitante, conservación de recompensas y otros enlaces, y tamaños de 320–1440 px. No sustituye una comprobación con la clave real ni con las reglas desplegadas de Firebase.

El encabezado de "Mi universo gamer" permite cambiar entre los sistemas vinculados. Cada sistema muestra solo su actividad y sus datos disponibles, sin nuevas consultas al proveedor. El selector respeta la visibilidad del perfil.

Diagnostico temporal: Editar perfil > Conectar sistemas > Xbox > Diagnostico temporal de portadas. El modo uid + diagnostic=images exige una sesion Firebase cuyo UID coincida con el perfil y devuelve dos muestras de objetos de titulo originales (con/sin displayImage HTTPS), sin cabeceras ni campos de credenciales. Reutiliza la cache de historial de cinco minutos. No modifica Firebase.

Xbox muestra ahora Logros por juego en lugar de Mas jugados: hasta tres resumenes por ultima actividad, portadas, logros desbloqueados, gamerscore y porcentaje publicado por Xbox. Los totales cero, ausentes o incoherentes se tratan como desconocidos; solo se calculan restantes con totales validos. gameAchievements es independiente de achievements y de las recompensas de Galaxia. No se realizan consultas adicionales al proveedor. El fondo del juego destacado se extiende a toda la tarjeta con blur y degradado continuo.

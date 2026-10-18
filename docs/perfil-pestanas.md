# Perfil principal e integración pública de Nintendo

El perfil tiene una única vista principal, sin navegación por secciones ni barra de estadísticas. La descripción aparece en la cabecera; no se repite en una tarjeta Sobre mí. Se conservan avatar, edición, carrusel, comunidades, seguidores/seguidos, recompensas, iconos y logros.

Dos columnas independientes: gamer y publicaciones en la principal; comunidades, logros, iconos y otros perfiles en la secundaria. En móvil se apilan naturalmente. Las opciones Posts, Hilos, Lecturas y Guardados están dentro de la tarjeta de publicaciones; las dos últimas se muestran solo al propietario. Los guardados se consultan solo para él. Ver todos amplía las publicaciones sin abrir otra sección. Las URLs públicas y las rutas existentes de recompensas se mantienen; los antiguos parámetros de sección muestran ahora la vista principal.

Editar perfil tiene un editor adaptable con identidad, avatar y redes, y el botón Conectar sistemas. Nintendo está disponible con nxapi y Xbox con OpenXBL; Steam aparece como Próximamente con controles deshabilitados. Las conexiones se administran dentro del editor y los datos gamer aparecen en la vista principal. Las escrituras de redes sociales son por campo y conservan las vinculaciones de Nintendo. El editor soporta Escape, foco contenido con Tab y restauración del foco al cerrar; el cierre se bloquea durante escrituras.

## Nintendo mediante enlaces públicos

Editar perfil → Conectar sistemas → Conectar Nintendo ofrece dos campos opcionales. Se puede compartir uno o ambos:

- Presencia: `https://nxapi-presence.fancy.org.uk/api/presence/` más 16 caracteres hexadecimales minúsculos. Aporta nombre, avatar, estado y juego actual si existe.
- Perfil: `https://nxapi-auth.fancy.org.uk/profile/` más el identificador público de 22 caracteres URL-safe. Aporta los juegos recientes y más jugados que publique, sus minutos y fechas.

El formulario valida, consulta y muestra la vista previa antes de habilitar la confirmación. Cambiar un campo invalida la vista previa. Confirmar autoriza que los enlaces y sus datos se muestren públicamente. No es una verificación de identidad Nintendo; no hay OAuth, contraseñas ni tokens. Cada enlace se puede quitar dejando su campo vacío y confirmando el otro; Eliminar vinculación borra ambos.

Se guardan únicamente `socialLinks.nintendoPresence` y `socialLinks.nintendoProfile` en el documento existente `users/{uid}`, usando actualizaciones de campos anidados. No se guarda una copia del JSON ni se crean colecciones. El guardado exige que el usuario autenticado sea el propietario. La edición general del perfil conserva las claves de enlaces que no edita. No se cambian reglas ni permisos de Firebase. Las reglas desplegadas no se han probado con escrituras reales.

## Fuentes y caché

`netlify/functions/nintendo-presence.js` acepta únicamente GET, `source=presence|profile` e `id` validado. Construye el destino con uno de dos dominios/rutas fijos; no admite URLs arbitrarias, parámetros adicionales ni redirecciones. Limita tiempo (8 segundos), tamaño de respuestas descomprimidas (64 KiB / 512 KiB) y solo devuelve datos normalizados. Caché en memoria acotada y cabeceras de caché de 60 segundos; peticiones simultáneas se comparten. El cliente también comparte las consultas y las conserva 60 segundos. Actualizar datos respeta esa caché. No hay sondeo continuo ni consultas en la página de recompensas.

El perfil público contiene un `<script id="state" type="application/json">`. Se lee únicamente ese JSON y se comprueba que coincida el ID solicitado, sin ejecutar scripts ni analizar textos de las tarjetas. Si el servicio cambia ese contrato, se muestra un error; no se inventan datos ni se intenta un scraping alternativo. Los minutos `total_play_time` se convierten a horas para la presentación. Se verificó la unidad comparando el JSON y la presentación pública.

Presencia e historial se mantienen independientes: la fuente de presencia determina online/offline; el perfil público no implica estado online. Su última partida puede aportar el último juego detectado si no hay juego actual. Solo se procesan hasta tres juegos recientes y tres destacados del perfil público. `featuredGames` representa esa selección; `library` permanece nula. No se deriva una biblioteca completa, historial exhaustivo, tiempo adicional ni logros. Un fallo en una fuente no descarta la otra. La información se actualiza al cargar el perfil o al pulsar Actualizar datos en Conectar sistemas.

## Archivos

- `src/pages/ProfilePage.vue`: composición, carga de fuentes y persistencia de enlaces.
- `src/components/profile/NintendoPresenceLink.vue`: formulario, consentimiento, vista previa, confirmación, cambios y eliminación.
- `src/components/profile/ProfileGamerPreview.vue`: datos reales, estados vacíos, juegos destacados y actividad reciente.
- `src/components/profile/ProfileIconEditor.vue` y `ProfileSystemsPanel.vue`: editor adaptable y gestión de sistemas en su interior.
- `src/services/nxapiPresence.js`: validadores, normalizadores y combinación de capacidades.
- `src/services/nintendoPresenceClient.js`: consultas a la función y caché del navegador, reutilizando `apiUrl` para web/Android.
- `src/services/gamerIdentity.js`: selector de destacados y contrato de juegos parciales.
- `vite.config.js`: puente local a la función, siguiendo el mecanismo existente.

## Verificación

- `npm run build`.
- `npx vitest run src/services/nxapiPresence.test.js src/services/nintendoPresenceClient.test.js tests/functions/nintendo-presence.test.js src/services/gamerIdentity.test.js src/services/profileProgress.test.js`.
- Laboratorio aislado: `node scripts/profile-lab.mjs`; en otra terminal, `node scripts/verify-profile.mjs` y `node scripts/verify-nintendo-link.mjs`.

El laboratorio sustituye Firebase y HTTP por fixtures. Solo permite escrituras en memoria de campos de perfil permitidos y nunca escribe en Firebase. Comprueba propietario/visitante, formulario, validación, confirmación antes de guardar, cambios, eliminación, fallo de persistencia, conservación de recompensas y otros enlaces, teclado y tamaños de 320 a 1440 px. Las capturas se guardan en el directorio temporal del sistema.

También se ejecutó la función directamente contra los dos enlaces proporcionados: presencia offline sin juego; perfil con tres juegos recientes y seis tiempos disponibles entre recientes y destacados. Es una comprobación de lectura, sin vincular ninguna cuenta real ni escribir datos. No se ha desplegado ni subido nada.

No existen scripts de lint ni typecheck en package.json. Las consultas de publicaciones conservan ventanas limitadas, sin nueva paginación por cursor. Steam sigue como conexión futura. Xbox utiliza OpenXBL; ver `docs/xbox-openxbl.md`. Los logros gamer no conceden estrellas.

## Presentación de actividad gamer

El juego actual o último detectado usa su propia imagen como fondo atenuado y carátula en primer plano. Los más jugados muestran portadas compactas de 104 px y el tiempo recibido convertido a horas y minutos; no se añaden tiempos diarios ni datos de sesión. La actividad reciente se presenta como cubiertas con degradado y fechas reales, con desplazamiento horizontal interno en móvil. Las tarjetas informativas no simulan botones sin destino.

Se ajustan pesos de tipografía a 400–700 en el contenido del perfil, sin cambiar la fuente global ni los temas. Los controles de Nintendo quedan agrupados: actualizar y cambiar enlaces como acciones secundarias, conectar/confirmar como principales y eliminar como acción discreta separada.

Verificación visual opcional con las fuentes públicas suministradas: `node scripts/verify-gamer-visual.mjs` con el laboratorio local activo. Requiere conexión a nxapi; consulta los datos sin guardarlos en Firebase y comprueba carátulas, títulos largos, pesos tipográficos y anchos 320–1440 px. Las pruebas ordinarias de perfil y vinculación siguen usando fixtures aislados.

Ajuste de tamaño: actividad reciente de 104 px y portada principal reducida. Las tres posiciones de cada lista mantienen dimensiones y alineación; si falta información en una cuenta vinculada se muestra un estado vacío explícito sin inventar juegos, horas ni fechas. Los títulos reservan el mismo número de líneas y los botones de publicaciones tienen anchuras uniformes y selección visible. La verificación visual comprueba alturas iguales con datos reales y vacíos entre 320 y 1440 px.

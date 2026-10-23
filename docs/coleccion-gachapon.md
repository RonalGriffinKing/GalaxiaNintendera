# Colección, gachapón y limpieza del Hub

La colección muestra iconos compactos, el icono equipado primero, búsqueda por nombre, estado (todos, obtenidos, pendientes) y paginación. Presenta doce iconos en escritorio y entre cuatro y doce en móvil según la altura. No hay paneles de progreso por saga ni tres filas de filtros. Logros y administración mantienen sus pestañas. Recompensas usa el mismo `GalaxyAtmosphere` de Eventos y Comunidades, sin el bloque de degradado del perfil.

El gachapón deja de ser una demostración. Solo hay una tirada, sin elegir saga o rareza. Todos los iconos pendientes publicados del catálogo son candidatos con la misma probabilidad. La selección usa `crypto.getRandomValues` con rechazo para evitar sesgo de módulo. No se cobran duplicados porque se excluyen los iconos ya obtenidos según la lectura de la transacción.

El precio único es 20 estrellas por defecto y reutiliza `siteSettings/gachaponPrices.normal` si existe un entero válido. El precio anterior épico deja de usarse. El cliente confirma el precio mostrado contra el documento de precios al canjear. Saldo, permisos y catálogo se vuelven a consultar; estrellas y `unlockedIcons` se actualizan juntas en una transacción. No cambia el icono equipado hasta pulsar Usar este icono. Un guardado fallido no muestra un premio confirmado.

Se mantiene el modelo de transacciones del cliente autenticado y las reglas existentes de Firebase: no hay credenciales administrativas, cambios de reglas ni nuevas colecciones. Las probabilidades no se imponen desde un servidor de confianza frente a un cliente modificado; si se necesitara esa garantía habría que trasladar el sorteo y la concesión a un backend autorizado. La validación automática usa Firebase simulado, sin consumir estrellas de usuarios reales ni alterar permisos desplegados.

La carga del catálogo incluye tanto los recursos incluidos con la aplicación como los iconos publicados en `profileIcons`, respetando ocultos y archivados. El modal es compacto, bloquea doble pulsación/cierre durante el canje, informa de errores y permite equipar el resultado. Se han retirado la demostración, sus modos, audio sintetizado, escena grande y espejo OBS de prueba. El nuevo modal no tiene scroll en los tamaños móviles comprobados (320 × 480 en adelante).

Galaxy Hub ya no tiene Música, playlists, reproductor SoundCloud, iframe, carga del SDK, mini reproductor, temporizadores ni eventos musicales. También se retiran sus opciones de creación/edición de comunidades y el componente antiguo `MusicBubble`. No se eliminan datos históricos de Firebase ni se altera el reproductor de vídeos/directos. La carga del avatar usa una aurora de color suave y la imagen entra con una transición breve; se eliminan los puntos giratorios y la órbita del icono especial. Se respeta movimiento reducido.

Comunidades presenta un máximo de diez tarjetas por página, conserva búsqueda sobre todo el catálogo cargado y reutiliza la caché existente. No vuelve a consultar Firestore al cambiar de página. Las tarjetas aparecen escalonadas en menos de un segundo, con transición suave de las imágenes y foco del buscador en el contenedor. La animación se desactiva con movimiento reducido.

## Validación

- `npm run build`
- `npx vitest run --exclude '**/.restore-backups/**'` (excluye copias locales antiguas que no forman parte de la aplicación).
- `node scripts/profile-lab.mjs` y `node scripts/verify-collection-gachapon.mjs`.

El laboratorio comprueba canje, doble pulsación, permisos denegados, saldo insuficiente, equipamiento, visibilidad pública, tamaños móviles, ausencia de reproducción musical, fondo compartido, paginación y búsqueda de comunidades y movimiento reducido. No efectúa escrituras en Firebase real.

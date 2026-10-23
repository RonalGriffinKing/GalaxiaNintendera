# Eventos: JSON, invitaciones y caducados

## Importar uno o varios eventos

Crear/Editar evento incluye Pegar JSON. El importador rellena el formulario, sin guardarlo automaticamente. Ejemplo: examples/evento.example.json.

Importar eventos en la cabecera permite pegar o adjuntar un archivo JSON (hasta 1 MB). Acepta una lista o un objeto events/eventos, con hasta 50 eventos. Todos se validan antes de mostrar la revision; se pueden excluir filas y corregir el JSON. Ejemplo: examples/eventos-multiples.example.json.

Campos admitidos: title/titulo, description/descripcion, type/tipo, startsAt (ISO o milisegundos), o fecha YYYY-MM-DD junto a hora HH:mm, durationMinutes/duracion, url/link, backgroundUrl/imageUrl/imagen, communityIds. Los IDs de comunidad deben existir. Directo se normaliza a Direct. Las fechas ISO con zona se convierten a la hora local del formulario; una fecha sin zona usa la hora local del dispositivo.

Los lotes se guardan con un unico writeBatch: si falla, no se crean filas parciales. No se importan autores ni permisos del JSON. El autor es el usuario autenticado; los nombres de comunidades proceden del catalogo. El boton bloquea los dobles clics y ofrece abrir el generador tras confirmar.

## Generador de invitaciones de eventos

Ruta: /admin/event-share/:id. La cabecera de Eventos abre la agenda; el boton social de cada evento abre su invitacion. Los enlaces antiguos de post-share con type=event/events redirigen al nuevo generador. El editor de imagenes de posts conserva su propio flujo.

El renderizador EventInvitationCard tiene un marco de degradado, imagen protagonista, ambiente desenfocado, titulo, fecha/hora, duracion, recordatorio y accion visual de invitacion. Los controles permiten:

- Momento: Proximamente, Hoy, En vivo o Repeticion. Son decisiones manuales para la imagen; no cambian el estado real del evento. En vivo no se deduce de una hora programada.
- Titulo, mensaje, tamano de letra, mostrar/ocultar bloques, imagen subida o URL, logo opcional, encuadre, brillo y tres paletas.
- Texto principal, recordatorio, nombre del canal y numeracion del carrusel.
- Zona horaria explicita (Madrid por defecto), conservando el instante del evento.

Aplicar estilo y pildoras a todos conserva los titulos, mensajes e imagenes de cada evento. Los ajustes son temporales para estas imagenes y no escriben sobre el evento.

Exportaciones: historia 1080x1920, post vertical 1080x1350 y cuadrado 1080x1080. Descarga PNG de la invitacion actual o un ZIP con una por evento seleccionado. Los elementos con forma de boton son parte de la imagen exportada. Las imagenes remotas usan image-proxy; tambien se pueden subir archivos locales. El banco de exportacion renderiza una instantanea de la seleccion; las fuentes de los iconos son SVG, sin depender de Font Awesome.

## Activos y caducados

La seleccion principal incluye eventos futuros o en curso hasta startsAt + durationMinutes. Cuando no hay duracion positiva, se utiliza una ventana de una hora. Un reloj local se actualiza cada 30 segundos y al recuperar visibilidad; no consulta Firestore ni APIs.

Los caducados salen de la seleccion y no entran al ZIP. No se borran automaticamente: Revisar caducados es un apartado administrativo separado, donde se puede reprogramar con una fecha futura o eliminar con una confirmacion en la propia pagina. Una reprogramacion correcta devuelve el evento a activos. Si una escritura falla, el evento permanece en su estado anterior.

## Validacion local

- npx vitest run --exclude '**/.restore-backups/**'
- npm run build
- node scripts/visual-theme-lab.mjs, seguido de node scripts/verify-events-bulk.mjs y node scripts/verify-event-invitations.mjs

El laboratorio sustituye Firebase por datos simulados. Se verifican fallo atomico del lote, doble clic, activos/en curso/caducados, reprogramacion, borrado denegado y confirmado, 320/390/1440 px, estados de invitacion y descarga real de los tres formatos PNG y del ZIP. No se crean ni modifican eventos de produccion.

## Edicion directa sobre la invitacion

La vista previa permite seleccionar con clic/toque cada pildora, boton, texto, dato e imagen. Un contorno identifica el elemento activo y el inspector muestra sus opciones concretas: contenido, color/degradado, tamano, bordes y visibilidad segun el elemento. Tambien existe un selector para recuperar elementos ocultos y acceder al marco o logo opcional.

En escritorio el inspector queda junto al lienzo. En movil se abre como panel inferior con foco contenido, Escape/cierre y restauracion del desplazamiento. Los elementos de texto y botones admiten seleccion con teclado. El banco de exportacion utiliza editable=false: los contornos y atributos de edicion interactiva de la vista previa no aparecen en los PNG.

Verificacion adicional: node scripts/verify-invitation-inspector.mjs prueba clic real de raton, toque emulado, configuracion contextual, texto/tamano, ocultar y recuperar, teclado, panel movil, restauracion de scroll y descarga PNG. El artefacto descargado se reviso visualmente.

La vista previa actualiza su escala en requestAnimationFrame y solo ante cambios reales de ancho para evitar bucles de ResizeObserver al redimensionar. La prueba del inspector captura tambien errores de window durante la interaccion en movil.

## Buscar imagenes existentes o por juego

En el inspector de Imagen (y Logo), los controles siguen el orden URL, Subir archivo, Buscar imagen. El buscador ofrece dos fuentes con vista previa y confirmacion explicita antes de usar la imagen:

- Imagenes de la web: portadas, secciones, imagenes sociales y logos declarados en los posts. Deduplica URLs y permite buscar por titulo o nombres de juego. Lee 40 publicaciones por pagina, carga mas solo al pulsar el boton y mantiene una cache de cinco minutos separada por usuario. Actualizar biblioteca vuelve a consultar la primera pagina. La busqueda local se limita a lo cargado, indicado en el dialogo.
- Juegos / IGDB: reutiliza la funcion de servidor ya empleada por el editor de posts. Al abrir Buscar imagen, si el evento incluye game, se consulta automaticamente IGDB con nameEn o, en su ausencia, nameEs. Sin nombres de juego se abre la biblioteca web. Usa primero el nombre ingles disponible y prueba el espanol si no hay imagenes. Permite elegir juego, arte, captura o caratula. Los resultados se cachean cinco minutos y se cancelan solicitudes anteriores al volver a buscar o cerrar.

No se anaden claves al frontend. Las imagenes elegidas cambian la invitacion temporal, sin modificar el post de origen ni el evento guardado. En movil se intercambia el inspector por el buscador y se recupera al cerrar, evitando capas superpuestas de bloqueo de scroll.

Cada evento JSON puede incluir game: {nameEs: "Los Pitufos: Dreams", nameEn: "The Smurfs: Dreams"}. Basta un idioma; los JSON anteriores sin game siguen funcionando. Tambien se admiten game como texto, juego y los alias gameName/gameNameEs/gameNameEn. Los formularios manuales y los lotes conservan esos nombres en el evento para preparar futuras busquedas. Ambos ejemplos JSON estan actualizados.

Verificacion adicional: scripts/verify-event-image-search.mjs usa posts locales y un IGDB simulado, comprobando nombres, biblioteca sin duplicados, seleccion, cache, consulta automatica al abrir con nombres de juego, movil a 320 px y exportacion real con la imagen elegida. No consulta IGDB real ni publica cambios de produccion.

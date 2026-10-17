# Lector editorial de análisis

El lector editorial se aplica a análisis y noticias: portada de ancho completo y dos columnas a partir de 1200 px, con navegación por apartados y una columna de información. Los análisis añaden valoración y puntos positivos/mejorables; las noticias muestran únicamente los datos de juego y extras que tengan disponibles. El primer botón es «Análisis» o «Noticia» según la publicación. Los colores del tema se conservan y las notas no se inventan para las noticias.

En pantallas menores de 1200 px, la navegación se desliza horizontalmente y se lee primero todo el artículo, incluida su conclusión. Después aparecen la valoración, la ficha del juego y los extras. Se reutiliza la misma columna de metadatos, sin tarjetas móviles duplicadas. La ficha es desplegable. La primera pestaña, «Análisis», muestra el artículo completo para leer desplazándose. Las demás sustituyen el cuerpo por la sección elegida y su imagen, sin ejecutar desplazamientos de página; los metadatos posteriores se ocultan en este modo de lectura focalizada móvil. El índice lateral usa la misma selección. Se excluyen las secciones ocultas; no se genera un segundo botón de introducción. Las pestañas admiten flechas izquierda/derecha y las teclas Inicio/Fin.

Las columnas internas usan `minmax(0,1fr)` y los medios y navegación limitan su ancho al de la columna. En una sola columna, el artículo tiene un máximo de 860 px y los metadatos 680 px. La cola decorativa de portada crece gradualmente con `clamp`, compartiendo su longitud con el degradado. El desenfoque usa una copia enmascarada de la imagen con `filter: blur`, evitando depender de `backdrop-filter` dentro de otra máscara.

El lector mide la altura real de `.public-nav` con `ResizeObserver` y la utiliza como separación superior y posición de la barra. Así evita la franja producida por una altura fija distinta de la cabecera. La observación se desconecta al abandonar la página. Sin cabecera, utiliza el valor de respaldo del layout.

Campos opcionales nuevos, conservados al importar, editar y guardar:

- `sections[].navLabel`: nombre corto para la barra, hasta 42 caracteres. Sin este campo se usa `label` o `title`.
- `game.cover`: carátula.
- `game.developer`: desarrolladora.
- `game.genres`: lista de géneros.

Se reutilizan nombre, plataformas, fecha y nota de lanzamiento y web oficial existentes. No se rellenan datos desconocidos. Los enlaces oficiales requieren HTTP o HTTPS. La carátula se oculta si falla su carga.

La nota final sigue sobre 100. Los criterios conservan la escala original de 0 a 10 y admiten decimales; se representan como cinco estrellas doradas con relleno proporcional y el valor numérico original. Un 9/10 muestra cuatro estrellas y media; un 9,2/10 rellena el 60 % de la quinta. La tarjeta recupera el fondo, borde y acentos dorados. La valoración y ficha compartidas también se muestran en la vista previa del editor. Las instrucciones copiables del editor y el JSON de ejemplo incluyen los nuevos campos.

La portada del análisis ocupa todo el ancho disponible de la web, sin usar `100vw` ni generar desplazamiento horizontal por la barra de scroll. El contenido del hero se alinea con las columnas de lectura centradas; el cuerpo mantiene su ancho cómodo. Las comprobaciones a 320/390/768/1440 px verifican ambos bordes de la portada, las estrellas parciales y la navegación.

Validación local: `scripts/verify-editorial-reader.mjs` monta el lector y editor reales con Firebase ficticio. Comprueba portada/columnas, desbordamiento a 320/390/768/1440 px, pestañas sin cambio de posición de página, restauración del artículo completo con teclado, medición y cambio de altura de cabecera, criterios decimales, ficha desplegable y conservación de nuevos campos al guardar. No prueba persistencia ni permisos de producción. Pruebas unitarias: `articlePresentation.test.js`. No hay migración de datos ni despliegue.

## Ambiente y destacados

`GalaxyAtmosphere.vue` añade dos luces suaves y partículas con movimiento CSS a inicio, listado de noticias, comunidades y eventos. Es decorativo, no intercepta clics, reduce partículas en móvil, detiene animaciones al ocultar la pestaña y respeta la reducción de movimiento.

`FeaturedSheen.vue` aporta un reflejo holográfico al hero y a las tarjetas destacadas. Usa tonos multicolor para noticias y dorados para análisis; no mueve la composición ni bloquea controles. El botón de lectura de un análisis tiene relleno dorado. Tocar una zona no interactiva del hero abre la misma publicación que su botón; se excluyen controles, selección de texto y clics inmediatamente posteriores a un deslizamiento.

`scripts/verify-site-polish.mjs` comprueba estos comportamientos con fixtures locales y el lector de noticias normales a 320/390/768/1100/1440 px. También comprueba la presencia del ambiente en las cuatro páginas y la desactivación de movimiento decorativo con reducción de movimiento. El área de lectura reserva al menos una altura de pantalla para impedir que el navegador ajuste su scroll al cambiar a un apartado corto.

La revisión posterior eleva la densidad a 72 partículas en escritorio y 40 visibles en móvil. El holográfico combina reflejo móvil, luz prismática y textura de foil, manteniendo las variantes dorada y multicolor. La barra de apartados toma superficie, borde y colores de la etiqueta del tema web; los análisis conservan su selección dorada.

El efecto de los destacados se revisa posteriormente para eliminar la textura de rayas: ahora combina luz difusa transparente, reflejo suave y 16 pequeños destellos. Mantiene la variante dorada en análisis y no bloquea clics ni texto.

«Ver todos» de Análisis destacados abre el listado de noticias con `?category=Analisis`. La selección se deriva de la URL, se compara sin acentos y funciona también con las rutas antiguas `/categoria/...`, recarga y navegación Atrás. El encabezado y los filtros permanecen montados durante las peticiones; la carga inicial se representa dentro del área de tarjetas. Las categorías comparten la caché del mismo feed público, y se reutiliza la colección completa de inicio cuando aún está fresca. Cambiar entre categorías ya cargadas no repite la consulta de publicaciones; si faltan resultados se amplía la página en segundo plano.

`scripts/verify-category-navigation.mjs` verifica una respuesta retrasada, selección antes de recibir datos, filtros sucesivos sin consultas repetidas ni reemplazo de cabecera, Atrás, «Ver todos», enlaces con acentos y ajuste de tarjetas/filtros a 320/390/768/1440 px.

`ReaderLoadingShell.vue` sustituye el esqueleto antiguo y sus estilos. Reserva una portada completa de 540 px (640 px en móvil) seguida de navegación y columnas del lector, con una sola columna por debajo de 1200 px. Usa tonos neutros mientras no se conozcan los datos, sin mostrar el tema de otra publicación, y respeta la reducción de movimiento. `scripts/verify-hologram-loader.mjs` comprueba la carga con respuestas retrasadas, densidad de partículas y colores Kirby/Zelda/Análisis a 320/390/1100/1440 px.


## Carrusel principal con profundidad

El Inicio utiliza `HomeHeroDeck.vue`: una noticia principal y hasta tres secundarias distintas en escritorio. Conserva los seis pines, sus temas publicados, lectura directa, selector de barritas, teclado y deslizamiento. En móvil muestra la principal y parte de la siguiente; no se aplican giros 3D ni animación del borde. La rotación se pausa con foco, al interactuar, al ocultar la pestaña y con movimiento reducido. El antiguo `HomeNewsHero.vue` permanece como componente independiente de referencia. La verificación es `scripts/verify-home-hero-deck.mjs`.

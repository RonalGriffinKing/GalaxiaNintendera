# Animar publicación

Disponible en los generadores de publicaciones y de invitaciones de eventos mediante **Animar publicación**. Anima la diapositiva seleccionada con el preset **Cinemática suave**, de 8 segundos a 30 fps, sin audio.

Los siete efectos y el ciclo suave están activos inicialmente y se pueden desactivar por separado: reflejo holográfico, entrada del título, pulso con resplandor difuminado de la píldora , brillo del botón , partículas ascendentes, estrellas pequeñas y movimiento leve de la hora. Un elemento oculto en el diseño no se añade al vídeo. La previsualización permite reproducir, pausar y recorrer la línea de tiempo. Con «Ciclo suave», se repite automáticamente. El título se retira suavemente durante los últimos 0,85 segundos y el resto de efectos enlazan con su estado inicial; las partículas usan fases deterministas y se desvanecen al reaparecer. Los fotogramas de los instantes 0 y 8 coinciden. El archivo exportado sigue siendo de 8 segundos: su repetición depende del reproductor o plataforma, no de una instrucción dentro del MP4. Con movimiento reducido, empieza pausada.

El editor original conserva sus capas y valores. El modo de animación trabaja sobre una copia temporal; cerrar y volver a abrir incorpora los últimos cambios del editor. PNG y ZIP mantienen su ruta de exportación habitual.

## Exportación real

- **MP4 (predeterminado):** H.264 mediante WebCodecs y Mediabunny, 240 fotogramas con marcas de tiempo explícitas, resolución original y contenedor MP4 con fast start. Sin subida a un servidor ni clave adicional. Se comprueba soporte del codificador antes de empezar; si falta, se indica que se pruebe Chrome/Edge actualizado o WebM. No se renombra WebM a MP4.
- **WebM:** captura del canvas mediante MediaRecorder (VP9, VP8 o WebM según soporte), durante 8 segundos reales. Requiere mantener visible la pestaña; ocultarla interrumpe la grabación con un mensaje para reintentar.

Ambas rutas usan el mismo compositor de capas y la misma secuencia que la previsualización. Las capas se rasterizan una vez por sesión de animación y se componen en cada fotograma. Cancelar cierra la exportación y libera recursos. Las imágenes remotas deben poder cargarse mediante las URL/proxy del editor.

## Verificación local

`npx vitest run src/services/publicationAnimation.test.js`

Con el laboratorio aislado `node scripts/visual-theme-lab.mjs`, ejecutar `node scripts/verify-publication-animation.mjs`. Comprueba capas separadas, contenido visual, fotogramas distintos, codificación y descarga MP4/WebM, metadatos MP4 de 8 segundos a 1080×1920, móvil a 320 px y conservación del diseño estático.

El resplandor de la píldora conserva los colores del diseño y se prepara una vez por captura. La hora se desplaza como máximo 3 píxeles en cada dirección a resolución original. Las partículas y estrellas usan pequeños sprites de brillo reutilizables para evitar filtros de blur costosos en cada fotograma. Todos estos efectos aparecen tanto en la vista previa como en el vídeo exportado.

En invitaciones puedes arrastrar las capas en escritorio y móvil. El imán muestra guías al acercar su centro al centro del lienzo. El inspector ofrece centrado horizontal/vertical, coordenadas y restablecer posición; las flechas del teclado mueven 2 px (Mayús: 10 px). Las posiciones se guardan por formato en las opciones del editor y se aplican a PNG y vídeo. Los títulos ya no se recortan por un máximo de líneas y reducen su tamaño si el espacio disponible lo requiere.

## Para TikTok

El botón Para TikTok activa una composición de historia 1080×1920 con margen adicional a la derecha y una zona central libre para la tarjeta LIVE nativa. La guía de colocación solo aparece en el editor y se elimina de PNG y de las capas del vídeo. El espacio se puede escalar del 85 al 120 % y su altura se puede ajustar entre el 60 y el 68 % del lienzo, recolocando título y extras alrededor. El tamaño real de la tarjeta se ajusta dentro de TikTok; esta herramienta no controla su interfaz. La posición de referencia parte de la captura proporcionada y es ajustable, sin asumir que la interfaz sea idéntica en todos los dispositivos. Las posiciones manuales del modo TikTok se mantienen separadas de las del diseño normal y se pueden centrar tanto desde el inspector de escritorio como desde el de móvil.

## Distribución del editor

En escritorio se separan Documento (izquierda), lienzo (centro) y propiedades de capa (derecha). En tablet Documento pasa a una barra superior; en móvil las propiedades se abren en una hoja contextual. El selector de capas agrupa textos/datos, botones e imágenes, y dispone de accesos a Título, Hora, Imagen y Píldora. Las pestañas Diseño y Posición muestran controles separados. El carrusel se selecciona desde un panel plegable y la vista previa se ajusta a la pantalla, con ampliación opcional. Esto solo cambia la interfaz de trabajo; no modifica la composición exportada.

## Capas y fondo

La pestaña Capas muestra qué capas están visibles, apagadas o sin imagen, y permite recuperarlas con el botón del ojo. Al activar TikTok se ocultan hora, fecha, duración, descripción, tipo, botones y número de imagen; permanecen fondo, título, píldora En vivo y logo/nombre del canal. La referencia de registro queda fija, con flecha y luces turquesa/rosa. Su halo y flecha tienen movimiento suave en el vídeo. Desactivar TikTok restaura el estado anterior de las capas del diseño normal.

En Fondo → Editar puedes elegir Llenar el fondo o Ver imagen completa, acercar/alejar del 40 al 200 %, cambiar el encuadre horizontal y vertical o restablecerlo. El zoom conserva la proporción de la imagen original y no cambia las otras capas; se aplica a PNG y vídeo.

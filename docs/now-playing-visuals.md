# Apariencia y animaciones de «Hoy jugamos»

En las propiedades del widget, **Apariencia → Probar Esmeralda + Trifuerza mágica** aplica una combinación de ejemplo y reproduce el ciclo con los datos disponibles. No guarda automáticamente el overlay ni consulta otra vez las plataformas.

Los estilos son independientes de **Carátula lateral / Imagen de fondo**:

- Original conserva Galaxia, Minimalista, Halloween y Zelda del widget anterior.
- Esmeralda de Hyrule, Cristal de Hyrule y Holográfico usan colores y adornos SVG propios, sin imágenes decorativas externas.
- Personalizado permite elegir los dos colores, opacidad, desenfoque, redondeo y borde.

**Efectos** contiene el brillo, partículas, reflejos, intensidad y velocidad. La vuelta de la luz se mide en segundos: un valor mayor es más lento. Los efectos quedan dentro del tamaño del widget salvo que se active «Permitir efectos fuera del área del widget».

**Animación** permite elegir entrada y salida por separado. Trifuerza mágica muestra el símbolo, un aro de partículas y un resplandor suave antes de desplegar el panel y sus textos. La salida oculta el contenido y contrae el panel hacia la Trifuerza. Cristal mágico revela primero el panel y luego su contenido.

**Comportamiento** mantiene la duración visible y la frecuencia. El tiempo visible comienza al terminar la entrada. Si el ciclo configurado es demasiado corto, la repetición espera a que terminen permanencia y salida, más un segundo de margen. Las animaciones pueden desactivarse sin apagar el widget.

«Previsualizar animación» reinicia entrada, permanencia y salida incluso si el widget ya estaba visible. No actualiza eventos, imágenes ni estadísticas. «Actualizar juego» conserva su función independiente.

## Compatibilidad y guardado

Las opciones siguen en `widget.data` y se guardan con el botón **Guardar** del editor. La fuente OBS conserva el mismo enlace y recibe las opciones mediante la suscripción existente a Firestore. No se necesitan migraciones ni cambios en otros widgets.

Los overlays sin campos nuevos se normalizan a `appearance: original`, entrada clásica y salida clásica. Se conservan ancho, alto, escala, posición, encuadre, fuentes de datos y controles de interacción. Activar un tema nuevo no modifica esos valores.

El movimiento reducido desactiva entradas, salidas y movimientos decorativos. El widget mantiene su contenido y sus intervalos. Ocultarlo mediante «Interactuar» en OBS suspende las apariciones hasta que se vuelva a pulsar.

## Comprobación

Las pruebas cubren valores antiguos, saneamiento de ajustes, todas las combinaciones de estilo/borde, persistencia JSON, intervalos sin solapamientos, previsualización sin consultas adicionales, ocultación manual y limpieza de temporizadores. El componente del editor y la fuente OBS es el mismo `NowPlayingWidget.vue`.

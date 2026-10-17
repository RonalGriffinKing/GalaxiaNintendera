# Post completo y carrusel social — contrato v2

Estas instrucciones se pueden copiar al chat/GPT que redacta el JSON. La web importa el resultado; no se ha conectado un servicio de generación automática ni se ha modificado el GPT externo.

## Instrucciones para el generador

Genera un único JSON válido, sin comentarios ni bloques Markdown. Conserva el artículo completo en `title`, `subtitle`, `summary`, `image`, `category`, `categories` y `sections`. No reduzcas el artículo para hacerlo caber en las imágenes. Respeta también los campos de ficha del juego y análisis que se hayan solicitado; este cambio no los sustituye.

## Hero de Inicio

Incluye el objeto raíz opcional `hero` para la presentación de Inicio. Es independiente de `social`: no sustituye el carrusel ni cambia la portada del artículo.

- `hero.image`: URL directa de una imagen horizontal, preferiblemente sin títulos ni logos incrustados. Si no se proporciona, usa `""`; la web recurrirá a `image` del artículo.
- `hero.logoUrl`: URL directa del logo del juego, preferiblemente PNG o WebP transparente. Usa `""` si no se proporciona; no inventes logos ni direcciones.
- `hero.position`: `"center top"` por defecto; también admite `"center center"`, `"center bottom"`, `"left top"` o `"right top"` para proteger el sujeto principal al recortar la imagen.
- `hero.images`: galería adicional de imágenes reales proporcionadas para la noticia. Cada entrada tiene `url`, `alt` (descripción breve) y `position` con los mismos valores anteriores. No repitas imágenes. Usa `[]` cuando no haya URLs disponibles. La portada se incluye automáticamente como primera miniatura.

Solicita al usuario las URLs que falten o entrega esos campos vacíos. Si `hero.images` está vacío, la web recupera las miniaturas de las imágenes distintas del resumen y de las secciones visibles del post. Si solo existe una imagen, no inventa otras miniaturas. No reutilices automáticamente una portada vertical con un título enorme incrustado como si fuera una imagen horizontal limpia. La web sigue funcionando con posts antiguos sin `hero`.

Dentro de `social`, prepara una versión editorial propia para redes, no una copia de cada párrafo del artículo:

- `schemaVersion`: `2`.
- `title`: titular de la portada; directo, fiel a la noticia, preferiblemente entre 8 y 14 palabras.
- `titleHighlights`: array con una o dos frases **copiadas literalmente de `social.title`**, con las mismas mayúsculas, tildes y espacios. Selecciona el concepto o novedad central; el generador de imágenes lo pinta en dorado. No uses HTML, Markdown, nombres de clases ni etiquetas de color. Puede ser `[]` si no aporta claridad.
- `eyebrow`: etiqueta breve de tema o contexto, escrita completamente EN MAYÚSCULAS en el JSON, como `ZELDA: OCARINA OF TIME` o `BOSQUE KOKIRI`.
- `accent`: `"violet"` o `"gold"`; decide el color de la etiqueta. Los destacados del título son dorados por defecto y se pueden editar en la web.
- `summary`: apoyo corto a la portada, unas 18–30 palabras. No repitas el titular.
- `image`: URL de imagen si se dispone de ella; si no, `""`. No inventes direcciones.
- `slides`: solo las imágenes posteriores. **La portada se genera desde los campos de `social`: no la repitas en `slides`.**

Cada entrada de `social.slides` contiene:

- `type`: `"content"` para un desarrollo o `"closing"` para la imagen de cierre.
- `eyebrow`, `accent`, `title`, `titleHighlights` e `image`, con las mismas reglas que la portada. Los destacados deben pertenecer al título de esa entrada, no al título del artículo.
- `content`: subtítulo o explicación breve, preferiblemente entre 18 y 30 palabras.
- `points`: tres o cuatro puntos útiles y concretos, preferiblemente entre 6 y 14 palabras cada uno. Evita repetir `content`. Si una idea no necesita puntos, usa `[]`. Estos tamaños son recomendaciones de legibilidad, no límites que permitan borrar contenido.
- `sectionIndexes`: índices desde cero de las secciones del artículo que respaldan la imagen. Nunca referencies una sección inexistente.
- `cta`: normalmente `""`; en el cierre, una invitación breve y natural a comentar.

Termina preferiblemente con una sola entrada `type: "closing"`: un título en forma de pregunta y, si resulta útil, opciones breves en `points`. Es una invitación visual, no una encuesta interactiva. No añadas un resumen repetido como una segunda conclusión.

Elige el número de imágenes según el contenido. Divide ideas si hay demasiado texto; no fuerces siete imágenes ni rellenes páginas. La marca, los segmentos de progreso y el contador se generan automáticamente: no los escribas en los títulos ni en `points`. No añadas «Parte 1», «Parte 2» como etiquetas si hay una etiqueta temática más útil.

No inventes hechos, anuncios, fechas, citas, fuentes ni características de juegos. Distingue confirmaciones de rumores y conserva ese matiz en las frases destacadas. No exageres una frase solo para colorearla.

## Capitalización, signos y énfasis

Entrega todos los titulares sociales con capitalización editorial: mayúscula inicial, nombres propios correctos y el resto en minúsculas cuando corresponda. Usa `¡…!` en afirmaciones o noticias expresivas que lo justifiquen y `¿…?` en preguntas, siempre con apertura y cierre. No conviertas rumores en afirmaciones ni añadas exclamaciones a todos los textos por sistema. Estas reglas se aplican a la portada y a cada entrada de `slides`; no obligan a cambiar el titular del artículo completo.

Reserva `titleHighlights` para las palabras que contienen la revelación principal. Copia la frase exacta del titular, pero deja fuera los signos de apertura y cierre: así permanecen en el color base y solo la frase recibe énfasis. El renderizador conserva el texto recibido; no añade signos ni corrige mayúsculas automáticamente.

## Ejemplo estructural (texto ficticio, no publicable)

Archivo importable: [post-completo-social-v2.example.json](../examples/post-completo-social-v2.example.json).

Una frase se representa así:

```json
{
  "title": "¡Pequeños cambios que marcan la diferencia!",
  "titleHighlights": ["marcan la diferencia"]
}
```

El título sigue siendo texto completo. `titleHighlights` solo indica qué fragmento resaltar. Si una frase deja de existir al editar el título, no se colorea ni se añade otra vez; se puede corregir desde las herramientas del título.

## Compatibilidad y revisión

Para navegar por el análisis, cada entrada de `sections` puede incluir `navLabel`: una etiqueta corta de hasta 42 caracteres, por ejemplo «Historia», «Jugabilidad» o «Gráficos». El título completo sigue en `title`. Solo incluye apartados que existan; no rellenes categorías por obligación. Si falta `navLabel`, el lector utiliza `label` o el título existente. Las secciones con `hidden: true` no se muestran ni aparecen en el índice público.

La ficha opcional `game` admite `nameEs`, `nameEn`, `platforms`, `releaseDate`, `releaseNote`, `officialUrl` y, para la presentación editorial, `cover` (URL de la carátula), `developer` (estudio) y `genres` (lista de géneros). Usa únicamente información verificada; deja vacíos los datos desconocidos. Las plataformas pueden ser cadenas o entradas `{ "name": "Nintendo Switch 2", "confirmed": true }`; conserva las pendientes como `confirmed: false`.

En análisis, cada `analysis.criteria[].score` representa de 0 a 10 estrellas. Usa enteros para nuevas valoraciones: 7 significa siete estrellas, no 70. Los decimales antiguos se conservan al importar, aunque el selector permite elegir estrellas enteras. `analysis.score` es la media de los criterios multiplicada por 10 y redondeada, sobre 100; el editor y el lector la recalculan a partir de los criterios. No conviertas los criterios a porcentajes dentro del JSON. `analysis.hypeTitle` puede contener un veredicto breve. `analysis.pros` y `analysis.cons` son listas de puntos positivos y aspectos mejorables. Consulta `examples/post-analisis-estrellas.example.json` para un ejemplo completo ficticio con artículo y versión social.

Los posts anteriores sin estos campos siguen cargando. Las entradas antiguas se interpretan como contenido normal; no se inventa un cierre ni se deducen palabras destacadas a partir de hechos no proporcionados. El importador y el guardado conservan los campos nuevos y no recortan los puntos a cuatro.

Antes de publicar, revisa el artículo, las imágenes, las referencias de secciones y las frases destacadas. La previsualización avisa si el texto invade la cabecera o supera las líneas visibles. Usa «Ajustar textos al espacio» o divide el contenido. Comprueba el PNG exportado en el formato elegido (9:16, 3:4 o 1:1).

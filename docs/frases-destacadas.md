# Frases destacadas del artículo

Añade `highlightQuote` dentro de una entrada de `sections`, al mismo nivel que `title`, `image` y `content`. Es opcional, admite texto plano de hasta 280 caracteres y aparece después del contenido de esa sección. No altera los destacados del título ni las imágenes sociales.

```json
{
  "label": "5,2 millones",
  "title": "Ocarina of Time vuelve a hacer historia",
  "image": "",
  "content": "Aquí va el contenido de la sección.",
  "highlightQuote": "El Héroe del Tiempo ha regresado por todo lo alto.",
  "hidden": false
}
```

Instrucción para el generador del JSON:

> Incluye el campo opcional `highlightQuote` dentro de las secciones que contengan una idea especialmente relevante. Genera al menos una frase destacada por artículo, breve, de una sola oración y hasta 280 caracteres, basada exclusivamente en el contenido de la noticia. Usa texto plano, sin HTML ni Markdown. No inventes citas ni atribuciones. No incluyas colores: la web aplica automáticamente el tema visual del post. Evita repetir el mismo destacado en varias secciones.

Puedes editar el campo «Frase destacada (opcional)» de cada sección en el editor y comprobarlo en su vista previa.

> Actualización de publicación: la biblioteca continúa siendo local, pero el editor guarda `visualThemeSnapshot` validado junto a `visualThemeId` dentro de cada post. El lector, la home, el listado y el generador social usan esa copia sin necesitar la biblioteca del navegador. Las publicaciones anteriores necesitan guardarse una vez desde el navegador que conserva el tema. En el editor prevalecen las modificaciones locales; fuera de él prevalece la versión publicada. No se crea una colección global de temas.

# Temas Visuales — implementación y prueba local

Estado: piloto local, sin commits, despliegues ni escrituras de prueba en Firebase. La biblioteca se guarda en el navegador y no se sincroniza entre dispositivos. No está preparada todavía para publicar temas globales en producción.

## Inspección de la arquitectura existente

- `DashboardPage.vue` aloja el Gestor Global; `PostPanel.vue` conserva la lista de publicaciones y sus roles existentes `admin`/`publisher`. Temas Visuales es una pestaña del mismo gestor (`/admin/dashboard?view=themes`), visible solo para administradores. `VisualThemesPanel.vue` integra el gestor de temas, sus eventos de carga y la comprobación del uso en posts. El antiguo acceso `/admin/posts?section=themes` redirige a esa pestaña.
- `PostEditorPage.vue` sigue siendo la página protegida de creación/edición. Se reutiliza `PostEditor.vue`, su selector de categorías, importador JSON y flujo actual de guardado. El post se guarda en `posts` mediante `addDoc`, `updateDoc` o el batch existente de pineados. No se han migrado ni reescrito documentos.
- El JSON real conserva `title`, `subtitle`, `summary` (normalizado a `content`), `image`, `hero`, `categories`, `sections`, `social`, `game`, `analysis`, puntuación y opciones editoriales/SEO. `social` conserva su esquema 2, portada y diapositivas con `titleHighlights`, `points`, `sectionIndexes`, acento y CTA. La única referencia nueva de apariencia es `visualThemeId`. El importador también conserva el `titleHighlights` superior opcional para el titular web.
- `socialContent.js` normaliza los resaltados y `titleRuns()` busca expresiones exactas, preservando texto, signos y mayúsculas. Se reutiliza, sin almacenar colores en las expresiones. Las expresiones no coincidentes se ignoran.
- `PostSharePage.vue` sigue generando las tarjetas reales, con el mismo formato vertical 1080 × 1920, disposiciones alternativas, inspector, ajustes globales/por diapositiva, historial, tipografías y exportación `html-to-image`/JSZip. El tema solo introduce valores de color, degradado y efecto permitido.
- `PostCinematicHero.vue` es compartido por editor y artículo. Sus etiquetas, botones, destacados y bordes toman el tema. Tras la revisión visual también se conecta `HomeNewsHero.vue` y se aplica el fondo del tema a `PostPage.vue`, con degradados y superficies oscuras para lectura. El fondo general de la home, sus tarjetas, navegación y tipografías permanecen iguales.
- Las categorías siguen en `siteSettings/postCategories`, gestionadas por `postCategories.js`. Los temas no dependen de ellas.
- Los colores originales se encontraban en los ajustes y CSS de `PostSharePage.vue`, `PostCinematicHero.vue` y los estilos generales. Galaxia General devuelve cero sustituciones mientras conserva la configuración inicial; mantiene incluso las etiquetas doradas específicas de las diapositivas originales.
- Las reglas disponibles en `security/firestore/firestore.proposed.rules` son propuestas, no evidencia de las reglas desplegadas. No autorizan una colección global nueva de temas. No se ha añadido una colección ni modificado ninguna regla. La persistencia remota queda pendiente de verificación y autorización.

## Archivos y componentes

Nuevos:

- `src/services/visualThemes.js`: temas iniciales, validación, resolución con fallback, tokens seguros, biblioteca local, historial y protección de eliminación.
- `src/services/visualThemePng.js`: metadatos PNG iTXt sin modificar sus píxeles.
- `src/composables/useVisualThemes.js`: lectura reactiva y cambios entre pestañas del mismo origen.
- `src/components/posts/VisualThemeManager.vue`: crear, editar, duplicar, archivar/reactivar, importar/exportar, restaurar y eliminar sin uso.
- `src/components/posts/VisualThemesPanel.vue`: módulo integrado en el Gestor Global, con una única cabecera y acción Crear tema.
- `src/components/posts/VisualThemeSelector.vue`: selector manual con colores y muestra.
- `src/components/posts/VisualThemePreview.vue`: muestra ilustrativa de colores, titular, etiqueta y lista. El laboratorio permite comprobar el renderizador real además de esta muestra.
- `scripts/visual-theme-lab.mjs`: laboratorio aislado con componentes reales y Firebase sustituido.
- `scripts/verify-visual-themes.mjs`: comprobación de integración en Edge sin interfaz gráfica.
- `src/services/visualThemes.test.js` y `visualThemePng.test.js`: pruebas del contrato y metadatos.
- `examples/visual-theme-kirby.v1.json`: JSON completo para probar importaciones.

Modificados: `DashboardPage.vue`, `router/index.js`, `PostEditor.vue`, `PostCinematicHero.vue`, `HomeNewsHero.vue`, `PostPage.vue` y `PostSharePage.vue`. Se han reutilizado el gestor global, el editor, los heroes, el generador, el inspector, las funciones de resaltado y las herramientas de exportación existentes. No hay un acceso duplicado dentro de la lista de posts ni otra cabecera de navegación para temas.

## Crear, importar y asignar

En **Gestor Global → Temas Visuales**, crea un tema o duplica uno existente. Edita su JSON o los campos de color, revisa la muestra y pulsa **Guardar tema**. Las modificaciones aumentan su versión. El identificador permanece estable; duplicar genera uno nuevo. Importar un archivo valida primero, muestra el borrador y requiere guardar explícitamente. Importar un ID existente actualiza ese tema al guardar.

La biblioteca incluye Galaxia General, Kirby Dreamland, Zelda Hyrule, Mario Kingdom, Nintendo News, Análisis Épico y Petit Planet. No hay condiciones de saga en los componentes.

El esquema 1 admite únicamente `schemaVersion`, `id`, `name`, `version`, `archived` y `config`. `config` tiene grupos `general`, `social` y `web`; consulta el ejemplo completo para sus campos. Rechaza claves desconocidas, colores ajenos a `#RRGGBB`/`#RRGGBBAA`, números fuera de rango, efectos no permitidos y versiones incompatibles. Los efectos permitidos son `none` y `soft-glow`. No acepta CSS, HTML ni JavaScript. Comprueba contraste de texto/etiquetas/números/botones, incluyendo transparencia; las imágenes concretas deben revisarse visualmente porque su contraste varía.

En el editor, selecciona **Tema visual**. Se guarda solo esta referencia, por ejemplo:

```json
{
  "visualThemeId": "kirby-dreamland",
  "titleHighlights": ["más secretos"]
}
```

El resto del JSON no cambia. `titleHighlights` superior afecta al título web; `social.titleHighlights` y `social.slides[].titleHighlights` siguen afectando a sus propios títulos del carrusel. El contenido decide qué se resalta y el tema decide su color. No hay asignación automática por categorías.

Los posts antiguos sin referencia mantienen el diseño anterior. Temas ausentes, archivados, corruptos o no disponibles usan Galaxia General sin bloquear la lectura ni la exportación. Una biblioteca ilegible no se sobrescribe automáticamente.

Los interruptores **Aplicar en artículos web** y **Aplicar en generador social** son independientes y, en este piloto, locales al navegador/origen.

## Persistencia y seguridad del piloto

La biblioteca vive en `localStorage`, clave `galaxia-visual-themes-v1`. Antes de sobrescribirla se conservan hasta cinco versiones previas en la clave con sufijo `-history`. Las integraciones usan `galaxia-visual-theme-integrations`. No se toca ninguna configuración previa del generador.

La interfaz y las funciones de escritura exigen rol `admin`. Esto protege el flujo de la aplicación; el almacenamiento del navegador no sustituye autorización del servidor ni debe tratarse como un repositorio global confiable. No se ha implementado un adaptador Firebase sin reglas verificadas.

Se bloquea el borrado de Galaxia General, temas referenciados por posts y cualquier borrado cuyo uso no se haya podido comprobar. Archivar permite conservar la referencia y obtener fallback seguro. En el gestor real, el uso se calcula sobre la lista completa cargada de posts, no sobre la página de siete elementos.

En la aplicación normal, guardar un post sigue utilizando el flujo Firebase existente. **Para probar esta entrega sin modificar datos reales, usa únicamente el laboratorio de abajo.** No guardes posts ficticios con `npm run dev` conectado a tu proyecto real.

## Exportación

El ZIP incluye sus PNG habituales y `visual-theme.json`: ID solicitado, tema aplicado, versión, instantánea validada, formato, estilo y estado del editor. La función de PNG individual incorpora la misma información como metadatos UTF-8 iTXt. Los píxeles no se repintan al añadir metadatos; no se cambian imágenes ya exportadas.

La instantánea permite recuperar los colores aunque el tema cambie después. Para recuperar un tema desde un manifiesto, importa únicamente su objeto `snapshot` en el gestor. El estado `design` conserva los ajustes usados; no se ha añadido un importador automático de toda la sesión de exportación ni una copia de los artículos/imágenes originales.

## Prueba visual segura

Desde la raíz del proyecto:

```powershell
node scripts/visual-theme-lab.mjs
```

Abre `http://127.0.0.1:5225/manager` y pulsa Temas Visuales en la fila superior del Gestor Global. La ruta `/themes` del laboratorio queda solo como muestra aislada del componente para las pruebas. El puerto está ligado a `127.0.0.1`. El laboratorio no importa la configuración real de Firebase, sustituye las operaciones por fixtures y bloquea servicios externos. Los datos de prueba se guardan en ese origen, separado de la web pública y del servidor habitual.

1. Duplica Kirby o importa `examples/visual-theme-kirby.v1.json` y cambia un color manteniendo contraste.
2. Abre **Editor**, elige el tema y guarda. Solo se modifica el post ficticio local.
3. Abre **Artículo** y comprueba sus acentos; cambia a Zelda.
   También puedes abrir **Hero home** para comprobar el componente de portada y **Noticia completa** para revisar el fondo y las superficies del lector real con el post ficticio.
4. Abre **Carrusel**: revisa las tres diapositivas, el inspector y descarga el ZIP.
5. Abre **Comparar generador anterior**: carga el componente de referencia del commit `b88154d`, con la misma publicación y recursos de prueba.
6. Prueba a 360, 768 y 1440 px; revisa especialmente titulares largos y la muestra de colores.

La ilustración SVG es solo un fixture servido en memoria; no se han duplicado ni sustituido archivos de imágenes del proyecto. El laboratorio omite las fuentes externas; las comparaciones usan las mismas fuentes disponibles para ambas versiones.

Con el laboratorio abierto, ejecuta:

```powershell
node scripts/verify-visual-themes.mjs
npx vitest run --exclude '**/.restore-backups/**'
npm run build
```

La verificación de navegador usa Microsoft Edge en Windows; se puede indicar otra ruta compatible mediante `EDGE_PATH`. No utiliza una sesión personal del navegador. Los PNG de comparación se escriben en TEMP. Las pruebas de integración sustituyen Firebase, incluida la creación/edición de posts. No validan reglas de producción.

## Pendiente antes de producción

Resultados de esta entrega: compilación correcta, 61 pruebas unitarias aprobadas y verificación de integración en Edge aprobada. Se comprobaron creación/duplicación, importación/exportación JSON, edición y recuperación local, archivado, borrado seguro, selección y guardado del ID desde el editor ficticio, acentos del hero web, cambio Kirby/Zelda, independencia de integraciones, edición manual posterior y generación real de un ZIP con tres PNG y manifiesto. No hubo peticiones a Firebase ni excepciones de ejecución en esa prueba.

Revisión posterior: se elimina el resumen visual público de la home y del lector, incluidos `PostSummaryViewer.vue`, sus eventos, estado, pausas del hero y ensamblador de diapositivas público. Las funciones que siguen usando las tarjetas y la galería se conservan en `socialPostPresentation.js`, sustituyendo `socialSummary.js`. No se borran los datos `social` ni se cambia el generador privado de imágenes para TikTok. Los botones del lector se comprueban sin recortes y alineados a 320, 360, 390, 414 y 768 px; la exportación y comparación de píxeles del generador siguen pasando.

Los píxeles de las tres diapositivas del fixture con Galaxia General y formato editorial vertical coinciden con el generador del commit `b88154d`. La comparación usa fuentes locales equivalentes y un recurso de prueba común; no demuestra equivalencia de todas las combinaciones de tipografías/formatos/configuraciones guardadas. Gestor y generador se comprobaron sin desbordamiento horizontal a 360, 768 y 1440 px. Los metadatos del PNG tienen pruebas que verifican la conservación de los bloques de imagen y la instantánea UTF-8.

- Verificar las reglas desplegadas y diseñar/autorizar la persistencia global con lectura pública y escritura administrativa del servidor; no relajar reglas existentes.
- Sincronizar temas entre dispositivos. Mientras tanto, otro navegador sin la biblioteca local verá el diseño predeterminado.
- Verificar permisos reales y persistencia con un emulador/proyecto de pruebas aprobado, no con datos de producción.
- Probar un móvil físico, otras familias de navegadores y fuentes/CORS reales de las imágenes utilizadas en publicaciones.
- La ruta Artículo prueba el hero compartido y Noticia completa monta el lector real con fixtures. No se han verificado interacciones reales de usuarios, comentarios y recompensas contra servicios remotos.

## Revertir

## Revisión de análisis y navegación

Los análisis conservan una paleta editorial dorada en el destacado de noticias, el hero de inicio y el lector, aunque tengan seleccionado Análisis Épico. La referencia del tema y sus colores para exportar imágenes sociales no cambian. Se corrige además una regla heredada que reducía el degradado del destacado a una franja de 4 px: ahora cubre toda la imagen y protege el contraste del texto.

El directorio de comunidades conserva sus tarjetas en memoria, agrupa consultas repetidas durante 30 segundos y mantiene el contenido anterior si falla una actualización. Eventos y el panel de comunidad muestran la última lista pública mientras sus suscripciones vuelven a conectarse; las actualizaciones en directo siguen activas. La caché de eventos excluye las listas de recordatorios y espera una respuesta actual antes de modificarlos. Los hilos aparecen al recibir su contenido sin esperar las consultas de los avatares; las respuestas atrasadas se descartan al salir del panel.

El perfil muestra su información principal antes de terminar las consultas de actividad y colección. Los permisos, saldos, favoritos e historial no se guardan en la caché de navegación; cambiar de cuenta vuelve a consultar el perfil e invalida las respuestas anteriores. Las pantallas de recompensas siguen esperando sus datos completos.

Validación: 68 pruebas unitarias y compilación correctas. `scripts/verify-analysis-gold.mjs` verifica dorados y cobertura completa del degradado a 390 y 1440 px. `scripts/verify-community-navigation.mjs` verifica el regreso a comunidades y eventos antes de sus respuestas retrasadas y la carga progresiva del perfil. `scripts/verify-public-navigation.mjs` mantiene la comprobación de home/noticias. El laboratorio usa Firebase ficticio; no sustituye una prueba de permisos reales, red móvil o dispositivo físico.

### Revertir los cambios locales

El hero ya no muestra la tira de miniaturas: alterna sus imágenes reales cada 4,5 segundos con un fundido de 800 ms y espera la decodificación de la siguiente imagen. Una sola imagen permanece fija; los errores se descartan de la galería. El cambio se pausa con foco de teclado, pestaña oculta o reducción de movimiento y limpia sus temporizadores al desmontarse. `scripts/verify-hero-auto-images.mjs` comprueba rotación, altura estable, ausencia de miniaturas, imagen única y reducción de movimiento a 390 y 1440 px.

No hay migraciones ni datos reales que revertir. Detén el laboratorio con Ctrl+C. Puedes desactivar ambas integraciones locales para comparar; los posts conservan sus referencias. Exporta los temas que quieras guardar antes de limpiar el almacenamiento del laboratorio. Los cambios de código están sin commit y se pueden revisar mediante `git diff`; la lista de archivos anterior delimita esta entrega. No se han subido cambios a `main` ni `master`.

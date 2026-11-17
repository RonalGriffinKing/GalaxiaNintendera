# Galaxia Nintendera: guía para agentes

Este repositorio publica la web de lectores. Galaxia Studio, en la carpeta hermana del escritorio y con otro repositorio Git, administra el contenido. Lee [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) para localizar el módulo antes de editarlo.

- Comprueba `src/router/index.js` y `netlify.toml` para saber qué rutas y funciones entran en el build público. El código administrativo heredado que no entra en el build puede seguir siendo dependencia de pruebas o herramientas; no lo borres solo por su nombre.
- Mantén los cambios de cada repositorio separados. Si modificas el contrato de posts, imágenes o overlays, revisa al consumidor público aquí y al productor en Studio. No copies árboles completos entre proyectos.
- Coloca reglas de datos y transformaciones en `src/services`, estado compartido en `src/composables` y estilos específicos junto al componente. Usa `src/style.css` solo para reglas globales intencionales.
- Preserva posts históricos: `section.image` es la imagen principal; `section.images` aporta hasta dos imágenes adicionales. Consulta el mapa antes de cambiar su normalización o su visualización.
- Las variables `VITE_*` son públicas. Nunca incluyas credenciales privadas en ellas ni en archivos versionados. Las funciones privilegiadas requieren validación del servidor y reglas adecuadas.
- No modifiques vacaciones ni impresora Ruzafa salvo petición explícita.
- Antes de eliminar código, comprueba rutas, importaciones estáticas y dinámicas, `import.meta.glob`, pruebas y configuración de Netlify. Si no hay certeza, conserva el archivo y anota la duda.
- Tras cambios funcionales, ejecuta la prueba dirigida, `npm test` y `npm run build`. Prueba también los scripts Node o el emulador aislado si tocas backend o reglas. Actualiza el mapa cuando cambies entradas o contratos.

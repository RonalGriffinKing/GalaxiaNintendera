# Estándar de interfaz

## Colores y componentes

Usar los tokens de `src/assets/styles/theme.css`: fondo administrativo `--admin-bg`, tarjetas `--admin-surface`, campos secundarios `--admin-surface-raised`, textos `--text-primary`, `--text-secondary` y `--text-muted`. Mantener el violeta y rosa para acciones principales. No usar blanco como fondo de los gestores.

`AppNotice.vue` es el componente común de avisos de posts, usuarios y páginas. Usar `success` para confirmaciones, `error` para fallos y `delete` para información de eliminaciones. Las confirmaciones de acciones destructivas conservan sus diálogos.

## Adaptación

- Las columnas flexibles usan `minmax(0, 1fr)` y sus hijos `min-width: 0`.
- Un editor de tres columnas debe reorganizarse antes de que los campos resulten estrechos. Posts y páginas reducen columnas hasta 1440 px y pasan a una hasta 1000 px; la interfaz móvil de posts conserva sus pasos hasta 760 px.
- En tablet, usar un desplazamiento principal del editor y contenido con altura natural. Reservar desplazamientos internos para listas acotadas.
- Las ventanas se limitan con `100dvh`, conservan cerrar y guardar accesibles y respetan las áreas seguras.
- Las vistas previas usan consultas de contenedor para adaptar el contenido al panel disponible, independientemente del ancho del navegador.
- Los títulos y tarjetas deben admitir textos largos. Evitar alturas rígidas para bloques de contenido.
- Los controles compartidos de listas aceptan variables `--control-*` para mantener la paleta del contexto.

## Orden de trabajo

1. Base compartida, inicio, límites del chat, gestores de posts/páginas/usuarios y sus editores: primera implementación en esta revisión.
2. Verificar visualmente esos flujos con una sesión administrativa, en 390×844, 768×1024, 1024×640, 1280×800 y 1920×1080. Probar tablet vertical/horizontal, textos largos, teclado, formularios, listas vacías, errores y guardar/publicar en un entorno de pruebas.
3. Extender el estándar a comunidad, perfil, eventos, notificaciones y los demás módulos administrativos; migrar sus avisos al componente común.
4. Revisar accesibilidad, imágenes y carga de módulos tras completar los flujos.

## Criterios de aceptación

El catálogo mantiene una cuadrícula estable: tocar un icono abre directamente una ventana centrada para canjearlo o usarlo. No hay panel lateral ni reducción de columnas al seleccionar. En escritorio, el perfil alinea actividad, información/logros y comunidades/directorio en tres columnas bajo la cabecera y las estadísticas; tablet pasa a dos y móvil a una.

Perfil: cabecera con identidad, saldo y próximo logro; resumen de cuatro estadísticas, colección y vitrina de logros; actividad principal y comunidades compactas. En móvil los bloques pasan a una columna. Recompensas: resumen de progreso, colección por saga y catálogo de 20 iconos por página, con filtros de saga, rareza y estado. Las rarezas son metadatos administrables; los iconos anteriores usan Normal o Épico si eran especiales. No se crean niveles ni XP ficticios.

El perfil dispone de una página de logros y recompensas con secciones Logros, Mis iconos y Canjear. Administrar aparece para el dueño administrador. Canjear añade a la colección sin equipar automáticamente; la confirmación de éxito ofrece Usar icono o Canjear otro. La animación respeta la preferencia de movimiento reducido. La simulación se activa desde Administrar: inicia con 100 estrellas ficticias, permite añadir 100 o reiniciar y no escribe canjes ni selección de iconos en Firebase. Salir o abandonar la página restaura el perfil real.

Sin desplazamiento horizontal de página ni controles esenciales cortados. El texto conserva contraste y los campos se leen sin zoom. Las tablas anchas pueden desplazarse dentro de su contenedor o convertirse en tarjetas. Éxitos y errores usan el mismo componente de avisos. La compilación debe pasar; esto no sustituye la revisión visual de cada flujo.

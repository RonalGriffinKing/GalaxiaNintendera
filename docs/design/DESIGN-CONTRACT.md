# Contrato visual propuesto · versión 1

Propuesta para aprobación antes de migrar. Mantiene la identidad espacial y el gradiente violeta/rosa. No altera componentes en esta entrega.

## Capas y precedencia

1. Primitivos de marca y escala: paleta, espacios, tamaños, tiempos.
2. Tokens semánticos por tema: texto, superficie, borde, estado, interacción.
3. Tokens de componente: button, input, card, dialog, menu, notice.
4. Componente Vue: estructura accesible y variantes.
5. Estilo local: layout de la página y excepciones documentadas.

La configuración publicada genera únicamente tokens permitidos. Los alias actuales (--font-h*, --radius-*, --admin-*, --color-panel-text) se conservan durante la migración. No introducir una segunda escala independiente. Las variables del lienzo/exportación permanecen en un namespace propio. Los temas claros se aplican en un contenedor explícito y portales/Teleport deben conservar el tema del origen.

## Tipografía

Base actual: Roboto con fallbacks del sistema. Opciones futuras: Roboto y stack de sistema; otras familias solo después de incorporar sus archivos/pesos y verificar métricas, licencia y carga. Font Awesome se reserva para iconos.

- Página/H1: clamp(28px, 4vw, 44px), peso 900, line-height 1.2.
- Sección/H2: 22px, 900, 1.25.
- Sub­sección/H3: 16px, 700 o 900 según rol, 1.3.
- Cuerpo y subtítulo: 14px, 400/500, 1.5. El subtítulo usa color secundario, no una jerarquía nueva por pantalla.
- Etiqueta/acción: 12px, 700, 1.35. Botón normal puede usar 14px si el contexto lo requiere mediante una variante común.
- Metadatos: 12px, 400/500, 1.4. Evitar 8–10px para información esencial.
- Hero editorial: excepción explícita, no se equipara automáticamente al título de administración.

Tokens: --font-family-base, --font-h1/h2/h3/body/subtitle/label/caption/button; --weight-body/label/heading; --line-heading/body; añadir --line-label y --font-scale. No escalar iconos de marca, logotipos ni tipografía exportada. Escalar tamaños de texto con rem y límites adaptativos; validar zoom 200% y textos largos antes de sustituir px.

## Espaciado y layout

Escala propuesta: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Reutiliza --space-1…6 y amplía con nombres explícitos para 32…64. Separar tokens semánticos --field-gap, --section-gap, --card-padding, --dialog-padding y --page-gutter. 2px y medidas negativas solo para ajustes justificados, no para construir la escala.

Conservar --content-max (1280px) y --public-content-max adaptativo: sus funciones son distintas. Anchos de lectura, medios y canvas necesitan roles propios. Usar min-width:0 en hijos flex/grid y overflow localizado. No reemplazar todos los anchos por un mismo contenedor.

Responsive: shell móvil actual alrededor de 860px; listas administrativas alrededor de 760px; grids por espacio disponible/container queries. No reducir todos los breakpoints a uno. Documentar por componente y probar el píxel anterior/exacto/posterior; preservar dvh, safe areas y teclado virtual.

## Geometría y elevación

- Control: --radius-control, 14px inicial.
- Card: --radius-card, 20px.
- Dialog: --radius-dialog, 26px.
- Popover/menu: --radius-popover, 14px.
- Chip: --radius-pill, 999px; avatar redondo: 50%.
- Borde normal: 1px semántico; fuerte: 2px para estados justificados; separar divisores, controles y selección.
- Sombras: --shadow-card, --shadow-popover, --shadow-dialog; valores tomados de ejemplos actuales aprobados, con versión clara/oscura. --glow de marca se conserva como efecto independiente. No convertir 296 sombras a una sola.
- Foco: --focus-ring y offset de 3px. No ocultar outline sin sustitución equivalente; contenedores input compuestos necesitan focus-within.

## Color y temas

Roles propuestos: --brand-primary/secondary; --action-bg/text/hover/active; --surface-base/card/raised/input; --text-primary/secondary/muted/on-accent; --border-default/strong; --status-success/warning/error/info con variantes surface/text/border. Mantener aliases existentes hasta completar la migración.

El gradiente de marca necesita dos extremos y estados, no solo --accent. El tema claro conserva la identidad y cambia los pares superficie/texto/borde. Nunca cambiar un fondo sin revisar el texto. Contraste objetivo: 4.5:1 texto normal, 3:1 texto grande y límites/estados de controles relevantes. Comprobar contraste real de texto sobre gradientes e imágenes; usar scrim cuando sea necesario.

## Componentes y contratos

- **BaseButton / BaseIconButton:** primary, secondary, ghost, danger; sm/md/lg 36/42/48px. Misma altura no implica misma anchura; auto por etiqueta. Para táctil, asegurar un área interactiva mínima de 44px cuando sea necesario. type por defecto button; enlace con semántica de enlace; no sustituir RouterLink por button. loading conserva anchura, aria-busy y evita activación doble sin cambiar la lógica del consumidor.
- **BaseField:** label, ayuda, error, id y aria-describedby; usa input/select/textarea nativos. Mantiene tipos, autocomplete, v-model y eventos. Variantes disabled/read-only/error. Select mantiene su comportamiento nativo.
- **BaseCard:** superficie/borde/padding y slots; no introduce hover si la tarjeta no es interactiva.
- **BaseDialog:** enfoque inicial, trap, Escape, restauración del foco, scroll-lock, título/descripcion accesibles. Separar confirmaciones, editor fullscreen y drawer mediante variantes; primero auditar los comportamientos actuales.
- **AppNotice:** reutilizar para avisos transitorios; éxito/error/info. No cambiar duraciones, autocierre ni eventos sin revisión. Considerar cola y mensajes simultáneos; alert assertive solo donde corresponda.
- **NotificationDropdown:** notificaciones persistentes, anclaje y clear/open/close actuales. No mezclar con avisos transitorios.
- **BaseBadge:** estado textual más color; neutro/success/warning/error/info; rareza de recompensas preservada.
- **ContextMenu / BasePopover:** contratos separados de menú ARIA y panel con controles; elegir semántica según contenido, teclado y anclaje.
- **ListControls / PaginationNav:** reutilizar APIs actuales; visualmente comunes, filtros y paginación propiedad del módulo.
- **TableFrame:** encabezados, scroll y superficies; no encapsular consultas ni permisos. Versión móvil puede ser cards cuando ya lo sea.
- **ContentLoading / EmptyState:** comunes para geometría/estado; GalaxyLoader sigue siendo loader de identidad.

## Reglas de interacción y acceso

Todo control necesita default, hover cuando hay puntero, focus-visible, active, disabled y loading si aplica. Los formularios añaden error/read-only; las listas loading/error/empty/success. Estados semánticos no se identifican solo por color. Reducir animaciones con prefers-reduced-motion; no eliminar información al hacerlo. Navegación completa con teclado, nombres accesibles, headings en orden y reflow a 320px. El contrato debe documentar excepciones con motivo, propietario, ámbito y revisión.

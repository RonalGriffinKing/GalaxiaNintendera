# Validación propuesta y matriz de navegador

Esta fase ejecuta el auditor y comprueba su integridad; no ejecuta la matriz visual ni publica cambios. Una compilación correcta no valida contraste, estados, foco o responsive.

## Prevención automatizada, por etapas

1. **Inventario diferencial en CI.** Comparar por propiedad/valor/selector/archivo, no solo por línea (se desplaza). Fallar inicialmente solo en nuevos duplicados exactos y nuevos estilos arbitrarios en consumidores ya migrados. El legado mantiene baseline explícito; permitir una excepción con motivo, ámbito y responsable. No bloquear progreso de datos, safe areas o lienzos.
2. **Lint de CSS/Vue.** Proponer checks para colores/tipografía/radios/espaciados literales fuera de tokens; !important nuevo; selectores duplicados; outlines eliminados; bindings inline cosméticos constantes. Permitidos valores estructurales (0, auto, inherit, 100%, 50% cuando corresponde), cálculos de layout justificados y tokens de exportación. Analizar AST, no regex destructivas. Un binding dinámico no es una infracción por defecto.
3. **Contratos de componentes.** Verificar eventos/props y comportamiento observable: botón no envía un form por accidente, loading no activa dos veces, inputs mantienen v-model, paginado emite el destino correcto, menú/dialog restauran foco y Escape, toast anuncia el mensaje sin duplicarlo. Usar Vitest disponible; no sustituir pruebas de módulo por tests que solo comprueben clases.
4. **Stories y regresión visual.** Preparar stories con todos los estados de controles, superficies, notices y listas; incluir light/dark, densidades y extremos tipográficos. Storybook tiene configuración pero no stories localizadas ni a11y estricto operativo. Resolver addons/config primero en una etapa separada. No asumir cobertura de Chromatic por estar instalado.
5. **Navegador automatizado.** Proponer runner de screenshots/E2E con datos locales o mocks y semilla estable; fijar fuentes, viewport y animaciones. Comparar diffs perceptuales con revisión humana; no aprobar cambios actualizando snapshots sin revisar. La herramienta concreta debe decidirse al preparar esa etapa, sin instalar paquetes aquí.
6. **Accesibilidad.** Checks automáticos de nombres, contraste básico, roles e ids; revisión manual de teclado, lector de pantalla, reflow y contraste sobre imagen/gradiente. Automated a11y no cubre todo. Reduced-motion, zoom 200%, modo táctil y teclado virtual.
7. **Configuración futura.** Tests de schema/rangos/allowlist, presets, fallback de versión, preview aislado, rollback, publicación concurrente y denegación de usuarios no autorizados. Solo entonces pruebas de servidor/reglas en emulador, sin usar datos reales.

## Matriz de rutas

`route-matrix.json` enumera los paths declarados por el router, incluidos redirects y rutas especiales, más las vistas internas del gestor. Cada fila incluye acceso, estados, foco de revisión y ejemplos cuando hay parámetros. Todos empiezan como **pendiente**, nunca como aprobado por compilar.

Perfiles de viewport propuestos:

- Móvil estrecho: 320×740 para reflow; móvil habitual: 390×844, táctil.
- Tablet: 768×1024; escritorio: 1440×900; escritorio amplio: 1920×1080.
- Límites del shell/listas: 759/760/761 y 859/860/861px; además breakpoint−1/exacto/+1 de cada componente modificado. 67 condiciones responsive no se sustituyen por estos dos límites.
- Altura reducida y teclado virtual en formularios/chat; safe areas y layout Android cuando aplica.

Para cada fila: tema actual y, cuando exista soporte, light/dark; visitante, usuario, publisher y admin según acceso; normal/hover/focus-visible/active/disabled/loading donde aplique, error/empty cuando el módulo los ofrece. Estados sugeridos en la matriz requieren fixtures y comprobar si son alcanzables; no se afirma que ya estén implementados.

Datos de prueba: título y etiqueta largos, español con tildes, 0/1/muchos elementos, imagen ausente, avatar propio, notificación leída/no leída, error de carga simulado, sesión ausente y rol sin permiso. No ejecutar creación/eliminación/publicación en producción para obtener capturas. No modificar inventarios o recompensas.

Pruebas por familia:

- Shell: navegación superior/inferior, menú usuario, dropdown, foco, offsets, lectura y scroll.
- Listas/gestor: botones, filtros, tabla vs cards, paginación, skeleton contenido, vacío y errores.
- Formularios/modales: validación, mensajes, tamaños, scroll, Escape/restauración foco y loading.
- Páginas editoriales: contenido largo, medios, hero y relación con tema de página.
- Comunidad/perfil: menús, composer/chat, rareza, personalización y permisos.
- Overlays/exports/impresión: prueba de no regresión de tamaño, tipografía, geometría, transparencia y salida. No adoptar tokens UI en la pieza visual.

## Registro de aceptación

Cada resultado registra ruta/vista, rol, fixture, viewport, tema, estado, revision/commit, captura, incidencias y revisión humana. Estado permitido: pendiente, aprobado, fallo o no aplicable con motivo. Un fallo de foco/contraste funcional impide cerrar el módulo. No iniciar el siguiente módulo hasta resolver o revertir la etapa actual.

## Comprobaciones realizadas aquí

- Parsing de SFC/HTML Vue y CSS completo del alcance, con cero errores.
- Regeneración determinista del inventario a igualdad de fuentes.
- Verificación de hashes y ubicaciones contra archivos existentes.
- Cobertura de paths declarados en router por route-matrix.json.
- Confirmación de que los cambios nuevos afectan solo a scripts/reportes: los cinco cambios de src son los heredados de la fase anterior.
- Informe Canvas: sintaxis TSX y transformación comprobadas con esbuild. El typecheck completo local no está disponible por ausencia de tipos React en este proyecto Vue; no se instalaron dependencias ni se verificó el render del host.

No se vuelve a compilar la aplicación porque esta fase no cambia el runtime. La compilación anterior queda como antecedente, no como evidencia visual ni como nueva comprobación de esta entrega.

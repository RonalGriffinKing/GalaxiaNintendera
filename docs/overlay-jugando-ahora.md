# Widget Jugando ahora para OBS

En el editor de overlays, añade **Jugando ahora**, configura su posición y pulsa **Guardar**. El botón **Copiar** proporciona el enlace habitual `/overlay/{usuario}_{overlay}`. En OBS se añade como fuente de navegador con la anchura y altura del lienzo (1920 × 1080 o 1080 × 1920). No requiere iniciar sesión en OBS ni copiar claves, URLs de nxapi o tokens al widget.

La tarjeta muestra portada, título y plataforma. Las horas proceden del registro de tiempo publicado para ese juego; los logros y el gamerscore proceden del resumen por juego de Xbox. No se mezclan las recompensas de Galaxia con Xbox, ni se inventan totales. Steam figura como próximamente y todavía no se consulta.

Por defecto solo se muestra cuando la fuente publica un juego actual y un estado online. Un usuario online sin juego identificado no se considera jugando. Si se habilita el último juego, se etiqueta explícitamente como **Último juego detectado**. Sin actividad, durante una incidencia o entre apariciones, OBS permanece transparente. El editor muestra un marcador para poder seleccionar y configurar el widget.

La animación aparece al recibir un juego activo o cambiar de juego/sistema, y se repite cada 180 segundos con 12 segundos visibles por defecto. Duración, intervalo, dirección, dimensiones y estilo (Galaxia/Minimalista) son configurables. **Probar animación** reinicia la presentación en la vista previa. El movimiento respeta `prefers-reduced-motion`.

La lectura de la identidad del propietario reutiliza Firebase y los adaptadores existentes. Solo se guardan ajustes del widget en el documento habitual del overlay; no se guardan credenciales ni copias de los datos gamer. Las lecturas públicas mantienen las reglas existentes y la función Xbox vuelve a comprobar la vinculación. Cada actualización lee las vinculaciones guardadas, por lo que eliminar una vinculación deja de publicarla tras la próxima actualización.

La actualización se hace cada cinco minutos en Automático/Xbox, o cada minuto con Nintendo seleccionado. Estas consultas son independientes de la animación y usan las cachés existentes. El estado no es instantáneo y depende de lo publicado por cada proveedor. La caché del servidor Xbox es por instancia; varios espectadores/fuentes pueden afectar al cupo compartido de OpenXBL. La ausencia de datos de una plataforma no impide usar otra en Automático. Los temporizadores se cancelan al quitar el widget o salir de la página.

Comprobaciones:

- `npm run build`
- `npx vitest run src/services/nowPlaying.test.js src/services/xboxIdentity.test.js src/services/xboxProfileClient.test.js src/services/nxapiPresence.test.js`
- `node scripts/overlay-lab.mjs` y `node scripts/verify-now-playing.mjs`

El laboratorio usa datos de prueba explícitos y escrituras en memoria, sin modificar Firebase. Verifica guardar, renderizar OBS, transparencia, ciclo de entrada/salida, ausencia de consultas por animación, estados offline, último juego, estadísticas de Nintendo/Xbox y tamaño compacto de 320 px.

Tipografia: controles independientes A-/A+ y deslizador para etiqueta, titulo, plataforma y estadisticas. Los tamanos se guardan en el widget. La altura efectiva aumenta si hace falta para alojar el texto; tambien se usa al alinear y arrastrar. Los overlays existentes usan los tamanos predeterminados.

Nintendo: la consola de la partida activa se toma de friend.presence.platform (1 = Switch, 2 = Switch 2), segun los tipos oficiales de nxapi: https://github.com/samuelthomas2774/nxapi/blob/main/src/api/coral-types.ts. No se deduce de la edicion del juego. totalPlayTime se conserva en minutos y el ID de la URL ec.nintendo.com/apps se normaliza al ID hexadecimal del perfil. Al combinar fuentes, el dato de presencia del mismo juego prevalece sin sumar tiempos duplicados.

Ajustes visuales adicionales: portada de 88 px por defecto con control entre 60 y 120 px, limitada en tarjetas estrechas para preservar el texto. La altura efectiva aloja la portada completa. Fondo con 14 particulas CSS discretas, desactivables y sin movimiento si se prefiere movimiento reducido. Selector manual de consola Xbox (Xbox/Series/One/PC) y Nintendo (Automatico/Switch/Switch 2). Las etiquetas manuales son configuracion del propietario, no verificacion del dispositivo por la API.

Encender/Apagar y Actualizar juego guardan el overlay y se propagan al enlace abierto de OBS. Apagar cancela sondeo y animaciones y oculta el widget; una solicitud ya en curso puede terminar pero su resultado se descarta. Se mantiene la suscripcion existente al documento del overlay para recibir el encendido. Actualizar juego descarta la cache del navegador de la plataforma seleccionada, pero respeta las caches y limites del servidor. Si una escritura falla se restaura la configuracion anterior. Estos botones guardan tambien los cambios pendientes del overlay.

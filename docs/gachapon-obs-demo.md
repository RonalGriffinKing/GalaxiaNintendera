# Gachapon: espejo OBS de solo visualizacion

1. En tu perfil administrador, abrir el gachapon y Configuracion OBS.
2. Crear espejo OBS. Reutiliza el documento de escena si ya existe; crea uno nuevo en overlays/{uid}/items solamente si falta. Se mantiene el gestor original.
3. Copiar enlace OBS y pegarlo como Fuente de navegador, 580 x 530. No hay contrasena ni inicio de sesion en OBS.
4. Con el perfil abierto, probar una apertura. Se publica solo el resultado visual (nombre, saga, rareza, imagen y color de borde), sin saldo ni datos de cuenta.
5. OBS escucha la escena con onSnapshot, reproduce la apertura y oculta el resultado a los 10 segundos. Ignora eventos antiguos de mas de 20 segundos. Queda transparente cuando esta inactivo.

OBS no permite iniciar canjes ni modificar datos. El emisor exige perfil propio administrador en la interfaz; esto no sustituye las reglas de seguridad Firestore. Las reglas publicadas abiertas siguen pendientes de asegurar. No se publicaron reglas nuevas.

El gachapon del perfil sigue siendo demo: no entrega iconos reales ni descuenta estrellas. El espejo refleja esas pruebas; no activa canjes reales. La imagen y el resultado visual del overlay son publicos como en los overlays actuales. No compartir el enlace si no deseas que otras personas vean la presentacion.

No se usa Netlify Functions, claves ni PBKDF2. Los enlaces antiguos con connection ya no funcionan; generar el nuevo enlace con owner y scene. La pantalla OBS es silenciosa.

El espejo muestra un panel galactico y botones visuales Normal/Epico; resalta la opcion elegida en la web. Los botones estan desactivados y no ejecutan canjes. Se corrigio el estilo global de parrafos que agregaba un fondo oscuro a la saga del icono. Dimensiones recomendadas: 580 x 560.

La apertura dura 3,8 segundos, con aura creciente, sonido de giro y acorde de revelacion (mas rico en epico). El espejo usa el mismo audio sintetizado. Si OBS bloquea autoplay, Interactuar > Activar sonido y configurar la salida de audio de la fuente en OBS. El audio se detiene al ocultar la pagina y se libera al desmontar; no requiere archivos externos.

El sonido de giro incluye un crescendo continuo de tono e intensidad durante 3,8 segundos, con destellos musicales progresivos; se corta al omitir o revelar para dar paso al acorde final. Comparte el mismo motor en perfil y OBS.

# Calendario de vacaciones

La función publicada utiliza la API nativa de Netlify (`Request`/`Response`) para recibir la configuración de Netlify Blobs del runtime. El adaptador de Vite conserva el controlador de eventos y su almacén de desarrollo independiente; un funcionamiento local correcto no verifica por sí solo el acceso al almacén de producción.

## Consulta de cuatro semanas juntas

El selector superior alterna entre el plan por cuatrimestres y «Mes completo». La consulta equivale a 28 días, de lunes a domingo, no a un mes natural. La vista muestra siempre los doce meses, sin pasos ni división por cuatrimestres. Se valida todo el periodo contra los bloqueos y las autorizaciones personales; no consume cuotas ni sustituye el plan habitual. Se guarda en `monthlyRequests`, separada de `bookings`, inicialmente con estado `pending`. Solo gerencia puede cambiarlo a `approved`, `rejected` o volver a `pending`; incluso una alternativa aprobada no convierte automáticamente las fechas del plan habitual, que gerencia debe coordinar.

Hay una consulta por persona y año. Reemplazarla o retirarla consume uno de los 10 cambios compartidos con el plan habitual. Reemplazarla vuelve a dejarla pendiente. Gerencia no consume cambios. El calendario de consultas muestra exclusivamente las consultas mensuales no rechazadas, y su listado muestra solo consultas mensuales. El calendario por cuatrimestres mantiene exclusivamente sus reservas habituales. Los colores y avisos de coincidencia se calculan por separado para cada modalidad.

Los trabajadores disponen de «Borrar y elegir otras fechas», con confirmación y un máximo de 10 borrados por persona, año y local. Cada periodo eliminado cuenta como un cambio (también si comprende dos semanas). El contador persiste en el servidor y no se reinicia al reservar de nuevo o recargar. Una vez eliminado el periodo, se vuelve al primer bloque pendiente para elegir fechas. La gerencia puede editar o eliminar sin límite y sin consumir los intentos del trabajador. El contador se limita al nombre seleccionado; sigue siendo identificación de confianza sin cuentas individuales.

El recorrido guiado comienza en el primer cuatrimestre pendiente al elegir el nombre. Pulsar un día selecciona su lunes y abre una confirmación flotante que mantiene el calendario visible. Guardar avanza al siguiente bloque pendiente. En mayo–agosto se seleccionan y guardan dos semanas consecutivas (14 días) en una única reserva, validando los bloqueos y ocupaciones de ambas semanas. Las reservas incorporan `weeks`; las anteriores sin ese campo siguen contando como una semana. Las cuotas personales impares permiten una semana restante; las reservas antiguas conservan su duración cuando gerencia las edita.

Ruta: `/ruzafa-impresora/vacaciones`. Los nuevos locales usan `/ruzafa-impresora/vacaciones/<identificador-aleatorio>`.

La función `netlify/functions/vacations.js` guarda los datos en Netlify Blobs, separados por local, con lecturas consistentes y escrituras condicionales para impedir que una edición concurrente sobrescriba otra. Los datos persisten entre despliegues. No requiere cambiar Firestore.

## Ejecutar y publicar

Usar `npm run dev` para probar el frontend y la función. Vite sirve el mismo controlador con almacenamiento persistente en `.netlify/vacation-dev-data` (ignorado por Git). Los datos locales no se trasladan a producción. En Netlify, la función utiliza Netlify Blobs. Publicar mediante el despliegue Netlify existente; no se ha publicado automáticamente.

Credenciales iniciales de gerencia: usuario `Ronal`, contraseña solicitada por el propietario. En Netlify se pueden establecer `VACATION_MANAGER_PASSWORD` y `VACATION_SESSION_SECRET` como variables privadas de funciones, nunca con prefijo `VITE_`. La contraseña predeterminada reside exclusivamente en el código del servidor. Las sesiones duran cuatro horas y se conservan solo en memoria del navegador.

## Funcionamiento

Al elegir el nombre se muestran únicamente los cuatro meses del primer paso pendiente. Guardar avanza al siguiente paso y desplaza la vista a su encabezado. «Ver calendario completo» permite consultar el año y «Volver a mi paso» recupera los cuatro meses. Los días ocupados se pueden tocar para consultar quién los ha solicitado. Las cuotas son enero–abril (1 semana), mayo–agosto (2 consecutivas), septiembre–diciembre (1); las semanas que cruzan de bloque se cuentan donde cae su lunes. No pueden cruzar de año. Los bloqueos iniciales son 1–15 enero, todo marzo, 16–30 noviembre y todo diciembre. Como excepción general, una semana que comienza en febrero puede terminar en marzo. Los bloqueos concretos de gerencia prevalecen sobre esa excepción.

Gerencia puede bloquear intervalos de fechas concretas y configurar autorizaciones por persona y año: intervalos permitidos y cuotas por cuatrimestre. Una autorización personal desbloquea esos días para esa persona y prevalece sobre bloqueos generales y concretos. Para autorizar un mes, se pueden dar sus fechas y aumentar la cuota; si se necesitan semanas que cruzan sus límites deben autorizarse también los días adicionales. Solo admite semanas completas. Los cambios no borran reservas existentes: deben revisarse manualmente.

Elegir un nombre es identificación de confianza, sin contraseña de empleado, tal como se solicitó. Quien tenga un enlace puede consultar ese local y elegir semanas para su personal. No hay listado público de locales. Los enlaces son privados por posesión, no cuentas de empleado. Solo gerencia puede editar/eliminar reservas, cambiar condiciones y personal o crear locales. La misma gerencia administra todos los locales.

Las solicitudes coincidentes entre personas se permiten como alternativas pendientes de coordinar: la confirmación muestra los nombres implicados y cambia a «Guardar alternativa y continuar». El servidor exige `confirmOverlap` si existe coincidencia, incluida la segunda semana, y marca la nueva solicitud con `pendingCoordination`. La vista calcula las coincidencias actuales para marcar también la solicitud previa. Las reservas propias no pueden solaparse. Gerencia reserva sus semanas seleccionando Ronal. La vista se actualiza cada 30 segundos y tiene botón de actualización manual.

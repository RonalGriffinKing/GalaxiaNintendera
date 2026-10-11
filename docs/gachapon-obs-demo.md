# OBS: configuracion sencilla de demostracion

No requiere variables ni funciones Netlify. Puede retirarse GACHAPON_OBS_KEY de Netlify; no se utiliza.

1. En el gachapon de tu perfil administrador, Configuracion OBS.
2. Escribir una clave temporal de 4 a 128 caracteres y pulsar Enter o Configurar clave.
3. Aparece Clave configurada y el enlace. Copiar enlace o seleccionar y copiar manualmente.
4. Pegar en Fuente de navegador de OBS (580 x 530). Interactuar: escribir la misma clave y Conectar.
5. Cada recarga pide la clave; no se guarda la contrasena ni el acceso en almacenamiento del navegador. El enlace conserva un verificador derivado con PBKDF2 y sal aleatoria, no la contrasena literal.
6. Restablecer limpia el formulario y permite generar otro enlace; no revoca enlaces copiados anteriormente. Caducan a las 12 horas.

IMPORTANTE: comprobacion local, solo puerta visual para una demostracion publica. Puede ser evitada manipulando el navegador o enlace; no es autenticacion ni protege datos. No autoriza canjes, estrellas, inventario ni acciones administrativas. No sincroniza con el perfil. Los canjes reales requieren validacion en servidor en otra etapa.

Se conserva sonido en el modal del perfil con interruptor. La prueba OBS es silenciosa.

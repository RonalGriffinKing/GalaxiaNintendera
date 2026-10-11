# OBS: prueba visual con clave privada

Estado: demostracion independiente, sin canjes, saldo, inventario ni sincronizacion con aperturas del perfil. El boton Probar animacion de esta pagina se puede utilizar mediante Interactuar en OBS. No esta conectado al premio real ni al catalogo remoto. Las imagenes siguen siendo recursos publicos; la clave limita la validacion de la pantalla, no convierte los recursos publicos en privados.

## Configuracion

1. En Netlify, configuracion del sitio, variables de entorno, crear GACHAPON_OBS_KEY con una clave aleatoria de al menos 32 caracteres (hasta 512). Asignar al entorno de produccion y al ambito Functions. No usar prefijo VITE_, no subirla a Git ni pegarla en el chat.
2. Desplegar esta version en Netlify para que la funcion este disponible. No se ha desplegado automaticamente.
3. Desde tu perfil de administrador, abrir el gachapon y Configuracion OBS. Introducir la misma clave, Validar y copiar enlace OBS.
4. En OBS, crear Fuente de navegador, pegar el enlace, ancho 580 y alto 530. Usar Interactuar para Probar animacion. No necesita iniciar sesion en OBS.
5. La clave se incluye en el fragmento del enlace; se envia a la funcion mediante Authorization y se retira de la barra de la pantalla al abrir. No se guarda en localStorage. OBS conserva la URL configurada: tratarla como una credencial y no compartirla.
6. Para revocar, cambiar la variable en Netlify y actualizar el enlace. Una pantalla ya validada solo conserva una demo local; no tiene permisos sobre datos.

La funcion valida un secreto privado con comparacion de hashes de tiempo constante; no lee ni escribe Firestore y no da acceso de administrador. No protege las reglas abiertas existentes. Los canjes reales y la sincronizacion requieren otra etapa segura.

Audio: el modal del perfil reproduce un acorde corto sintetizado al revelar, con interruptor de sonido. No descarga audio ni instala dependencias. La pantalla OBS es silenciosa por ahora; no promete sonido automatico porque requiere interaccion y configuracion de audio de la fuente.

La antigua simulacion de estrellas se retira. El boton Probar animacion (admin), dentro del gachapon, prueba la rareza actual con iconos locales incluso ya obtenidos sin escrituras ni saldo artificial. No sincroniza la pantalla OBS con el perfil.

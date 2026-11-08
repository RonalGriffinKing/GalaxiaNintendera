# Comentarios y reseñas de publicaciones

- Se muestran al final de cada artículo publicado. Los visitantes leen; las cuentas registradas pueden comentar y añadir una valoración opcional de 1 a 5.
- Cada comentario tiene su propio identificador. Se pueden publicar varias opiniones; reintentar una misma solicitud no la duplica. Cada autor puede editar o eliminar sus comentarios. El administrador puede eliminarlos con confirmación.
- La función `post-comments` verifica el token de Firebase y consulta el rol y el bloqueo de la cuenta en el servidor. Nunca recibe nombres, avatares ni permisos del formulario como fuente de autoridad.
- Los datos nuevos se guardan exclusivamente en `posts/{postId}/comments/{commentId}`. No se modifican documentos de noticias, estrellas o usuarios. El listado devuelve únicamente campos públicos y lee 20 comentarios por página.

## Activación pendiente de publicación

Publicar juntos el cliente y la nueva función de Netlify. Utiliza las variables privadas ya previstas: `FIREBASE_PROJECT_ID=widget-dreams` y `FIREBASE_ADMIN_SERVICE_ACCOUNT` (JSON de la credencial Admin en el entorno privado de Functions). También admite credenciales locales mediante `GOOGLE_APPLICATION_CREDENTIALS`, sin incorporarlas al repositorio.

No usar variables `VITE_*` para la credencial. La función es independiente de `PROGRESS_ENABLED`, que permanece desactivado. No requiere Storage, migraciones ni una nueva colección precargada.

Las pruebas usan un almacén en memoria y el laboratorio con Firebase simulado: no prueban la configuración real de producción ni cambian reglas activas. Si se publican reglas restrictivas en una fase posterior, esta ruta puede denegar lecturas/escrituras directas del cliente porque la función usa Admin.

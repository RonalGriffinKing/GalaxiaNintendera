# Comprobación histórica de solo lectura — 08/11/2026

Proyecto configurado: `widget-dreams`. Acceso con la sesión existente de Firebase
CLI, renovada correctamente. Solo lecturas de API y metadatos; sin exportar
documentos, descargar imágenes, modificar reglas/datos ni crear buckets.
Este documento contiene únicamente resultados agregados.

## Resultado

- 14 documentos presentan `users.email` expuesto por la regla global vigente.
  La lectura efectiva de las reglas confirma el acceso global temporal y su
  vencimiento el 15/11/2026 a las 00:00 UTC (01:00 Madrid).
- 0 incidencias de correo o campos privados conocidos en la proyección pública
  de los 16 perfiles existentes, usando la función local preparada.
- 0 incidencias detectadas en los campos revisados de nombres, avatares,
  comentarios, relaciones, miembros y referencias de imágenes.
- Cobertura: 16 usuarios; 5 relaciones de seguidores, 4 de seguidos, 8 membresías
  personales; 5 comunidades y 12 miembros; 1 hilo y 1 mensaje de vídeo, incluidos
  sus comentarios/respuestas almacenados. No se encontraron mensajes de directo
  ni documentos de objetivos en las rutas examinadas.
- La búsqueda utiliza máscaras de campos públicos relevantes y campos privados
  conocidos (correo, teléfono, dirección, contraseña, tokens, claves y secretos),
  con inspección de mapas/listas y correos en cadenas/URLs decodificadas.
  No constituye una inspección de todas las colecciones ni detecta todos los
  formatos posibles de información personal en texto libre.

## Imágenes y Storage

- `widget-dreams.firebasestorage.app`: API de bucket devuelve 404.
- Listado de buckets del proyecto: 0, sin error de autorización.
- 0 referencias a buckets Firebase Storage en los campos de imágenes revisados.
- Las referencias actuales corresponden a proveedores externos (incluido Google)
  y rutas web, incluidas `/assets/`. No se enumeran URLs personales ni nombres de
  archivos. No hay rutas de objetos de Firebase Storage existentes que conservar.
- `profile-icons/` es la ruta de subida **preparada localmente**, todavía no una
  ruta existente en este proyecto. La creación de bucket requiere aprobación
  independiente; no se ha realizado.

## Corrección y pasos pendientes

1. No borrar ni migrar los correos legítimos: cerrar su lectura con las reglas
   completas y servir los perfiles ajenos mediante la proyección pública ya
   preparada. Las nuevas reglas son necesarias para resolver las 14 incidencias.
2. Configurar la credencial Admin privada y el proyecto en Netlify, alcance
   Functions, nunca `VITE_*` ni en el chat/repositorio. El cliente y las funciones
   compatibles deben estar disponibles antes de restringir las reglas.
3. Verificar ese paquete en un entorno aislado, respaldar y autorizar la ventana
   de publicación. No restaurar las reglas abiertas en una reversión.
4. Para subir nuevas imágenes de iconos, decidir y autorizar por separado la
   creación/configuración de Storage. Su ausencia no exige modificar los avatares
   ni imágenes actuales. Mantener el progreso desactivado mientras tanto.

`PROGRESS_ENABLED` sigue desactivado por defecto y no se ha alterado. No se ha
consultado ni cambiado la configuración real de Netlify; confirmar explícitamente
`PROGRESS_ENABLED=false` allí antes de publicar. No se han compartido secretos.

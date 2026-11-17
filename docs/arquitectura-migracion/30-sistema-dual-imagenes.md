# 30. Sistema dual de imágenes: estado y bloqueo de seguridad

Fecha: 15 de noviembre de 2026. Referencias: [27](27-diseno-seguridad-proxy.md), [28](28-inventario-hosts-imagenes.md), [29](29-estrategia-migracion-proxy.md). Revisión local del código actual. No se consultaron servicios ni datos de producción.

## Decisión registrada

El sistema histórico conserva sus documentos, URLs y contratos `src`, `url` y `cb`; no se propone migrar registros. El mecanismo nuevo para publicaciones futuras debe distinguir la referencia mediante un esquema explícito y versionado, sin inferir su origen por una URL o un campo enviado libremente:

- `legacy-url`: solo compatibilidad con datos ya existentes y lectores históricos; apunta al comportamiento actual.
- `external-image`: referencia nueva HTTPS con host y ruta validados contra política de servidor revisada. Conserva la URL de origen para atribución y edición. El visor usa la política actual; no se realiza una descarga automática ni se duplica el archivo.
- `managed-image`: identificador opaco de recurso propio aprobado por el backend, cuando exista una ubicación autorizada sin coste adicional. No habilitar Storage ni asumir que existe un destino de almacenamiento disponible.

El esquema es una propuesta, no una modificación funcional. Hasta implementar un lector compatible, la web debe seguir usando las URLs históricas tal como hace hoy. Los componentes no deben tratar un objeto nuevo como URL string sin resolver primero su tipo.

## Inspección del código y consumidores

- `src/constants/assets.js` proxifica toda URL absoluta HTTP(S) externa mediante `src` base64url. URL relativa, mismo origen, `data:`, `blob:` y recursos heredados empaquetados quedan directos. `resolveAssetUrl()` se consume en vistas públicas, comunidad y perfiles; es el resolvedor común que deberá entender el tipo de referencia.
- `src/services/imageLibrary.js` extrae URLs de campos históricos de posts y las presenta por `imageSearchPreview()` con `url`. Los resultados IGDB son URLs externas devueltas por Netlify y se pueden guardar en posts/eventos.
- `PostEditor.vue` y `GameImagePicker.vue` muestran imágenes IGDB directamente durante la selección. El host final no está fijado en el código y no está confirmado por el inventario local. `EventImageSearchModal` envía la URL elegida al proxy para previsualizarla.
- `PostPage.vue`, `HomeNewsHero.vue`, `HomeHeroDeck.vue`, comunidad y otros componentes muestran campos históricos. `PostSharePage.vue` usa `url` más `cb` para exportación social; `EventSharePage.vue` usa `url` para exportación/invitación. No cambiar esos contratos al introducir referencias nuevas.
- `netlify/functions/image-proxy.js` aún acepta URL HTTP(S) arbitraria, sigue redirecciones automáticamente y acumula el cuerpo antes de comprobar el límite. No implementa validación de host, DNS/IP ni firma del contenido. La configuración sigue siendo incompatible con endurecer hosts sin conocer destinos reales.

## Bloqueo para implementar el proxy seguro de nuevas publicaciones

No se puede crear ahora un proxy cerrado y funcional para todas las fuentes nuevas: IGDB y otras imágenes externas aportan host dinámico, y el repositorio no contiene muestras locales fiables de esos destinos. Permitir cualquier host para que IGDB siga funcionando abriría un fetch SSRF arbitrario. El proxy histórico no puede considerarse una vía segura para referencias nuevas: su compatibilidad no satisface validación DNS/IP, redirecciones ni límites durante lectura.

Por tanto, se detiene la implementación funcional del registro externo/proxy nuevo hasta contar con una fuente de evidencia local autorizada que identifique host y ruta final por cada proveedor, incluyendo redirecciones y MIME. No se ampliará la política ni se reusará el endpoint histórico como excepción nueva.

## Implementación viable por etapas una vez resuelto el bloqueo

1. Añadir tipos/validadores puros y pruebas unitarias del esquema, sin cambiar la lectura histórica. Solo permitir `external-image` para entradas exactas revisadas; IGDB queda desactivado en el proxy hasta verificar su destino. El selector puede conservar su carga directa actual durante la edición, sin prometer que esa URL nueva pasará por el proxy en otras pantallas.
2. Adaptar un resolvedor central que acepta URL histórica u objeto tipado. Mantener intactas las rutas históricas y contratos de proxy existentes. Probar posts, biblioteca, eventos y exportación antes de añadir consumidores.
3. Añadir al backend un flujo de proxy nuevo que aplique política del servidor, DNS/IP enlazada a la conexión, validación en cada redirección, MIME/firma y corte de bytes durante streaming. Si el runtime no puede garantizar conexión a la IP validada, no activar el fetch. Sin ubicación autorizada de almacenamiento, no ofrecer `managed-image` como ruta operativa.
4. Adaptar `PostEditor`, biblioteca, `PostPanel`/lectores, eventos y exportación en cambios pequeños. Escritura de referencias nuevas solo después de validar y renderizar los tipos nuevos en toda la web pública y build administrativo futuro. Sin conversión masiva: las referencias históricas permanecen intactas.

## Pruebas y criterios de aceptación pendientes

- Fixtures diferenciados para URL histórica y cada tipo nuevo; lectura de ambos por resolvedor sin cambio visual.
- Casos de IGDB con host aprobado, host desconocido, ruta incorrecta, DNS privado/mixto, IP cambiante, redirección externa/no aprobada, MIME falso, stream sobre límite y timeout. No hacer solicitudes a red interna; simular DNS/transporte.
- Rechazo de campos nuevos manipulados, esquemas distintos de HTTPS, URL con credenciales, hosts parecidos y parámetros que intenten activar compatibilidad. Verificar que el cliente no define la autorización.
- Regresión de imagen en `PostEditor`, publicación pública, biblioteca, evento, `PostSharePage` PNG/ZIP y `EventSharePage`, preservando URLs antiguas y `cb` donde ya se usa.
- Cuando los cambios sean implementados: pruebas dirigidas tras cada etapa, Vitest completo, pruebas Node, Firebase Emulator y `npm run build`, sin modificar Firebase ni desplegar.

## Estado de esta fase

No se modificó código funcional porque los hosts finales necesarios para cerrar el proxy nuevo no están confirmados y reusar el proxy actual para nuevas URLs externas mantendría SSRF. No se modificaron publicaciones, Firebase, Storage ni producción; no se ejecutaron pruebas. El árbol de trabajo ya contenía numerosos cambios locales al iniciar esta fase; no fueron incluidos ni revertidos. La decisión de conservar el sistema histórico queda documentada, pero la nueva escritura de referencias protegidas sigue pendiente del inventario de hosts y del diseño del transporte seguro.

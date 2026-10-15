# Servicios de Galaxia Nintendera

Una aplicacion habitual, Firebase Auth, el UID propietario confirmado en config.mjs y dos endpoints de datos Netlify: editorial y profile. Sin claims, modos experimentales, previews, emuladores ni reconciliacion automatica. Ninguna conexion o escritura real ejecutada durante esta preparacion.

- Editorial: originales posts privados, publicNews como proyeccion escrita al publicar; el lector sanea tambien originales historicos sin migrarlos. Paginas, categorias, busqueda y sitemap utilizan el mismo lector. Se conservaron IDs y slugs; la copia local de las 27 noticias y 10 paginas supera los contratos. Los 13 enlaces sin slug siguen resolviendo por ID. authorId es una referencia publica de perfil, nunca autoridad ni fallback de nombre.
- Autoridad: solo UID propietario administra usuarios, publicadores, paginas y catalogos. Publicador requiere editorialPublisher concedido por servidor, cuenta activa y Auth verificado; solo edita sus borradores y envia a revision. users.role no concede autoridad. El panel Usuarios contiene Nombrar/Retirar publicador.
- Perfil: alta desde Auth y consentimientos, campos editables cerrados; nombre valido o etiqueta neutra. Cuenta historica con estado ausente/malformado necesita revision explicita; no se reinician saldos ni inventarios. Alta administrativa no verifica correos ni acepta consentimientos en nombre del usuario. Auth y Firestore no comparten transaccion: errores parciales se notifican para revisar esa cuenta.
- Economia: canje, precio persistido, inventario, equipamiento y recompensa de lectura en transacciones. Un ledger por usuario/articulo impide repetir recompensa; reloj servidor exige 30 segundos. Esto acredita tiempo transcurrido, no lectura humana. Nunca acepta saldo/recompensa/UID del navegador. Catalogo base reutiliza 52 assets existentes. Logros calculados con el progreso existente; configuracion solo propietario. Gachapon conserva solamente su demostracion visual, sin tiradas, cargos o premios reales.
- Comunidad: DTOs cerrados, identidad derivada en servidor, comentarios/likes/membresias/seguimiento y contadores atomicos, mensajes privados con participantes verificados. Avisos de interacciones son dirigidos y deduplicados. No se activan correo masivo ni notificaciones globales. Favoritos, lectura privada, avisos propios y preferencias del chat conservan SDK con reglas acotadas. Lectores publicos actualizan cada 10 segundos y tras mutaciones propias; chat privado sigue en tiempo real.

Reglas unicas: ../firestore.rules, referenciadas por firebase.json. Ningun permiso administrativo global ni cliente autorizado para modificar economia. Ruzafa conserva acceso exclusivo del propietario a sus dos colecciones. Editor JSON y estilos de overlays conservados; lectura de overlays exige sesion propietaria. Compartir JSON arbitrario anonimamente en OBS sigue pendiente: no se abrio para evitar exponer configuraciones privadas.

## Activacion pendiente, no ejecutada

Runtime requiere GALAXIA_FIREBASE_PROJECT=widget-dreams y exactamente una credencial servidor del mismo proyecto: GOOGLE_APPLICATION_CREDENTIALS (ruta fuera del repositorio) o FIREBASE_ADMIN_CREDENTIALS (secreto de entorno Netlify). Nunca VITE_, Vue ni repositorio. El SDK esta declarado en package.json; npm ci lo restaura normalmente. Se reutilizo exclusivamente el SDK local ya disponible, con regeneracion offline del lock, sin descargas.

Necesarios editorial, profile y seo-files de netlify/functions; conservar image-proxy, igdb y youtube-feed existentes. Vite sirve los mismos handlers durante desarrollo. No se configuraron credenciales reales. Falla antes de inicializar SDK si falta configuracion o el proyecto/credencial no coincide. Produccion conserva sus reglas publicadas y sus datos.

Antes de publicar: validar sintaxis y permisos efectivos de Rules, empaquetado Netlify, credencial y permisos minimos, indices de consultas privadas, flujo real de registro/correo/Google, perfiles, noticias y operaciones economicas/sociales con cuentas de prueba; revisar cuentas historicas sin estado valido. Navegador, Android/CORS y Firebase real no se han probado. No activar reglas hasta autorizar y comprobar todo el circuito junto a sus endpoints. Limites explicitos: 500 noticias/paginas, 120 perfiles de directorio, 200 usuarios del panel y limites de lotes/comentarios; no se ocultan excedentes como listas completas.

## Pruebas y recuperacion

- node --test security/editorial/*.unit.mjs security/*.unit.mjs: 122 superadas, 0 fallidas/omitidas. Dobles de transacciones serializadas, NO integracion Firebase ni compilacion de Rules.
- node node_modules/vitest/vitest.mjs run: 101 superadas en 13 archivos.
- npm run build: correcto; avisos de tamano de chunks/tiempo de plugins.
- 885/885 archivos del punto previo verificados por SHA-256. 10 CSS y 99 bloques de estilos intactos; 110 plantillas comparadas, tres con cambios funcionales de permisos/privacidad. Sin prueba visual en navegador.

Puntos locales: .restore-backups/security-cleanup-2026-10-15T18-18-15-605Z y .restore-backups/final-cleanup-2026-10-15T18-32-19-026Z; manifests con hashes y listas exactas retiradas. Se retiraron fases, documentos/compilaciones de auditoria, Storybook abandonado, scripts de snapshots, contratos simulados sin consumidores y logs. Se conservaron validadores adversariales utiles; los siete tests de modelos/gates retirados se sustituyen por pruebas del servicio real inyectado, no se cuentan como aprobados ni se modificaron snapshots para ocultar fallos.

Reversion: restaurar solo los archivos afectados desde esos puntos, retirar las adiciones enumeradas en el diff y restaurar package/lock correspondientes; npm ci para dependencias si procede. No reset global ni restauracion de credenciales. No requiere cambiar Firebase. El respaldo editorial del Escritorio sigue intacto.

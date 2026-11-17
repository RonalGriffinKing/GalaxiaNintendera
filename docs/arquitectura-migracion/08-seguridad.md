# 08. Seguridad

## Observaciones que requieren acción antes de migrar

1. `src/router/index.js` solo guarda rutas marcadas con `meta.adminOnly`/`publisherOnly`; esos guards son UX. Firestore Rules son la frontera real para SDK cliente. La auditoría encontró reglas **propuestas** y harness de emulator, no reglas confirmadas activas.
2. En `netlify/functions/vacations.js`, la clave de gerencia cae a `Ronal1997` y la clave de firma cae a esa misma contraseña si falta `VACATION_SESSION_SECRET`. La ruta GET devuelve el estado del local sin auth. Validar la exposición y retirar fallback/secreto antes de uso público; rotar cualquier credencial expuesta.
3. `server/server.js` permite CORS `*` y `joinTikTok(username)` sin autenticación ni límites observables; una conexión reemplaza la conexión TikTok global. Proteger abuso y separar sesiones.
4. `PublicQuickAdminModals.vue` y acciones rápidas potencialmente mezclan UI pública con acciones editoriales; cada escritura debe quedar protegida por Rules/API incluso si se mueve la pantalla.
5. La config Firebase web es pública por diseño, según README. Service account, OpenXBL, IGDB/Twitch secretos, Vacation HMAC y cualquier clave privada deben mantenerse server-side. `.env`, `.env.local` y variantes existen en workspace; no se leyeron/repitieron valores secretos. Confirmar ignore y rotación si alguna vez se publicaron.

## Modelo de amenaza / controles

| Superficie | Riesgo | Control necesario |
|---|---|---|
| Auth/roles | rol modificado desde cliente o usuario bloqueado conserva acceso | verificar token revocado, rol vigente y bloqueo server-side para acciones sensibles; deny-by-default |
| Firestore/Storage | pantalla oculta pero endpoints accesibles; IDOR por UID/ID | Rules activas con propiedad y rol; emulador con matrices allow/deny y prueba de deploy |
| Sesiones desktop/APK | robo de token/dispositivo perdido | secure storage del OS, expiración/revocación, reauth en rol/borrado/publicación |
| API admin | repetición, CSRF, abuso/cuotas | HTTPS, CORS exacto cuando aplica, límites, idempotencia, validación, logs de auditoría |
| Vacaciones | contraseña por defecto/firma predecible, estado GET visible, identidad compartida | secreto fuerte obligatorio, identidad nominal, tokens revocables, limitar lectura por local/usuario |
| Socket.IO | canal abierto y recursos upstream consumidos por cualquiera | auth, allowlist origin, cuota por usuario/IP, canal de propietario, cierre y timeout |
| Proxy imagen | SSRF/redirección a IP interna, archivos grandes/tipos activos | allowlist upstream, bloquear IP privadas en cada redirect, tamaño MIME, timeout y decompression |
| Cuentas externas | exposición de API keys y datos vinculados | proxy backend, scopes mínimos, consentimiento y desvinculación, secretos rotables |
| Publicación/usuarios | cambios destructivos y elevación de privilegio | auditoría, historial/rollback, confirmación + reauth, autorización en transacción |
| PWA/cache | contenido privado cacheado o sesión cruzada | no cachear respuestas admin/privadas, invalidar SW y separar estrategias |

## Lectura/escritura observada

- Firestore client directo se usa para perfiles, posts, eventos, comunidades, páginas, overlays y favoritos; no se certifica su permiso sin reglas activas.
- `profile-progress` verifica Bearer Firebase ID token con `checkRevoked=true`, y `progress-service.js` exige `role === admin` no bloqueado para administración del catálogo; award-read deriva UID del token.
- `xbox-profile.js` conserva OpenXBL key en servidor, consulta identidad Firebase para conexiones/autorización según rutas. Leer todos los branches y reglas desplegadas en revisión de seguridad posterior.
- `vacations.js` autentica la gerencia con password custom/HMAC; otras acciones comprueban nombre elegido, no identidad autenticada, por tanto su modelo es de confianza débil.

## Prioridad

**P0:** verificar exposición pública de vacaciones y rotar/quitar fallback; revisar reglas desplegadas y cerrar escrituras. **P1:** asegurar Socket.IO, RBAC server-side para todo CRUD, proxy de imágenes, sesión/revocación. **P2:** auditoría y políticas de caché, controles de reautenticación.

## Firebase: rollout seguro de reglas

No aplicar reglas nuevas a producción en bloque. Las reglas `.proposed.rules` no prueban el estado desplegado.

1. Exportar/versionar Rules Firestore y Storage actuales; usar proyecto staging y respaldos.
2. Mapear cada path de `01-inventario-completo.md` a operación, query shape, actor/rol, ownership y campos editables.
3. Construir pruebas Emulator Suite positivas y negativas con guest, user, publisher propio/ajeno, admin, blocked, owner y participante.
4. Probar consultas reales de UI: Rules no filtran documentos; una query demasiado amplia falla completa. Cubrir filtros, límites, subcolecciones, `onSnapshot`, batch/transactions e índices.
5. Default-deny, allowlist de campos mutables, límites/tipos, ownership; roles/bloqueo/logros/config sensible solo vía backend confiable. Preferir endpoint para invariantes de contadores/membresías/relaciones y operaciones privilegiadas.
6. Completar staging + pruebas UI para Home, lector, perfiles, comunidades, eventos, overlay y admin; observar permission-denied antes de canary.
7. Desplegar rules aparte de UI, por versión con rollback inmediato. Mantener compatibilidad de ambas apps durante transición.

El repo incluye `security/firestore/rules.emulator.mjs`, `participation.emulator.mjs`, fragmentos y `emulator.json`. El harness de participación usa una composición test-only parcial y declara que no despliega la propuesta antigua; no demuestra cobertura de `sitePages`, `galaxyEvents`, overlays, chats, follows, Storage o consultas completas. No ejecuté tests ni modifiqué reglas.

La lista de colecciones y operaciones está en `01-inventario-completo.md`; permisos mínimos: contenido solo publicado al público, borradores a autor autorizado/admin; perfil público minimizado y perfil privado propio; favorites/readPosts/notifications por UID; relaciones sin contadores falsificables; threads por visibilidad/autor/moderador; direct chats por participantes; communities membership consistente; events/page status filtrados; overlay owner-write y lectura compartida explícita read-only; `profileIcons/siteConfig` por endpoint admin; Storage por ownership/tipo/tamaño.

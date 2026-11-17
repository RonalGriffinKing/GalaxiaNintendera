# 12. Riesgos y preguntas pendientes

## Riesgos principales

1. **Crítico — reglas de Firebase sin validar:** Rules propuestas no prueban producción. Cambiar/retirar pantallas antes de auditar reglas permite conservar endpoints vulnerables.
2. **Crítico — vacaciones:** password fallback visible en el código y GET público del estado; confirmar datos reales, rotar secretos y decidir si ruta debe ser pública.
3. **Alto — permisos divergentes:** dashboard eventos requiere admin, share route publisher; algunos componentes consultan rol, pero no hay evidencia de autorización uniforme del servidor.
4. **Alto — conexión TikTok:** Socket.IO abierto a cualquier origin sin auth ni rate limit visible.
5. **Alto — temas visuales:** configuración de administración guardada local por navegador; no acompaña usuarios a Windows/Android.
6. **Alto — gestión de usuarios:** elevación/bloqueo/verificación requieren operaciones backend auditables y rollback.
7. **Medio-alto — rutas indirectas:** links directos, redirects de bookmarks, PWA y shares pueden perderse al separar la app.
8. **Medio — funciones de build/runtime externas:** la configuración real de Netlify, Blobs, Firebase Storage, variables y Node server no está en el repo.
9. **Medio — optimización no medida:** no hay baseline de bundle, Core Web Vitals, queries ni latencias adjunto.
10. **Pendiente — emails, notificaciones y posibles cron/triggers:** se ven referencias parciales o ninguna; servicios externos pueden existir fuera del repo.
11. **Crítico — Rules desplegadas desconocidas:** propuestas y tests parciales no describen producción; reglas abiertas exponen datos/escrituras y reglas estrictas rompen la app.
12. **Alto — queries incompatibles:** Firestore no filtra resultados; consultas amplias de posts/users/feeds pueden fallar completas con Rules seguras.
13. **Alto — no hay servicio OBS local:** mover origin sin proceso independiente/auth rompería Browser Sources o cerrando UI.
14. **Alto — configuración local fragmentada:** temas/social/printer settings no sincronizan consistentemente.

## Preguntas para cerrar antes del diseño final

- ¿Qué reglas Firestore y Storage están desplegadas hoy y en qué proyecto Firebase?
- ¿Vacaciones Russafa e impresora deben formar parte de Galaxia, ser otra aplicación privada o quedar fuera de esta migración? ¿Quiénes son sus usuarios nominales?
- ¿El endpoint de vacaciones debe permitir consultas sin sesión? ¿Qué datos son confidenciales?
- ¿Qué proveedor aloja Socket.IO y TikTok; se usa en producción y por quién?
- ¿Qué operaciones puede realizar `publisher` exactamente frente a `admin` y existe rol de moderación?
- ¿Se desea que temas visuales sean biblioteca global compartida o export/import manual?
- ¿Las notificaciones se alimentan de Cloud Functions/cron u otro servicio no presente aquí?
- ¿Existen jobs, webhooks, triggers, respaldos o APIs fuera del repositorio?
- ¿Se desea distribución de APK privada (sideload) y cómo se gestionará firma/actualizaciones en Windows/Android?
- ¿Qué política de cache/offline se espera en la app administrativa?
- ¿Debe OBS conservar URL pública HTTPS como compatibilidad o todas las salidas deben ser locales? OBS Browser Source ejecuta en el PC: localhost de MagicPad no es localhost del PC.
- ¿Servicio Windows inicia con sistema o basta opción de bandeja “mantener activo al cerrar”? ¿Qué comportamiento de fondo se espera en Android?
- ¿El overlay es público por posesión de URL o requiere pairing? Se necesitaría token de lectura revocable compatible con OBS sin login.
- ¿Chat widget significa DirectChat Firestore, TikTok Live Socket.IO, Twitch o los tres?
- ¿Qué configuraciones locales quiere sincronizar globalmente y cuáles por dispositivo?
- ¿Existe export versionado no secreto de Rules activas y proyecto staging disponible?

La auditoría no afirma exhaustividad de producción mientras estas áreas externas permanezcan sin evidencia.

## Orden recomendado para la siguiente fase

1. Obtener Rules/Storage reales, mapa de entorno y staging, sin cambios productivos.
2. Resolver P0: vacaciones/fallback, perfiles/PII/roles, escrituras cliente y exposición Socket.IO.
3. Completar contratos Firebase y pruebas Emulator de paths, consultas y roles; verificar regresiones públicas.
4. Exportar/respaldar preferencias locales creativas por navegador antes de definir sincronización.
5. Congelar contrato de overlay/URLs/widgets/chat y diseño del token local read-only.
6. Prototipo staging de Tauri/Firebase MagicPad↔Windows↔OBS y prueba daemon con ventana cerrada.
7. Tras aprobación, migrar módulo por módulo y retirar interfaz antigua solo tras pasar matriz.

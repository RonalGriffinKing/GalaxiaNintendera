# 10. Plan de migración sin pérdidas

Cada fase requiere aprobación de diseño/implementación cuando corresponda. Regla de salida: una función solo se marca migrada al pasar criterios en `11-matriz-de-trazabilidad.md` en nueva ubicación y roles pertinentes.

| Fase | Objetivo / áreas | Riesgos | Pruebas y aceptación | Reversión |
|---|---|---|---|---|
| 1. Auditoría (actual) | inventario rutas/componentes/apis/datos/roles | áreas cloud externas no visibles | revisión de docs; cerrar pendientes de Rules/Netlify | no aplica, solo docs |
| 2. Inventario aprobado | congelar IDs, propietarios, flujos y evidencia de cada acción | omisiones/IDs ambiguos | dueño confirma cada fila y pendientes | conservar versión del inventario |
| 3. Referencia funcional | pruebas de caracterización para rutas CRUD/lectura por roles y export | datos de prueba tocan producción | staging/emulator, fixtures, capturas y backup validado | restaurar backup; ruta actual intacta |
| 4. Diseño/seguridad | contratos API, RBAC, sesiones, datos, logs, storage tokens | cambio de permisos | pruebas negativas y threat review aprobadas | mantener backend y UI existentes |
| 5. Firebase seguro | completar Rules/emulator por colección/query/Storage en staging | reglas rompen consultas públicas | matriz positiva/negativa y UI contra emulador/staging | volver a versión de Rules versionada |
| 6. Base compartida | extracción gradual de modelos, validadores, UI y API clients | regresiones/import cycles | pruebas de contrato y visuales equivalentes | revertir módulo/paquete compartido |
| 7. Admin por módulo | posts → CMS → eventos → comunidades → usuarios → logros → overlays/temas → vacaciones si aplica | migración parcial, doble escritura | escenarios completos por rol, datos, archivos y enlaces; matriz pasa | feature flag y volver a UI original |
| 8. OBS compatibility/local service | mantener URL web; servicio local independiente con modo persistente | links rotos, daemon termina, token expuesto | MagicPad guarda → Firebase → viewer OBS/Windows; cerrar editor, reiniciar servicio, widgets todos | conservar Browser Source web actual |
| 9. Windows | empaquetar app/login y módulo migrado | WebView/auth/updates | instalación limpia, secure storage, daemon opcional, revocación | seguir usando web admin |
| 10. Android APK | adaptar a tablet/firma/distribución | permisos/OAuth/background | Honor MagicPad 4 real, APK, layout, login, sync Windows | mantener canal admin previo |
| 11. Regresión integral | verificar pública/admin/server, enlaces y roles | divergencia prod | matriz total, errores, visual, seguridad | rollback app + backend compatible |
| 12. Retiro UI antigua | después de cobertura y observación | bookmarks/clientes anteriores | redirects compatibles, archivado de release | restaurar build anterior |
| 13. Optimización/despliegue | medir bundles/queries; reducir admin público | mejora no medida | baseline comparado por ruta | deploy previo versionado |

Las rutas `/admin/*`, `/editor`, `/dashboard` y enlaces de share deben mantener compatibilidad durante rollout; pueden redirigir a app instalada/desplegada solo cuando exista manejo de fallback aprobado. Mantener esquema de datos aditivo y backend compatible con ambas interfaces durante transición.

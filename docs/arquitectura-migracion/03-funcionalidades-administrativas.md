# 03. Funcionalidades administrativas

Destino propuesto: cliente privado Windows/Android con sesión de usuario y backend público autenticado. Mantener lógica de validación y credenciales en servidor.

| ID | Módulo a trasladar | Implementación actual / acceso | Autorización que debe preservarse |
|---|---|---|---|
| B01 (F04) | Gestión editorial de posts, estados, edición, aprobación, categorías, home hero, importación y borrado | `/admin/dashboard?view=posts`, `/admin/posts/new`, `/admin/posts/:id/edit`, PostPanel/PostEditor | admin y publisher; edición propia para publisher indicada en `PostEditorPage.vue`; operaciones críticas servidor/Rules |
| B02 (F06) | Eventos: crear/editar/eliminar/reactivar, importación, filtros, invitaciones y generación social | Dashboard `events`, `/admin/event-share/:id` | actualmente router adminOnly para tab eventos, publisherOnly para event share; la página chequea admin en parte. Aclarar permisos inconsistentes y conservar cada acción |
| B03 (F07) | CMS, bloques, legales, landing, footer/home dinámicos | Dashboard `pages`, `SitePagesPanel.vue` | admin; rollback/versionado de contenido recomendado |
| B04 (F08) | Gestión de comunidades, categorías/imagen/banner y borrado | Dashboard `communities` | admin; confirmar moderación separada de administración |
| B05 (F11) | Usuarios, roles, permisos, verificación, bloqueo, creación | Dashboard `users`, `UserPanel.vue` | admin; acción de alto impacto con auditoría, reautenticación y protección backend |
| B06 (F13) | Catálogo iconos/logros, requisitos, subir/actualizar/eliminar, gestión de recompensas | Dashboard `rewards`, `ProfileRewardsManager.vue`; endpoint progress | admin en servidor; endpoint ya verifica ID token revocado y rol admin en operaciones administrativas |
| B07 (F14) | Gestión administrativa de overlays si existe además del editor propietario | Dashboard `overlays`, `OverlayPanel.vue`; editor `/editor` | router adminOnly; distinguir gestión de overlays de usuario del editor de propietario |
| B08 (F23) | Administración de biblioteca global de temas (si el producto realmente la pretende global) | Dashboard `themes`, localStorage actual | admin UI únicamente no hace sincronización global; decidir si importar/exportar local o migrar estado a servidor |
| B09 (F16) | Gestión de calendarios, reglas, personas y solicitudes Russafa, sujeto a confirmación de finalidad | `RuzafaVacationsPage.vue`, `vacations.js` | gerente token dedicado; sacar credencial fallback, rotación/revocación y definir identidad individual |
| B10 (F21) | Herramientas internas de selección/curación de medios usados por editores | IGDB picker, Giphy, proxy | rol de editor; límites de proxy/uso en servidor |

No retirar las rutas actuales hasta que cada acción de la matriz esté implementada, probada con todos los roles y tenga reversión de datos/despliegue.

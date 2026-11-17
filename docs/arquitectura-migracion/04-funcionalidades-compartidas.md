# 04. Funcionalidades compartidas

| ID | Compartido | Frontend público | App privada | Backend / cautelas |
|---|---|---|---|---|
| C01 | Esquemas y render de posts, bloques, eventos | Lectura y presentación | Formularios de edición/preview | Validar schemas de forma común; backend decide escrituras |
| C02 | Firebase Auth y modelos de rol | sesión, perfil, preferencias | sesión administrativa | tokens breves/renovables; nunca confiar en `role` del cliente |
| C03 | Perfil/iconos/progreso | consulta y uso del perfil | catálogo/logros | `profile-progress` mantiene operación privilegiada |
| C04 | Reglas de publicaciones, categorías, comunidades | presentación y navegación | CRUD/moderación | Rules y endpoints por acción |
| C05 | Assets, selección de imágenes y generación social | consume imágenes/resultado compartido | editor y export | límites de subida y secretos server-side |
| C06 | Overlays y widgets | render web público | diseño/configuración | control de lectura pública intencional, escritura por dueño |
| C07 | Estilos/tokens y componentes visuales | interfaz visitante | interfaz táctil/desktop | evitar que el paquete público descargue módulos admin |
| C08 | Reglas vacaciones | calendarios | acciones gerente | las validaciones puras están en `vacationRules.js`, autoridad en Function |
| C09 | Cliente API/errores/cache | servicios de lectura | servicios administrativos | cliente no contiene credenciales permanentes |

Los módulos compartidos deben extraerse por contrato y uso probado, no moviendo imports indiscriminadamente: varios componentes del editor exportan y renderizan visuales también consumidos por visitantes.

# Gachapon Estelar — demostración con animación propia

11 de octubre de 2026. Se conserva el botón del perfil propio y el modal de demostración. No hay aperturas reales ni integración OBS.

La presentación usa SVG y CSS propios: seis estrellas giran durante 2,2 segundos alrededor de un regalo holográfico. El paquete tiene reflejos móviles y movimiento suave durante la carga; después su tapa se levanta, la caja se desvanece y el icono existente emerge desde el mismo centro con un halo y partículas. Nombre, saga y rareza se muestran dentro de la escena; se ha eliminado la tarjeta inferior de premio. La rareza normal mantiene tonos violeta/rosa/cian y la épica resplandor dorado. Los efectos solo se ejecutan durante la prueba y terminan; no hay bucles en reposo, recursos gráficos externos ni nuevas dependencias.

La revelación automática responde a `animationend`, con identificación de la animación incluso cuando Vue aplica sufijos a los keyframes. «Saltar animación» muestra el resultado inmediatamente. `prefers-reduced-motion` elimina los movimientos y revela directamente. Ocultar la página, quedar fuera de pantalla, cerrar o cambiar el catálogo cancela la demostración en curso. Se liberan observadores/listeners al desmontar.

Icono, regalo, halo y órbita comparten un único centro definido por `--scene-center`; cada estrella se centra dentro de una caja de 28 px para conservar la simetría aunque cambie su tamaño. En móvil se reserva espacio entre la órbita y los textos. El fondo de la escena combina violeta/cian/rosa para normal y violeta/dorado para épico, con capas de color estáticas y sin la superficie negra anterior.

Las opciones de 20/50 estrellas son informativas. El icono mostrado es una vista previa determinista del catálogo local de la rareza correspondiente, no una concesión de premio. Se excluyen poseídos, ocultos, archivados, inactivos y recursos sin imagen. No se mezclan rara/legendaria con normal/épica. El aviso de demostración permanece visible; no hay equipamiento, descuentos ni escrituras.

## Archivos vigentes

- `src/components/profile/gachapon/StarsRewardStage.vue`: animación propia sin motor externo.
- `GachaponDemoModal.vue`: modal, salto, finalización, accesibilidad y resultado.
- `demoCatalog.js` y `demoCatalog.test.js`: precios informativos y elegibilidad sin mutaciones.
- `ProfileHeaderCard.vue` / `ProfilePage.vue`: acceso exclusivo del perfil propio y carga diferida del modal.

Se retiraron el componente del motor descartado, su dependencia y lockfile asociado, sus recursos binarios, licencias/atribuciones, informes y resumen visual obsoletos. Los archivos originales proporcionados por el usuario en Downloads se conservan. Las capturas anteriores se sustituyen por las de la animación propia.

Compilación y 19 pruebas unitarias pasan. Comprobación visual de los componentes en un fixture local con iconos existentes, sin Firebase: escritorio y anchos móviles 390/320 px, final automático, salto, movimiento reducido, cierre/foco/scroll, saldo e inventario intactos y ausencia de peticiones del motor retirado o Firebase. Las rarezas de fixture no modifican datos reales.

La tienda original, administración, logros, autenticación, reglas Firestore y overlays se conservan. No se despliega nada ni se conectan canjes reales.

Los accesos usan Obtener iconos y las opciones Obtener icono normal (20 estrellas) / Obtener icono epico (50 estrellas). La revelacion respeta effectColor y la rareza del icono, con soporte visual legendario dorado; no se crea una opcion legendaria ni se cambia la elegibilidad. Los destellos siguen siendo finitos y respetan movimiento reducido.

Ajuste visual: botones Normal (20 estrellas) y Epico (50 estrellas), pie de estado de altura constante con Omitir animacion reservado, y 18 particulas ambientales ligeras. Se pausan cuando la escena o la pestana no son visibles; con movimiento reducido permanecen estaticas.

Selector horizontal por las sagas del catalogo existente (saga, con Especiales como alternativa). Filtra los candidatos de cada rareza, permite Todas y bloquea cambios durante la apertura. El premio revelado flota, sus estrellas palpitan y el borde especial gira independientemente de la ilustracion conservando effectColor. Estos efectos se pausan fuera de vista y no se animan con movimiento reducido.

Actualizacion: Ver coleccion abre la coleccion existente con todos los iconos visibles y obtenidos, filtros por saga, rareza y pertenencia, detalles y equipamiento solo de obtenidos. Los pendientes enlazan al gachapon de su saga sin garantizar resultado. Se retiran Tienda, compras directas, confirmacion y ejecucion de redeemIcon de ProfilePage. Los enlaces antiguos tab=redeem muestran coleccion. La funcion legacy del servicio queda sin consumidores de interfaz, conservada con sus pruebas y documentacion de auditoria; esto no sustituye asegurar las reglas Firestore. Gachapon continua en demostracion y no entrega premios reales.

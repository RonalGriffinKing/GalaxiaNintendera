# Preparación del Firebase Emulator

## Estado local

- Firebase CLI instalado: **15.17.0**.
- `java` no está localizado: `Get-Command java` y `where.exe java` no devolvieron una ruta. El intento anterior de CLI terminó en `spawn java ENOENT`.
- La documentación actual de Firebase CLI establece **Java JDK 11 o superior** para Local Emulator Suite; sin embargo, el código actual de `firebase-tools` declara `MIN_SUPPORTED_JAVA_MAJOR_VERSION = 21`. Para CLI 15.17.0 se recomienda instalar **JDK 21 LTS** para cumplir el mínimo actual de CLI. Configurar `JAVA_HOME` apuntando a la carpeta del JDK y añadir `%JAVA_HOME%\bin` al `PATH`; cerrar/abrir terminal y verificar `java -version` y `where.exe java`. No se instaló nada. Fuentes: [Firebase Emulator setup](https://firebase.google.com/docs/emulator-suite/install_and_configure), [firebase-tools commandUtils](https://github.com/firebase/firebase-tools/blob/main/src/emulator/commandUtils.ts).

## Configuración aislada creada

Se añadió `security/firestore/firebase.emulator.candidate.json`. Carga directamente `firestore.candidate.review.rules`, desactiva Emulator UI, activa `singleProjectMode` y enlaza Firestore solo a `127.0.0.1:8055`. Los `projectId` del test environment están fijados a `demo-galaxia-security`; la suite rechaza host diferente y `GCLOUD_PROJECT` distinto.

Comando para usar cuando Java esté autorizado/instalado:

```powershell
firebase emulators:exec --project demo-galaxia-security --config security/firestore/firebase.emulator.candidate.json --only firestore "node security/firestore/rules.candidate.emulator.mjs"
```

No utilizar `firebase deploy`. Este comando solo arranca emulador, ejecuta tests y lo detiene. Sin `.firebaserc` local detectado, y con ID demo explícito, no selecciona proyecto de producción. El host de loopback evita escucha de red LAN. Los fixtures que desactivan Rules corren dentro del emulador mediante `withSecurityRulesDisabled`.

## Qué está listo y qué falta

- **Listo:** CLI 15.17.0; JDK Temurin 21.0.13 localizado en `C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot`. El shell de esta sesión no heredó `JAVA_HOME` ni el path de Java, así que se añadió `JAVA_HOME`/`PATH` únicamente al proceso de ejecución (sin cambiar configuración persistente). La compilación de candidato se completó al arrancar Emulator: los logs muestran `--rules ...\firestore.candidate.review.rules`, proyecto demo y `127.0.0.1:8055`.
- **Suite ejecutada:** 32 tests, **31 aprobados, 1 fallido**. No se cambió ninguna regla ni prueba para modificar el resultado.
- **Fallo:** `public posts exclude drafts, private content, future releases and unfiltered queries`, en el `getDocs(query(...status == approved, visibility == public, releaseAt <= Date.now()))`. La lectura por documento de public/unlisted y las denegaciones de draft/private/future pasaron; también pasó la denegación de colección completa. La query filtrada recibe `permission-denied` por `allow list` en línea 120 del candidato. Se necesita investigar la compatibilidad de reglas/query temporal `releaseAt` con `request.time`, manteniendo la política. Es un bloqueo real para lecturas públicas de posts.
- **Java:** no requiere instalación adicional detectada. En nuevas terminales verificar `java -version`; si la sesión de Codex no hereda `JAVA_HOME`, establecer variables solo en el proceso como en el comando ejecutado o iniciar Codex desde terminal con el entorno configurado.
- **Pendiente:** resolver la consulta de posts mediante diseño compatible (sin ampliar permisos), repetir suite y registrar el resultado. Ningún test fallido se marca como aprobado.

No se tocó `firebase.json`, `security/firestore/emulator.json`, reglas de producción, Firebase Console ni datos reales. No se desplegó nada. La configuración nueva es solo para pruebas locales y no cambia código funcional.

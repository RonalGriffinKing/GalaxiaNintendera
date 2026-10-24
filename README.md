# Galaxia Nintendera

Sitio Vue 3 + Vite para Galaxia Nintendera, listo para desplegar el frontend en Netlify.

## Desarrollo

```bash
npm install
npm run dev
```

Para probar el servidor local de Socket.IO/TikTok:

```bash
cd server
npm install
npm start
```

## Variables de entorno

Copia `.env.example` a `.env` en la raiz del proyecto para desarrollo local.

```bash
VITE_YOUTUBE_CHANNEL_ID=UCCV0FF1ZAsJzpjk78ff-kjg
VITE_SOCKET_URL=http://localhost:3001
```

En Netlify configura `VITE_YOUTUBE_CHANNEL_ID` en **Site configuration > Environment variables**. `VITE_SOCKET_URL` solo hace falta si despliegas el servidor Socket.IO en otro proveedor.

## App Android

La app usa Capacitor y empaqueta el mismo frontend Vue dentro de un proyecto Android nativo.

```bash
npm run android:sync
npm run android:open
```

Para crear un APK de desarrollo directamente desde la terminal:

```bash
npm run android:apk
```

El APK se genera en `android/app/build/outputs/apk/debug/app-debug.apk`. Antes de publicar en Google Play hay que crear una clave de firma y configurar el paquete `release` como AAB.

## Netlify

Netlify usa:

```toml
command = "npm run build"
publish = "dist"
```

El backend de `server/` no se ejecuta en Netlify como servidor Express permanente. Para el chat de TikTok en produccion, despliega ese servidor en un hosting Node.js y usa su URL en `VITE_SOCKET_URL`.

### Firebase environment configuration

Set `FIREBASE_API_KEY` and `FIREBASE_PROJECT_ID` in Netlify with both Builds and Functions scopes, in each deploy context that needs Firebase. Local development reads them from an ignored `.env.local` file; `.env.example` lists the supported settings. Restart the development server after changing them. The browser also accepts `VITE_FIREBASE_*` overrides, but the server functions require the unprefixed names. Optional auth domain, storage bucket, sender ID, and app ID settings use the corresponding `FIREBASE_*` names. Set `FIREBASE_STORAGE_BUCKET` explicitly for older `.appspot.com` buckets or custom buckets.

Firebase web configuration is public: the browser needs its API key and project ID to connect. Vite embeds only the six public Firebase configuration fields. Netlify's scanning exceptions cover those public fields while scanning remains enabled for private server credentials. Never place a Firebase service-account key or another private credential in these settings. Protect Firebase data with Firebase Security Rules and restrict the web API key to the intended APIs and applications.

For native Android builds, download `google-services.json` from Firebase Console and place it in `android/app/` locally or supply it through your Android CI's protected file mechanism. This file is ignored and is no longer distributed with the repository. Existing Git history is unchanged. Review API key restrictions in Firebase/Google Cloud; rotate the key if it was unrestricted or abused, and update the environment settings and local Android config together. A Firebase project ID is a public identifier and cannot be rotated like an API key.

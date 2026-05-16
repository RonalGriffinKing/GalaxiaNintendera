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

## Netlify

Netlify usa:

```toml
command = "npm run build"
publish = "dist"
```

El backend de `server/` no se ejecuta en Netlify como servidor Express permanente. Para el chat de TikTok en produccion, despliega ese servidor en un hosting Node.js y usa su URL en `VITE_SOCKET_URL`.

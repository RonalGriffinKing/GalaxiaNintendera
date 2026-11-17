# 06. Mapa de arquitectura actual

## Sistema y datos

```mermaid
flowchart LR
  Visitor[Visitante navegador/PWA] --> SPA[Vue 3 + Vue Router + Vite]
  Admin[Admin/publisher navegador] --> SPA
  SPA --> Auth[Firebase Auth]
  SPA --> Firestore[(Firestore)]
  SPA --> Storage[(Firebase Storage)]
  SPA --> NF[Netlify Functions]
  SPA --> RT[Socket.IO client]
  NF --> Firestore
  NF --> Blobs[(Netlify Blobs: vacaciones)]
  NF --> Ext[IGDB/Twitch · Nintendo · OpenXBL · YouTube · URLs de imagen]
  RT --> Node[Express + Socket.IO :3001]
  Node --> TikTok[TikTok Live connector]
  Firestore --> Rules[Firebase Rules desplegadas: no verificadas]
  SPA --> SW[Service Worker / cache]
  Netlify[Netlify: dist + SPA redirects + SEO rewrites] --> SPA
```

## Dominios y dependencias

```mermaid
flowchart TD
  subgraph Public[Web pública]
    Home[Inicio y discovery]
    Posts[Posts, categorías, búsqueda, lector]
    Events[Eventos públicos]
    Profiles[Perfiles y progreso visible]
    Communities[Comunidades e hilos]
    Site[CMS renderizado, páginas legales]
    Overlay[Render overlay/widgets]
  end
  subgraph Admin[UI administrativa embebida en la SPA]
    Dashboard[Dashboard/Gestor Global]
    PostEdit[Posts y home hero]
    EventEdit[Eventos e invitaciones]
    Pages[Site pages]
    Users[Usuarios y roles]
    Rewards[Iconos/logros]
    OverlayEdit[Editor de overlays]
    Themes[Temas visuales locales]
  end
  subgraph Shared[Compartido]
    Auth[Auth/router guards]
    UI[Componentes Vue/servicios]
    Firebase[Firebase cliente]
  end
  subgraph Server[Servidor y APIs]
    Functions[8 Netlify Functions]
    Progress[Progreso Admin SDK]
    Vacation[Vacaciones + Blobs]
    Socket[Socket.IO/TikTok]
  end
  Public --> Shared
  Admin --> Shared
  Shared --> Firebase
  Firebase --> DB[(Firestore y Storage)]
  Public --> Functions
  Admin --> Functions
  Functions --> DB
  Functions --> Ext[Servicios externos]
  OverlayEdit --> Overlay
  Dashboard --> PostEdit
  Dashboard --> EventEdit
  Dashboard --> Pages
  Dashboard --> Users
  Dashboard --> Rewards
  Dashboard --> OverlayEdit
  Dashboard --> Themes
  Progress --> DB
  Vacation --> Blobs
  Socket --> TikTok[TikTok]
```

## Flujo editorial

```mermaid
sequenceDiagram
  actor Editor as Admin o publisher
  participant UI as Dashboard/PostEditor
  participant Auth as Firebase Auth
  participant DB as Firestore
  participant Reader as Web pública
  Editor->>UI: Crear o editar post
  UI->>Auth: Comprueba sesión/rol en cliente
  UI->>DB: Leer/escribir post (según Rules activas)
  Note over DB: Reglas activas no verificadas en esta auditoría
  DB-->>Reader: Post y snapshot visual
  Reader->>DB: begin-read / award-read si usuario lee
  DB-->>Reader: progreso actualizado vía API autenticada
```

Los diagramas representan conexiones visibles en el repositorio; la topología de producción debe contrastarse con paneles cloud y reglas desplegadas.

## Flujo OBS actual

```mermaid
flowchart LR
  Editor[OverlayEditorPage] -->|Guardar setDoc| Item[(Firestore overlays/uid/items/id)]
  OBS[OBS Browser Source] -->|URL web /overlay/uid_id| Viewer[OverlayViewPage]
  Viewer -->|onSnapshot en vivo| Item
  Viewer --> Widgets[Renderer y widgets]
  Widgets --> APIs[APIs de juego/eventos]
  Widgets --> Socket[Socket.IO/TikTok si se configura]
```

El listener permite que Guardar actualice el Browser Source sin recargar. No se encontró servidor local en el repo; el origin actual es web.

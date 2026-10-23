# Entradas suaves de contenido

La directiva local `v-soft-reveal` comparte un solo IntersectionObserver entre Home, Noticias, lectura, Perfil, comunidades, eventos, iconos y logros. Cada elemento entra una vez cuando llega a la pantalla, con 360 ms de duracion y un desfase limitado a 240 ms. No realiza consultas ni usa temporizadores de sondeo.

El foco de teclado revela inmediatamente el contenido. Movimiento reducido desactiva la animacion y libera cualquier elemento pendiente. Sin las APIs del navegador, el contenido permanece visible. Se limpian observadores y eventos al desmontar.

Se retiraron los esqueletos grises de Perfil, recompensas, Home, Noticias y el cargador compartido del panel. Los estados de carga mantienen un aviso accesible discreto; los errores y estados vacios permanecen independientes. Perfil y recompensas comparten GalaxyAtmosphere con Comunidades y Eventos; la portada personal conserva su imagen.

Validacion: `npx vitest run --exclude '**/.restore-backups/**'`, `npm run build`, y `node scripts/verify-soft-reveal.mjs` con el laboratorio de perfil. Con `PUBLIC_THEME_LAB_URL=http://127.0.0.1:5225` tambien comprueba Home y Noticias en el laboratorio visual. Las pruebas usan datos locales simulados.

Gestor Global: PostPanel anima filas y tarjetas moviles; SitePagesPanel, UserPanel y OverlayPanel animan sus tarjetas al cargar, filtrar o paginar. Los menus publicos de administracion conservan solo Gestor global; las acciones de crear siguen dentro del gestor. Validacion visual con THEME_LAB_REAL_MANAGER=1 node scripts/visual-theme-lab.mjs y node scripts/verify-manager-reveal.mjs (datos simulados, sin escrituras remotas).

import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore'
import { db } from '@/firebase'

export const SITE_PAGE_TYPES = [
  { value: 'footer', label: 'Pagina del footer', icon: 'fas fa-link' },
  { value: 'info', label: 'Pagina informativa', icon: 'fas fa-circle-info' },
  { value: 'guide', label: 'Guia', icon: 'fas fa-book-open' },
  { value: 'legal', label: 'Legal / politicas', icon: 'fas fa-scale-balanced' },
  { value: 'landing', label: 'Landing', icon: 'fas fa-rocket' },
  { value: 'community', label: 'Pagina de comunidad', icon: 'fas fa-users' },
  { value: 'home-section', label: 'Home / seccion dinamica', icon: 'fas fa-house-chimney' },
  { value: 'event', label: 'Evento especial', icon: 'fas fa-calendar-star' }
]

export const FOOTER_COLUMNS = [
  { value: 'informacion', label: 'Informacion' },
  { value: 'comunidad', label: 'Comunidad' },
  { value: 'legal', label: 'Legal' },
  { value: 'recursos', label: 'Recursos' }
]

export const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero / banner', icon: 'fas fa-wand-magic-sparkles' },
  { type: 'heading', label: 'Titulo', icon: 'fas fa-heading' },
  { type: 'text', label: 'Texto', icon: 'fas fa-align-left' },
  { type: 'image', label: 'Imagen', icon: 'far fa-image' },
  { type: 'gallery', label: 'Galeria', icon: 'fas fa-images' },
  { type: 'video', label: 'Video', icon: 'fab fa-youtube' },
  { type: 'cards', label: 'Cards', icon: 'fas fa-table-cells-large' },
  { type: 'faq', label: 'FAQ', icon: 'far fa-circle-question' },
  { type: 'timeline', label: 'Timeline / pasos', icon: 'fas fa-timeline' },
  { type: 'alert', label: 'Alerta', icon: 'fas fa-triangle-exclamation' },
  { type: 'cta', label: 'CTA', icon: 'fas fa-bullhorn' },
  { type: 'separator', label: 'Separador', icon: 'fas fa-minus' },
  { type: 'list', label: 'Lista', icon: 'fas fa-list-ul' },
  { type: 'stats', label: 'Estadisticas', icon: 'fas fa-chart-simple' },
  { type: 'rewards', label: 'Puntos Estrella', icon: 'fas fa-star' },
  { type: 'communities', label: 'Comunidades destacadas', icon: 'fas fa-users' },
  { type: 'related-posts', label: 'Noticias relacionadas', icon: 'far fa-newspaper' },
  { type: 'footer-links', label: 'Footer links', icon: 'fas fa-link' },
  { type: 'legal-text', label: 'Legal text', icon: 'fas fa-scale-balanced' },
  { type: 'contact-form', label: 'Contact form', icon: 'far fa-envelope' },
  { type: 'tabs', label: 'Tabs', icon: 'fas fa-folder-open' },
  { type: 'rules', label: 'Bloque de normas', icon: 'fas fa-shield-halved' }
]

export const slugifyPage = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80)

const id = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
const block = (type, data = {}) => ({ id: id(), type, style: { align: 'left', variant: 'default' }, ...data })

export const createBlock = (type = 'text') => {
  const base = { id: id(), type, style: { align: 'left', variant: 'default' } }
  const blocks = {
    hero: { eyebrow: 'Galaxia Nintendera', title: 'Titulo de la pagina', text: 'Una experiencia especial para la comunidad.', image: '', primaryLabel: 'Explorar', primaryUrl: '/comunidad', secondaryLabel: 'Ver guias', secondaryUrl: '/guias' },
    heading: { text: 'Nueva seccion', level: 'h2' },
    text: { body: 'Escribe aqui el contenido de esta pagina.' },
    image: { url: '', alt: '', caption: '' },
    gallery: { items: [{ id: id(), url: '', title: 'Imagen destacada' }] },
    video: { url: '', title: 'Video destacado' },
    cards: { title: 'Destacados', items: [{ id: id(), title: 'Card especial', text: 'Describe un beneficio o bloque.', icon: 'fas fa-star' }] },
    faq: { title: 'Preguntas frecuentes', items: [{ id: id(), question: 'Pregunta frecuente', answer: 'Respuesta clara para la comunidad.' }] },
    timeline: { title: 'Como funciona', items: [{ id: id(), title: 'Paso 1', text: 'Primer paso importante.' }] },
    alert: { title: 'Importante', text: 'Mensaje destacado para los usuarios.', tone: 'info' },
    cta: { title: 'Unete a la comunidad', text: 'Participa, gana estrellas y descubre novedades.', label: 'Entrar', url: '/comunidad' },
    separator: { label: '' },
    list: { title: 'Lista', itemsText: 'Primer punto\nSegundo punto\nTercer punto' },
    stats: { title: 'Datos clave', items: [{ id: id(), value: '10+', label: 'Estrellas' }] },
    rewards: { title: 'Puntos Estrella', items: [{ id: id(), value: '10', label: 'Estrellas por leer', icon: 'fas fa-star' }] },
    communities: { title: 'Comunidades destacadas', text: 'Conecta con fans de Nintendo y videojuegos.' },
    'related-posts': { title: 'Noticias relacionadas', category: 'all', limit: 3 },
    'footer-links': { title: 'Enlaces utiles', items: [{ id: id(), label: 'Contacto', url: '/p/contacto' }] },
    'legal-text': { title: 'Texto legal', body: 'Este contenido es informativo y puede actualizarse con el tiempo.' },
    'contact-form': { title: 'Contacto', text: 'Escribenos para consultas, colaboraciones o soporte.', email: 'contacto@galaxianintendera.com' },
    tabs: { title: 'Secciones', items: [{ id: id(), label: 'Tab 1', text: 'Contenido de la pestana.' }] },
    rules: { title: 'Normas de comunidad', itemsText: 'Se respetuoso con todos.\nNo publiques spam.\nEtiqueta spoilers.\nCuida el tono de tus mensajes.' }
  }
  return { ...base, ...(blocks[type] || blocks.text) }
}

export const pageTemplate = (type = 'info') => {
  const title = {
    footer: 'Nueva pagina del footer',
    info: 'Pagina informativa',
    guide: 'Guia oficial',
    legal: 'Politica de privacidad',
    landing: 'Landing especial',
    community: 'Pagina de comunidad',
    'home-section': 'Seccion dinamica del Home',
    event: 'Evento especial'
  }[type] || 'Pagina personalizada'

  const blocks = {
    legal: [createBlock('hero'), createBlock('legal-text'), createBlock('faq')],
    guide: [createBlock('hero'), createBlock('text'), createBlock('timeline'), createBlock('faq')],
    landing: [createBlock('hero'), createBlock('cards'), createBlock('stats'), createBlock('cta')],
    'home-section': [createBlock('hero'), createBlock('rewards'), createBlock('communities')],
    event: [createBlock('hero'), createBlock('timeline'), createBlock('cta')]
  }[type] || [createBlock('hero'), createBlock('text'), createBlock('cards'), createBlock('faq')]

  return {
    title,
    slug: slugifyPage(title),
    description: '',
    icon: 'fas fa-book-open',
    category: SITE_PAGE_TYPES.find(item => item.value === type)?.label || 'Informacion',
    type,
    status: 'draft',
    visibility: 'public',
    showInFooter: ['footer', 'legal'].includes(type),
    footerLabel: title,
    footerColumn: type === 'legal' ? 'legal' : 'informacion',
    footerOrder: 10,
    showInHome: type === 'home-section',
    homeSection: type === 'home-section' ? 'custom' : null,
    homeOrder: 10,
    theme: {
      mode: 'dark',
      accent: '#a855f7',
      visual: 'space',
      banner: ''
    },
    seo: {
      metaTitle: title,
      metaDescription: '',
      socialImage: '',
      noIndex: false
    },
    blocks,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

const legalPage = ({ title, slug, footerLabel, footerOrder, icon, description, blocks }) => ({
  ...pageTemplate('legal'),
  title,
  slug,
  description,
  icon,
  category: 'Legal',
  type: 'legal',
  status: 'draft',
  showInFooter: true,
  footerLabel,
  footerColumn: slug === 'normas-comunidad' ? 'comunidad' : slug === 'contacto-reportes' ? 'recursos' : 'legal',
  footerOrder,
  theme: {
    mode: 'dark',
    accent: '#c084fc',
    visual: 'space',
    banner: ''
  },
  seo: {
    metaTitle: `${title} | Galaxia Nintendera`,
    metaDescription: description,
    socialImage: '',
    noIndex: false
  },
  blocks: [
    block('hero', {
      eyebrow: 'Centro legal Galaxia Nintendera',
      title,
      text: description,
      primaryLabel: 'Volver al inicio',
      primaryUrl: '/',
      secondaryLabel: 'Comunidad',
      secondaryUrl: '/comunidad'
    }),
    ...blocks,
    block('cta', {
      title: 'Dudas, reportes o solicitudes',
      text: 'Si necesitas reportar contenido, solicitar eliminacion de datos o contactar con el equipo, usa la pagina de contacto y reportes.',
      label: 'Ir a contacto',
      url: '/contacto-reportes'
    })
  ]
})

const starterPage = ({ title, slug, footerLabel, footerColumn = 'informacion', footerOrder = 10, icon, description, type = 'info', accent = '#a855f7', blocks }) => ({
  ...pageTemplate(type),
  title,
  slug,
  description,
  icon,
  category: type === 'guide' ? 'Guia' : 'Informacion',
  type,
  status: 'draft',
  showInFooter: true,
  footerLabel,
  footerColumn,
  footerOrder,
  theme: {
    mode: 'dark',
    accent,
    visual: 'space',
    banner: ''
  },
  seo: {
    metaTitle: `${title} | Galaxia Nintendera`,
    metaDescription: description,
    socialImage: '',
    noIndex: false
  },
  blocks: [
    block('hero', {
      eyebrow: 'Galaxia Nintendera',
      title,
      text: description,
      primaryLabel: 'Ir a comunidad',
      primaryUrl: '/comunidad',
      secondaryLabel: 'Volver al inicio',
      secondaryUrl: '/'
    }),
    ...blocks
  ]
})

export const STARTER_PAGE_TEMPLATES = [
  starterPage({
    title: 'Sobre nosotros',
    slug: 'quienes-somos',
    footerLabel: 'Sobre nosotros',
    footerOrder: 1,
    icon: 'fas fa-satellite',
    accent: '#8b5cf6',
    description: 'La historia, vision y energia detras de Galaxia Nintendera.',
    blocks: [
      block('text', {
        body: 'Hola, soy Ronal, creador y fundador de Galaxia Nintendera.\n\nEstudie Ingenieria en Informatica en Chile y tambien hice un curso de programador en Espana. Me encantan los videojuegos, escuchar musica y, sobre todo, Nintendo. Galaxia Nintendera nace de esa mezcla: ganas de crear, compartir noticias, conversar y juntar personas que disfrutan este mundo tanto como yo.'
      }),
      block('cards', { title: 'Lo que queremos construir', items: [
        { id: id(), title: 'Una comunidad cercana', text: 'Un lugar donde hablar de Nintendo, juegos, noticias, directos y experiencias sin perder el buen ambiente.', icon: 'fas fa-users' },
        { id: id(), title: 'Un espacio para jugar juntos', text: 'La meta es reunir una comunidad grande para compartir partidas, eventos, opiniones y momentos especiales.', icon: 'fas fa-gamepad' },
        { id: id(), title: 'Un proyecto vivo', text: 'Galaxia Nintendera seguira creciendo con nuevas funciones, recompensas, perfiles, comunidades y formas de participar.', icon: 'fas fa-rocket' }
      ] }),
      block('timeline', { title: 'Nuestra ruta', items: [
        { id: id(), title: 'Crear una base solida', text: 'Noticias, guias, comunidad, perfiles y un sistema propio de recompensas.' },
        { id: id(), title: 'Escuchar a la comunidad', text: 'Mejorar la web con ideas reales de quienes la usan cada dia.' },
        { id: id(), title: 'Crecer juntos', text: 'Organizar mas dinamicas, eventos y espacios para que jugar juntos sea parte de la identidad del sitio.' }
      ] }),
      block('cta', { title: 'Gracias por estar aqui', text: 'Si te gusta Nintendo, los videojuegos y las comunidades con energia propia, esta galaxia tambien es tu casa.', label: 'Entrar a la comunidad', url: '/comunidad' })
    ]
  }),
  starterPage({
    title: 'Puntos Estrella',
    slug: 'puntos-estrella',
    footerLabel: 'Puntos Estrella',
    footerColumn: 'comunidad',
    footerOrder: 1,
    icon: 'fas fa-star',
    accent: '#facc15',
    type: 'guide',
    description: 'Como ganar, ver y canjear Puntos Estrella dentro de Galaxia Nintendera.',
    blocks: [
      block('text', {
        body: 'Los Puntos Estrella son una forma de reconocer la participacion dentro de Galaxia Nintendera. Puedes conseguirlos al leer articulos en la web y participar en experiencias que iremos ampliando con el tiempo.\n\nLa idea es que tu actividad tenga una recompensa visible y que tu perfil muestre parte de tu recorrido dentro de la comunidad.'
      }),
      block('rewards', { title: 'Como se consiguen', items: [
        { id: id(), value: '+10', label: 'Por leer articulos disponibles en la web', icon: 'far fa-newspaper' },
        { id: id(), value: 'Perfil', label: 'Puedes ver tu acumulado desde tu perfil', icon: 'far fa-user' },
        { id: id(), value: 'Canje', label: 'Cada cierta cantidad puedes desbloquear iconos', icon: 'fas fa-gift' }
      ] }),
      block('timeline', { title: 'Como funciona', items: [
        { id: id(), title: 'Lee articulos', text: 'Al entrar y leer contenido compatible, el sistema puede sumar Puntos Estrella a tu cuenta.' },
        { id: id(), title: 'Revisa tu perfil', text: 'Tu perfil muestra tu progreso, recompensas e iconos desbloqueados.' },
        { id: id(), title: 'Canjea iconos', text: 'Cuando tengas suficientes puntos, podras canjear iconos para personalizar tu presencia en la comunidad.' },
        { id: id(), title: 'Mas usos en el futuro', text: 'No descartamos nuevas implementaciones, recompensas, beneficios, eventos o dinamicas especiales.' }
      ] }),
      block('faq', { title: 'Preguntas frecuentes', items: [
        { id: id(), question: 'Para que sirven los Puntos Estrella?', answer: 'Sirven para desbloquear recompensas del perfil, como iconos, y para reflejar tu participacion en la web.' },
        { id: id(), question: 'Puedo perder mis puntos?', answer: 'La idea es que sean progresivos. Si en el futuro hay cambios importantes, se comunicaran dentro de la web.' },
        { id: id(), question: 'Habra mas recompensas?', answer: 'Si. El sistema queda preparado para nuevas recompensas e implementaciones cuando la comunidad crezca.' }
      ] })
    ]
  }),
  starterPage({
    title: 'Como funciona Galaxia Nintendera',
    slug: 'como-funciona',
    footerLabel: 'Como funciona',
    footerOrder: 2,
    icon: 'fas fa-circle-info',
    description: 'Una guia rapida para entender noticias, comunidad, perfiles y recompensas.',
    blocks: [
      block('cards', { title: 'Explora la galaxia', items: [
        { id: id(), title: 'Lee noticias y guias', text: 'Encuentra publicaciones sobre Nintendo, videojuegos, analisis, rumores y contenido especial.', icon: 'far fa-newspaper' },
        { id: id(), title: 'Participa en comunidades', text: 'Comenta, publica hilos, responde y comparte con otros usuarios.', icon: 'fas fa-comments' },
        { id: id(), title: 'Personaliza tu perfil', text: 'Desbloquea iconos, revisa tus puntos y muestra tu recorrido dentro de la web.', icon: 'far fa-user' }
      ] }),
      block('timeline', { title: 'Primeros pasos', items: [
        { id: id(), title: 'Crea tu cuenta', text: 'Puedes registrarte con Google o con correo verificado.' },
        { id: id(), title: 'Elige donde participar', text: 'Entra a comunidad, lee articulos o guarda tus publicaciones favoritas.' },
        { id: id(), title: 'Gana recompensas', text: 'Al usar la web puedes avanzar en el sistema de Puntos Estrella.' }
      ] }),
      block('cta', { title: 'Empieza por la comunidad', text: 'La comunidad oficial es el mejor lugar para saludar, probar funciones y compartir ideas.', label: 'Abrir comunidad', url: '/comunidad' })
    ]
  }),
  starterPage({
    title: 'Preguntas frecuentes',
    slug: 'faq',
    footerLabel: 'FAQ',
    footerColumn: 'recursos',
    footerOrder: 2,
    icon: 'far fa-circle-question',
    description: 'Respuestas rapidas sobre cuentas, comunidad, puntos y funcionamiento general.',
    blocks: [
      block('faq', { title: 'FAQ Galaxia Nintendera', items: [
        { id: id(), question: 'Necesito cuenta para leer?', answer: 'No siempre. Puedes navegar por muchas zonas publicas, pero para participar, guardar contenido o ganar recompensas necesitas iniciar sesion.' },
        { id: id(), question: 'Como verifico mi correo?', answer: 'Al crear cuenta con email, recibiras un correo de verificacion. Debes confirmarlo antes de entrar.' },
        { id: id(), question: 'Que son los Puntos Estrella?', answer: 'Son puntos de participacion que puedes ganar leyendo articulos y que sirven para desbloquear recompensas del perfil.' },
        { id: id(), question: 'Puedo reportar contenido?', answer: 'Si. Usa la pagina de Contacto y Reportes para avisar sobre usuarios, publicaciones, chats o problemas de copyright.' }
      ] })
    ]
  })
]

export const LEGAL_PAGE_TEMPLATES = [
  legalPage({
    title: 'Politica de Privacidad',
    slug: 'politica-privacidad',
    footerLabel: 'Privacidad',
    footerOrder: 1,
    icon: 'fas fa-lock',
    description: 'Como Galaxia Nintendera recopila, usa y protege datos de cuenta, perfil, comunidad y actividad.',
    blocks: [
      block('legal-text', { title: 'Ultima actualizacion', body: 'Fecha pendiente de revision. Esta plantilla es editable desde el panel admin.' }),
      block('legal-text', { title: 'Datos que recopilamos', body: 'Podemos recopilar datos de cuenta como nombre, correo electronico, proveedor de inicio de sesion, fecha de creacion, preferencias de perfil, icono seleccionado, estrellas, favoritos y actividad necesaria para que la plataforma funcione.\n\nTambien se pueden guardar comentarios, chats, publicaciones, respuestas, likes, reportes y datos tecnicos basicos asociados al uso de la comunidad.' }),
      block('legal-text', { title: 'Cuenta, perfil y contenido comunitario', body: 'Los datos de perfil permiten identificarte dentro de la comunidad. Los chats, comentarios y publicaciones son espacios comunitarios: los usuarios son responsables de lo que publican y Galaxia Nintendera puede moderar, ocultar, eliminar contenido o limitar cuentas cuando sea necesario.\n\nNo podemos garantizar revision inmediata de todos los mensajes, pero los reportes seran revisados lo antes posible.' }),
      block('legal-text', { title: 'Firebase, autenticacion y seguridad', body: 'La plataforma puede usar Firebase Authentication y Firestore para gestionar registro, inicio de sesion, perfiles, publicaciones, comentarios y permisos. Estos servicios ayudan a proteger cuentas, controlar accesos y mantener la integridad de la comunidad.\n\nAplicamos medidas razonables de seguridad, pero ningun sistema online puede garantizar proteccion absoluta.' }),
      block('legal-text', { title: 'Cookies, analytics y servicios externos', body: 'Podemos usar cookies necesarias para sesion, login, preferencias y funcionamiento tecnico. Si se integran herramientas de analisis, podrian tratar datos agregados de uso.\n\nEmbeds o servicios de terceros como YouTube, Twitch u otros reproductores pueden establecer sus propias cookies o tecnologias similares segun sus politicas.' }),
      block('legal-text', { title: 'Menores de edad', body: 'Los menores pueden usar Galaxia Nintendera solo con autorizacion y supervision de padres, madres o tutores legales. Al registrarse, el usuario declara tener la edad minima legal de su pais o contar con autorizacion parental.\n\nComo la web puede incluir chat, comentarios y comunidad, el uso por menores debe hacerse bajo responsabilidad y supervision de sus tutores. Galaxia Nintendera podra limitar, suspender o eliminar cuentas si detecta uso indebido, riesgo para menores o incumplimiento de normas.' }),
      block('legal-text', { title: 'Derechos del usuario', body: 'Puedes solicitar revision, correccion o eliminacion de datos cuando corresponda. Para pedir eliminacion de cuenta, contenido o datos personales, contacta con el equipo desde Contacto y Reportes indicando la informacion necesaria para localizar tu cuenta o contenido.' })
    ]
  }),
  legalPage({
    title: 'Terminos y Condiciones',
    slug: 'terminos-condiciones',
    footerLabel: 'Terminos',
    footerOrder: 2,
    icon: 'fas fa-scale-balanced',
    description: 'Condiciones de uso, responsabilidades del usuario y reglas generales para usar Galaxia Nintendera.',
    blocks: [
      block('legal-text', { title: 'Aceptacion de terminos', body: 'Al registrarte, iniciar sesion o usar Galaxia Nintendera aceptas estos terminos, la politica de privacidad y las normas de comunidad. Si no estas de acuerdo, no debes usar la plataforma.' }),
      block('legal-text', { title: 'Uso aceptado', body: 'Debes usar la web de forma legal, respetuosa y segura. Queda prohibido abusar del sistema, hacer spam, intentar atacar la plataforma, evadir moderacion, publicar malware, suplantar identidades, acosar usuarios o usar la comunidad para actividades ilegales.' }),
      block('legal-text', { title: 'Contenido generado por usuarios', body: 'Los usuarios son responsables de sus publicaciones, comentarios, mensajes de chat, perfiles e interacciones. Galaxia Nintendera puede moderar, editar visibilidad, eliminar contenido, silenciar temporalmente, suspender o bloquear cuentas si detecta abuso, riesgo o incumplimiento.' }),
      block('legal-text', { title: 'Menores de edad', body: 'Los menores pueden usar la plataforma solo con autorizacion y supervision de padres o tutores. Al registrarse, el usuario declara tener la edad minima legal requerida en su pais o contar con autorizacion parental. Galaxia Nintendera podra limitar, suspender o eliminar cuentas si detecta riesgo para menores, uso indebido o incumplimiento.' }),
      block('legal-text', { title: 'Cambios y disponibilidad', body: 'La plataforma puede cambiar funciones, reglas, recompensas, secciones, eventos o disponibilidad con el tiempo. Intentaremos mantener la informacion actualizada, pero no garantizamos continuidad permanente de cada funcion.' }),
      block('legal-text', { title: 'Limitacion de responsabilidad', body: 'Galaxia Nintendera no se hace responsable del contenido publicado por usuarios ni de decisiones tomadas por terceros a partir de noticias, rumores, opiniones o analisis. Usas la plataforma bajo tu responsabilidad y aceptas que la informacion puede cambiar.' })
    ]
  }),
  legalPage({
    title: 'Normas de la Comunidad',
    slug: 'normas-comunidad',
    footerLabel: 'Normas',
    footerOrder: 1,
    icon: 'fas fa-shield-halved',
    description: 'Reglas de convivencia para chats, comentarios, publicaciones, perfiles y comunidades.',
    blocks: [
      block('rules', { title: 'Conductas prohibidas', itemsText: 'Acoso, persecucion o ataques personales.\nInsultos graves, amenazas o intimidacion.\nRacismo, sexismo, LGTBIfobia, xenofobia u odio contra grupos protegidos.\nSpam, estafas, phishing, enlaces enganosos o publicidad no autorizada.\nContenido NSFW, sexual explicito o extremadamente violento.\nMalware, exploits, ataques tecnicos o intentos de robar cuentas.\nSuplantacion de identidad de usuarios, staff, marcas o creadores.\nSpoilers maliciosos publicados para arruinar experiencias.\nConductas toxicas repetidas aunque cada mensaje aislado parezca leve.' }),
      block('legal-text', { title: 'Chats, comentarios y publicaciones', body: 'Los espacios de chat, comentarios y comunidad existen para compartir con respeto. Galaxia Nintendera puede moderar o eliminar contenido, pero no puede garantizar revision inmediata de todos los mensajes. Los usuarios son responsables de lo que publican y deben reportar contenido o usuarios que incumplan normas.' }),
      block('legal-text', { title: 'Medidas de moderacion', body: 'Segun la gravedad o repeticion, el equipo puede aplicar advertencias, eliminacion de contenido, ocultacion de publicaciones, silenciamiento temporal, suspension de cuenta o bloqueo permanente. Tambien podremos limitar funciones si detectamos abuso, riesgo para menores o intentos de evadir sanciones.' }),
      block('legal-text', { title: 'Menores y seguridad', body: 'Los menores deben usar la comunidad con autorizacion y supervision de sus tutores. No compartas datos personales propios ni de otras personas. Si detectas una situacion peligrosa, acoso, grooming, amenazas o exposicion de datos, reportalo cuanto antes.' })
    ]
  }),
  legalPage({
    title: 'Politica de Cookies',
    slug: 'politica-cookies',
    footerLabel: 'Cookies',
    footerOrder: 3,
    icon: 'fas fa-cookie-bite',
    description: 'Informacion sobre cookies necesarias, sesion, analisis y servicios externos integrados.',
    blocks: [
      block('legal-text', { title: 'Que son las cookies', body: 'Las cookies son pequenos archivos o tecnologias similares que permiten recordar informacion del navegador, mantener sesiones, mejorar rendimiento o integrar servicios externos.' }),
      block('legal-text', { title: 'Cookies necesarias', body: 'Podemos usar cookies o almacenamiento local necesario para login, sesion, preferencias, seguridad, comunidad, favoritos, notificaciones y funcionamiento tecnico. Estas cookies son necesarias para prestar el servicio.' }),
      block('legal-text', { title: 'Analisis y terceros', body: 'Si se integran herramientas de analisis, pueden ayudarnos a entender el uso general de la web. Ademas, reproductores o embeds de terceros como YouTube, Twitch, SoundCloud u otros pueden establecer cookies propias segun sus politicas.' }),
      block('legal-text', { title: 'Gestion desde navegador', body: 'Puedes borrar o bloquear cookies desde la configuracion de tu navegador. Algunas funciones, como iniciar sesion, comentar o reproducir contenido externo, podrian dejar de funcionar correctamente si bloqueas cookies necesarias o de terceros.' })
    ]
  }),
  legalPage({
    title: 'Contacto y Reportes',
    slug: 'contacto-reportes',
    footerLabel: 'Contacto y reportes',
    footerOrder: 1,
    icon: 'far fa-envelope',
    description: 'Canales para contactar, reportar usuarios, publicaciones, mensajes, copyright o conductas peligrosas.',
    blocks: [
      block('contact-form', { title: 'Contacto general', text: 'Usa este canal para consultas, colaboraciones, soporte o solicitudes relacionadas con tu cuenta.', email: 'contacto@galaxianintendera.com' }),
      block('cards', { title: 'Tipos de reporte', items: [
        { id: id(), title: 'Reportar usuario', text: 'Indica el perfil, motivo y capturas si las tienes.', icon: 'fas fa-user-shield' },
        { id: id(), title: 'Reportar publicacion', text: 'Incluye enlace, titulo y razon del reporte.', icon: 'far fa-newspaper' },
        { id: id(), title: 'Reportar chat', text: 'Indica comunidad, fecha aproximada y usuario implicado.', icon: 'far fa-comments' },
        { id: id(), title: 'Copyright', text: 'Explica la obra afectada y acredita titularidad si corresponde.', icon: 'fas fa-copyright' }
      ] }),
      block('legal-text', { title: 'Revision de reportes', body: 'Los reportes seran revisados lo antes posible. Galaxia Nintendera puede eliminar contenido, limitar funciones o bloquear cuentas cuando detecte abuso, copyright, amenazas, conducta peligrosa o incumplimientos graves.' })
    ]
  }),
  legalPage({
    title: 'Aviso Legal y Descargo de Responsabilidad',
    slug: 'aviso-legal',
    footerLabel: 'Aviso legal',
    footerOrder: 4,
    icon: 'fas fa-circle-exclamation',
    description: 'Informacion sobre independencia del proyecto, marcas de Nintendo, rumores, opiniones y responsabilidad de usuarios.',
    blocks: [
      block('legal-text', { title: 'Proyecto independiente', body: 'Galaxia Nintendera es un proyecto independiente de fans. No esta afiliado oficialmente con Nintendo. Nintendo, sus marcas, personajes, juegos y logotipos pertenecen a Nintendo Co., Ltd. y a sus respectivos titulares.' }),
      block('legal-text', { title: 'Noticias, opiniones y rumores', body: 'El contenido puede incluir noticias, opiniones, analisis, rumores o filtraciones. La informacion puede cambiar con el tiempo y no siempre representa confirmaciones oficiales. Recomendamos contrastar comunicados oficiales cuando sea necesario.' }),
      block('legal-text', { title: 'Contenido de usuarios', body: 'La plataforma no se hace responsable del contenido publicado por usuarios. Al detectar abusos o incumplimientos, Galaxia Nintendera puede eliminar contenido, moderar publicaciones, limitar funciones o bloquear cuentas.' }),
      block('legal-text', { title: 'Uso de la plataforma', body: 'El acceso y uso de Galaxia Nintendera implica aceptar que la plataforma puede cambiar, corregir contenido, actualizar normas y aplicar medidas de seguridad o moderacion para proteger la comunidad.' })
    ]
  })
]

export const LEGAL_PAGE_SLUGS = LEGAL_PAGE_TEMPLATES.map(page => page.slug)
export const STARTER_PAGE_SLUGS = STARTER_PAGE_TEMPLATES.map(page => page.slug)
export const DEFAULT_SITE_PAGE_TEMPLATES = [...LEGAL_PAGE_TEMPLATES, ...STARTER_PAGE_TEMPLATES]

export const normalizeSitePage = (data = {}) => ({
  ...pageTemplate(data.type || 'info'),
  ...data,
  theme: { ...pageTemplate(data.type || 'info').theme, ...(data.theme || {}) },
  seo: { ...pageTemplate(data.type || 'info').seo, ...(data.seo || {}) },
  blocks: Array.isArray(data.blocks) ? data.blocks : []
})

export const listSitePages = async () => {
  const snap = await getDocs(collection(db, 'sitePages'))
  return snap.docs.map(item => ({ id: item.id, ...normalizeSitePage(item.data()) }))
}

export const getSitePageBySlug = async (slug) => {
  const pageQuery = query(collection(db, 'sitePages'), where('slug', '==', slug), limit(1))
  const snap = await getDocs(pageQuery)
  const first = snap.docs[0]
  return first ? { id: first.id, ...normalizeSitePage(first.data()) } : null
}

export const getDefaultLegalPageBySlug = (slug) => {
  const template = LEGAL_PAGE_TEMPLATES.find(page => page.slug === slug)
  return template ? normalizeSitePage({ ...template, id: `template-${slug}`, status: 'published' }) : null
}

export const getDefaultSitePageBySlug = (slug) => {
  const template = DEFAULT_SITE_PAGE_TEMPLATES.find(page => page.slug === slug)
  return template ? normalizeSitePage({ ...template, id: `template-${slug}`, status: 'published' }) : null
}

export const getSitePage = async (pageId) => {
  const snap = await getDoc(doc(db, 'sitePages', pageId))
  return snap.exists() ? { id: snap.id, ...normalizeSitePage(snap.data()) } : null
}

export const saveSitePage = async (page) => {
  const payload = normalizeSitePage({
    ...page,
    slug: slugifyPage(page.slug || page.title),
    updatedAt: Date.now()
  })
  const { id: pageId, ...data } = payload
  if (pageId) {
    await setDoc(doc(db, 'sitePages', pageId), data, { merge: true })
    return { id: pageId, ...data }
  }
  const created = await addDoc(collection(db, 'sitePages'), { ...data, createdAt: Date.now() })
  return { id: created.id, ...data }
}

export const deleteSitePage = (pageId) => deleteDoc(doc(db, 'sitePages', pageId))

export const seedMissingLegalPages = async ({ publish = false } = {}) => {
  const existing = await listSitePages()
  const existingSlugs = new Set(existing.map(page => page.slug))
  const created = []

  for (const template of LEGAL_PAGE_TEMPLATES) {
    if (existingSlugs.has(template.slug)) continue
    const saved = await saveSitePage({
      ...template,
      status: publish ? 'published' : 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    created.push(saved)
  }

  return created
}

export const seedMissingStarterPages = async ({ publish = false } = {}) => {
  const existing = await listSitePages()
  const existingSlugs = new Set(existing.map(page => page.slug))
  const created = []

  for (const template of STARTER_PAGE_TEMPLATES) {
    if (existingSlugs.has(template.slug)) continue
    const saved = await saveSitePage({
      ...template,
      status: publish ? 'published' : 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    created.push(saved)
  }

  return created
}

export const listFooterPages = async () => {
  const footerQuery = query(collection(db, 'sitePages'), where('showInFooter', '==', true))
  const snap = await getDocs(footerQuery)
  return snap.docs
    .map(item => ({ id: item.id, ...normalizeSitePage(item.data()) }))
    .filter(page => page.status === 'published')
    .sort((a, b) => Number(a.footerOrder || 0) - Number(b.footerOrder || 0))
}

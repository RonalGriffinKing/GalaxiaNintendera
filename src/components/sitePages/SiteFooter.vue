<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { FOOTER_COLUMNS, LEGAL_PAGE_SLUGS, listSitePages } from '@/services/sitePages'

const pages = ref([])
const managedSlugs = ref(new Set())
const defaultPages = [
  { id: 'about-default', title: 'Sobre nosotros', footerLabel: 'Sobre nosotros', slug: 'quienes-somos', footerColumn: 'informacion', footerOrder: 1, icon: 'fas fa-satellite' },
  { id: 'how-default', title: 'Como funciona', footerLabel: 'Como funciona', slug: 'como-funciona', footerColumn: 'informacion', footerOrder: 2, icon: 'fas fa-circle-info' },
  { id: 'points-default', title: 'Puntos Estrella', footerLabel: 'Puntos Estrella', slug: 'puntos-estrella', footerColumn: 'comunidad', footerOrder: 1, icon: 'fas fa-star' },
  { id: 'rules-default', title: 'Normas de comunidad', footerLabel: 'Normas', slug: 'normas-comunidad', footerColumn: 'comunidad', footerOrder: 2, icon: 'fas fa-shield-halved' },
  { id: 'privacy-default', title: 'Politica de privacidad', footerLabel: 'Privacidad', slug: 'politica-privacidad', footerColumn: 'legal', footerOrder: 1, icon: 'fas fa-lock' },
  { id: 'terms-default', title: 'Terminos y condiciones', footerLabel: 'Terminos', slug: 'terminos-condiciones', footerColumn: 'legal', footerOrder: 2, icon: 'fas fa-scale-balanced' },
  { id: 'cookies-default', title: 'Politica de cookies', footerLabel: 'Cookies', slug: 'politica-cookies', footerColumn: 'legal', footerOrder: 3, icon: 'fas fa-cookie-bite' },
  { id: 'notice-default', title: 'Aviso legal', footerLabel: 'Aviso legal', slug: 'aviso-legal', footerColumn: 'legal', footerOrder: 4, icon: 'fas fa-circle-exclamation' },
  { id: 'contact-default', title: 'Contacto y reportes', footerLabel: 'Contacto y reportes', slug: 'contacto-reportes', footerColumn: 'recursos', footerOrder: 1, icon: 'far fa-envelope' },
  { id: 'faq-default', title: 'FAQ', footerLabel: 'FAQ', slug: 'faq', footerColumn: 'recursos', footerOrder: 2, icon: 'far fa-circle-question' }
]

const pageTo = (page) => LEGAL_PAGE_SLUGS.includes(page.slug) ? `/${page.slug}` : `/p/${page.slug}`

const mergedPages = computed(() => {
  return [
    ...pages.value,
    ...defaultPages.filter(page => !managedSlugs.value.has(page.slug))
  ]
})

const groupedPages = computed(() => FOOTER_COLUMNS.map(column => ({
  ...column,
  pages: mergedPages.value
    .filter(page => (page.footerColumn || 'informacion') === column.value)
    .sort((a, b) => Number(a.footerOrder || 0) - Number(b.footerOrder || 0))
})).filter(group => group.pages.length))

const refreshFooterPages = async () => {
  const allPages = await listSitePages().catch(() => [])
  managedSlugs.value = new Set(allPages.map(page => page.slug).filter(Boolean))
  pages.value = allPages
    .filter(page => page.showInFooter && page.status === 'published')
    .sort((a, b) => Number(a.footerOrder || 0) - Number(b.footerOrder || 0))
}

onMounted(async () => {
  await refreshFooterPages()
  window.addEventListener('site-pages-updated', refreshFooterPages)
})

onUnmounted(() => {
  window.removeEventListener('site-pages-updated', refreshFooterPages)
})
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer-inner">
      <section class="footer-brand">
        <strong>Galaxia Nintendera</strong>
        <p>Comunidad, noticias, directos y experiencias para fans de Nintendo y videojuegos.</p>
      </section>
      <nav v-for="group in groupedPages" :key="group.value">
        <h3>{{ group.label }}</h3>
        <RouterLink v-for="page in group.pages" :key="page.id" :to="pageTo(page)">
          <i :class="page.icon || 'fas fa-link'"></i>
          {{ page.footerLabel || page.title }}
        </RouterLink>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background:
    radial-gradient(circle at 18% 0%, rgba(168, 85, 247, 0.18), transparent 30%),
    radial-gradient(circle at 86% 18%, rgba(236, 72, 153, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(5, 8, 22, 0.98), #030511);
  border-top: 1px solid rgba(168, 85, 247, 0.22);
  box-shadow: 0 -18px 60px rgba(0, 0, 0, 0.28);
  color: #fff;
  isolation: isolate;
  overflow: hidden;
  padding: 34px 18px calc(34px + env(safe-area-inset-bottom));
  position: relative;
  z-index: 3;
}

.site-footer-inner {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(220px, 1.2fr) repeat(auto-fit, minmax(150px, 1fr));
  margin: 0 auto;
  max-width: 1180px;
}

.footer-brand strong {
  display: block;
  font-size: 20px;
  font-weight: 950;
}

.footer-brand p {
  color: #aeb8d3;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.55;
  margin-top: 8px;
}

nav {
  display: grid;
  gap: 10px;
  align-content: start;
}

nav h3 {
  color: #c084fc;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

nav a {
  align-items: center;
  border-radius: 10px;
  color: #dbe4f0;
  display: inline-flex;
  font-size: 13px;
  font-weight: 850;
  gap: 8px;
  min-width: 0;
  padding: 7px 8px;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

nav a:hover {
  background: rgba(168, 85, 247, 0.12);
  color: #fff;
  transform: translateX(2px);
}

nav i {
  color: #a855f7;
  width: 16px;
}

@media (max-width: 720px) {
  .site-footer {
    padding-bottom: calc(112px + env(safe-area-inset-bottom));
  }
  .site-footer-inner {
    gap: 18px;
    grid-template-columns: 1fr 1fr;
  }
  .footer-brand {
    grid-column: 1 / -1;
  }
}
</style>

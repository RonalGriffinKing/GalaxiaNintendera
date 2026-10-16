<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageBlockRenderer from '@/components/sitePages/PageBlockRenderer.vue'
import { getDefaultSitePageBySlug, getSitePageBySlug } from '@/services/sitePages'

const route = useRoute()
const router = useRouter()
const page = ref(null)
const loading = ref(true)
const error = ref('')

const upsertMeta = (selector, attrs) => {
  const meta = document.querySelector(selector) || document.createElement('meta')
  Object.entries(attrs).forEach(([key, value]) => {
    if (value) meta.setAttribute(key, value)
  })
  document.head.appendChild(meta)
}

const loadPage = async () => {
  loading.value = true
  error.value = ''
  const slug = String(route.params.slug || route.meta?.slug || '')
  const found = await getSitePageBySlug(slug).catch((err) => {
    console.error(err)
    return null
  })
  const fallback = getDefaultSitePageBySlug(slug)
  const resolved = found ? (found.status === 'published' ? found : null) : fallback
  if (!resolved) {
    page.value = null
    error.value = 'No encontramos esta pagina.'
  } else {
    page.value = resolved
    const title = resolved.seo?.metaTitle || resolved.title
    const description = resolved.seo?.metaDescription || resolved.description || ''
    const image = resolved.seo?.socialImage || resolved.theme?.banner || ''
    document.title = `${title} | Galaxia Nintendera`
    upsertMeta('meta[name="description"]', { name: 'description', content: description })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: `${title} | Galaxia Nintendera` })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: resolved.seo?.noIndex ? 'noindex,nofollow' : 'index,follow' })
    if (image) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })
    }
  }
  loading.value = false
}

onMounted(loadPage)
watch(() => route.fullPath, loadPage)
</script>

<template>
  <main class="site-page" :style="{ '--page-accent': page?.theme?.accent || '#a855f7' }">
    <div class="site-page-bg" aria-hidden="true"></div>
    <section v-if="loading" class="site-page-state">
      <i class="fas fa-spinner fa-spin"></i>
      <strong>Cargando pagina...</strong>
    </section>
    <section v-else-if="error" class="site-page-state">
      <i class="far fa-face-frown"></i>
      <strong>{{ error }}</strong>
      <button type="button" @click="router.push('/')">Volver al inicio</button>
    </section>
    <article v-else class="site-page-content" :class="{ 'legal-page-content': page.type === 'legal' }">
      <PageBlockRenderer
        v-for="block in page.blocks"
        :key="block.id"
        :block="block"
        :page="page"
      />
    </article>
  </main>
</template>

<style scoped>
.site-page {
  background: #050816;
  color: #fff;
  min-height: 100vh;
  padding: calc(var(--public-nav-offset, 72px) + 28px) 18px 64px;
  position: relative;
}

.site-page-bg {
  background:
    radial-gradient(circle at 78% 4%, color-mix(in srgb, var(--page-accent) 28%, transparent), transparent 30%),
    radial-gradient(circle at 12% 28%, rgba(56, 189, 248, 0.14), transparent 34%),
    linear-gradient(135deg, #050816, #0b1028 48%, #170a32);
  inset: 0;
  position: fixed;
  z-index: 0;
}

.site-page-content {
  display: grid;
  gap: 24px;
  margin: 0 auto;
  max-width: 1180px;
  position: relative;
  z-index: 1;
}

.legal-page-content {
  gap: 16px;
  max-width: 960px;
}

.site-page-state {
  align-items: center;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 22px;
  color: #cbd5e1;
  display: grid;
  gap: 14px;
  justify-items: center;
  margin: 10vh auto 0;
  max-width: 520px;
  min-height: 260px;
  padding: 28px;
  position: relative;
  text-align: center;
  z-index: 1;
}

.site-page-state i {
  color: var(--page-accent);
  font-size: 34px;
}

.site-page-state strong {
  color: #fff;
  font-size: 20px;
  font-weight: 950;
}

.site-page-state button {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-radius: 999px;
  color: #fff;
  font-size: 13px;
  font-weight: 950;
  min-height: 42px;
  padding: 0 18px;
}

@media (max-width: 720px) {
  .site-page {
    padding: calc(var(--public-nav-offset, 64px) + 16px) 10px var(--public-page-bottom-mobile, 120px);
  }
}
</style>

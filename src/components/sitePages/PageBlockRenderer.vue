<script setup>
import { computed } from 'vue'

const props = defineProps({
  block: { type: Object, required: true },
  page: { type: Object, default: () => ({}) },
  preview: Boolean
})

const listItems = computed(() => String(props.block.itemsText || '').split('\n').map(item => item.trim()).filter(Boolean))
const galleryItems = computed(() => Array.isArray(props.block.items) ? props.block.items.filter(item => item.url || item.title || item.text || item.label || item.value) : [])
const videoEmbed = computed(() => {
  const url = String(props.block.url || '')
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : url
})
</script>

<template>
  <section class="site-block" :class="[`block-${block.type}`, page.type ? `page-${page.type}` : '', block.style?.variant ? `variant-${block.style.variant}` : '']">
    <template v-if="block.type === 'hero'">
      <div class="hero-copy">
        <span>{{ block.eyebrow || page.category || 'Galaxia Nintendera' }}</span>
        <h1>{{ block.title || page.title }}</h1>
        <p>{{ block.text || page.description }}</p>
        <div class="hero-actions" v-if="block.primaryLabel || block.secondaryLabel">
          <RouterLink v-if="block.primaryLabel" :to="block.primaryUrl || '/'">{{ block.primaryLabel }}</RouterLink>
          <RouterLink v-if="block.secondaryLabel" class="secondary" :to="block.secondaryUrl || '/'">{{ block.secondaryLabel }}</RouterLink>
        </div>
      </div>
      <img v-if="block.image" :src="block.image" alt="" />
      <div v-else class="hero-star"><i class="fas fa-star"></i></div>
    </template>

    <component :is="block.level || 'h2'" v-else-if="block.type === 'heading'">{{ block.text }}</component>
    <p v-else-if="block.type === 'text'" class="rich-text">{{ block.body }}</p>

    <figure v-else-if="block.type === 'image'">
      <img :src="block.url" :alt="block.alt || ''" />
      <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
    </figure>

    <div v-else-if="block.type === 'gallery'" class="gallery-grid">
      <article v-for="item in galleryItems" :key="item.id">
        <img v-if="item.url" :src="item.url" alt="" />
        <strong>{{ item.title }}</strong>
      </article>
    </div>

    <div v-else-if="block.type === 'video'" class="video-frame">
      <iframe v-if="videoEmbed" :src="videoEmbed" :title="block.title || 'Video'" allowfullscreen></iframe>
    </div>

    <div v-else-if="block.type === 'cards'" class="block-card-grid">
      <h2 v-if="block.title">{{ block.title }}</h2>
      <article v-for="item in galleryItems" :key="item.id">
        <i :class="item.icon || 'fas fa-star'"></i>
        <strong>{{ item.title }}</strong>
        <p>{{ item.text }}</p>
      </article>
    </div>

    <div v-else-if="block.type === 'faq'" class="faq-list">
      <h2 v-if="block.title">{{ block.title }}</h2>
      <details v-for="item in galleryItems" :key="item.id">
        <summary>{{ item.question || item.title }}</summary>
        <p>{{ item.answer || item.text }}</p>
      </details>
    </div>

    <div v-else-if="block.type === 'timeline'" class="timeline-list">
      <h2 v-if="block.title">{{ block.title }}</h2>
      <article v-for="(item, index) in galleryItems" :key="item.id">
        <span>{{ index + 1 }}</span>
        <strong>{{ item.title }}</strong>
        <p>{{ item.text }}</p>
      </article>
    </div>

    <div v-else-if="block.type === 'alert'" class="alert-block">
      <i class="fas fa-triangle-exclamation"></i>
      <span><strong>{{ block.title }}</strong><p>{{ block.text }}</p></span>
    </div>

    <div v-else-if="block.type === 'cta'" class="cta-block">
      <h2>{{ block.title }}</h2>
      <p>{{ block.text }}</p>
      <RouterLink :to="block.url || '/'">{{ block.label || 'Continuar' }}</RouterLink>
    </div>

    <hr v-else-if="block.type === 'separator'" />

    <div v-else-if="block.type === 'list' || block.type === 'rules'" class="list-block">
      <h2>{{ block.title }}</h2>
      <ul><li v-for="item in listItems" :key="item">{{ item }}</li></ul>
    </div>

    <div v-else-if="block.type === 'stats' || block.type === 'rewards'" class="stats-grid">
      <h2 v-if="block.title">{{ block.title }}</h2>
      <article v-for="item in galleryItems" :key="item.id">
        <i :class="item.icon || 'fas fa-star'"></i>
        <strong>{{ item.value }}</strong>
        <span>{{ item.label }}</span>
      </article>
    </div>

    <div v-else-if="block.type === 'footer-links'" class="footer-links-block">
      <h2>{{ block.title }}</h2>
      <RouterLink v-for="item in galleryItems" :key="item.id" :to="item.url || '/'">{{ item.label }}</RouterLink>
    </div>

    <div v-else-if="block.type === 'legal-text'" class="legal-copy">
      <h2>{{ block.title }}</h2>
      <p>{{ block.body }}</p>
    </div>

    <div v-else-if="block.type === 'contact-form'" class="contact-block">
      <h2>{{ block.title }}</h2>
      <p>{{ block.text }}</p>
      <a :href="`mailto:${block.email || ''}`">{{ block.email || 'contacto@galaxianintendera.com' }}</a>
    </div>

    <div v-else-if="block.type === 'tabs'" class="tabs-block">
      <h2>{{ block.title }}</h2>
      <article v-for="item in galleryItems" :key="item.id">
        <strong>{{ item.label }}</strong>
        <p>{{ item.text }}</p>
      </article>
    </div>

    <div v-else class="placeholder-block">
      <i class="fas fa-cubes"></i>
      <strong>{{ block.type }}</strong>
    </div>
  </section>
</template>

<style scoped>
.site-block { color: #f8fafc; text-align: left; }
.block-hero { align-items: center; background: radial-gradient(circle at 78% 18%, color-mix(in srgb, var(--page-accent, #a855f7) 38%, transparent), transparent 32%), linear-gradient(135deg, rgba(9, 11, 30, 0.96), rgba(35, 15, 70, 0.84)); border: 1px solid color-mix(in srgb, var(--page-accent, #a855f7) 34%, transparent); border-radius: 24px; display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr) minmax(180px, 320px); min-height: 360px; overflow: hidden; padding: clamp(24px, 5vw, 52px); }
.hero-copy span { color: var(--page-accent, #c084fc); font-size: 12px; font-weight: 950; text-transform: uppercase; }
.hero-copy h1 { font-size: clamp(34px, 6vw, 72px); font-weight: 950; line-height: 0.98; margin-top: 8px; max-width: 920px; }
.hero-copy p, .rich-text, .legal-copy p, .contact-block p, .list-block li { color: #cbd5e1; font-size: 16px; font-weight: 750; line-height: 1.75; text-align: left; white-space: pre-line; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
.hero-actions a, .cta-block a, .contact-block a { background: linear-gradient(135deg, var(--page-accent, #9333ea), #ec4899); border-radius: 999px; color: #fff; font-size: 13px; font-weight: 950; padding: 12px 18px; }
.hero-actions .secondary { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); }
.block-hero img { border-radius: 20px; box-shadow: 0 24px 60px rgba(0,0,0,0.35); max-height: 320px; object-fit: cover; width: 100%; }
.hero-star { align-items: center; aspect-ratio: 1; background: rgba(255,255,255,0.08); border-radius: 32px; color: #facc15; display: flex; font-size: 92px; justify-content: center; }
h2, h3 { font-weight: 950; line-height: 1.1; }
h2 { font-size: clamp(26px, 4vw, 42px); }
figure img, .video-frame iframe { border: 0; border-radius: 18px; width: 100%; }
figure img { max-height: 520px; object-fit: cover; }
figcaption { color: #94a3b8; font-size: 12px; font-weight: 800; margin-top: 8px; }
.gallery-grid, .block-card-grid, .stats-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
.block-card-grid h2, .faq-list h2, .timeline-list h2, .stats-grid h2 { grid-column: 1 / -1; }
.gallery-grid article, .block-card-grid article, .stats-grid article, .tabs-block article, .timeline-list article, .faq-list details { background: rgba(15, 23, 42, 0.72); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 16px; }
.gallery-grid img { aspect-ratio: 16 / 10; border-radius: 12px; object-fit: cover; width: 100%; }
.block-card-grid i, .stats-grid i { color: var(--page-accent, #c084fc); font-size: 28px; }
.block-card-grid strong, .stats-grid strong, .timeline-list strong { display: block; font-size: 17px; font-weight: 950; margin-top: 10px; }
.block-card-grid p, .timeline-list p, .tabs-block p, .faq-list p { color: #cbd5e1; font-size: 13px; font-weight: 750; line-height: 1.55; margin-top: 6px; }
.faq-list, .timeline-list, .list-block, .tabs-block, .legal-copy, .contact-block { display: grid; gap: 12px; }
summary { cursor: pointer; font-weight: 950; }
.timeline-list article { display: grid; gap: 8px; grid-template-columns: 36px minmax(0, 1fr); }
.timeline-list article p { grid-column: 2; }
.timeline-list article span { align-items: center; background: var(--page-accent, #7c3aed); border-radius: 999px; display: flex; font-weight: 950; height: 32px; justify-content: center; width: 32px; }
.alert-block, .cta-block { background: color-mix(in srgb, var(--page-accent, #a855f7) 16%, rgba(15, 23, 42, 0.82)); border: 1px solid color-mix(in srgb, var(--page-accent, #a855f7) 35%, transparent); border-radius: 18px; padding: 22px; }
.alert-block { display: flex; gap: 14px; }
.alert-block i { color: #facc15; font-size: 24px; }
.cta-block { text-align: center; }
.cta-block p { color: #cbd5e1; margin: 8px auto 18px; max-width: 680px; }
hr { border: 0; border-top: 1px solid rgba(255,255,255,0.14); }
.list-block ul { display: grid; gap: 10px; margin-left: 20px; }
.stats-grid article { text-align: center; }
.stats-grid span { color: #cbd5e1; display: block; font-size: 12px; font-weight: 850; }
.footer-links-block { display: flex; flex-wrap: wrap; gap: 10px; }
.footer-links-block h2 { width: 100%; }
.footer-links-block a { background: rgba(255,255,255,0.08); border-radius: 999px; color: #e9d5ff; font-weight: 900; padding: 10px 14px; }
.video-frame { aspect-ratio: 16 / 9; }
.video-frame iframe { height: 100%; }
.page-legal.block-hero {
  background:
    radial-gradient(circle at 92% 0%, color-mix(in srgb, var(--page-accent, #a855f7) 30%, transparent), transparent 34%),
    linear-gradient(135deg, rgba(12, 15, 38, 0.98), rgba(31, 16, 63, 0.9));
  grid-template-columns: 1fr;
  min-height: 0;
  padding: clamp(28px, 5vw, 48px);
}

.page-legal.block-hero .hero-copy {
  max-width: 820px;
}

.page-legal.block-hero .hero-copy h1 {
  font-size: clamp(34px, 5vw, 58px);
  letter-spacing: 0;
  line-height: 1.04;
}

.page-legal.block-hero .hero-copy p {
  color: #d8e0f4;
  font-size: clamp(15px, 2vw, 18px);
  line-height: 1.65;
  margin-top: 12px;
  max-width: 760px;
}

.page-legal.block-hero .hero-star,
.page-legal.block-hero img {
  display: none;
}

.page-legal.block-legal-text,
.page-legal.block-rules,
.page-legal.block-contact-form,
.page-legal.block-cards,
.page-legal.block-faq,
.page-legal.block-cta {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.028)),
    rgba(8, 12, 30, 0.76);
  border: 1px solid rgba(192, 132, 252, 0.16);
  border-radius: 18px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.18);
  padding: clamp(20px, 3vw, 30px);
}

.page-legal.block-legal-text {
  display: block;
}

.page-legal .legal-copy h2,
.page-legal .list-block h2,
.page-legal .contact-block h2,
.page-legal .block-card-grid h2,
.page-legal .faq-list h2 {
  color: #ffffff;
  font-size: clamp(22px, 3vw, 30px);
  line-height: 1.16;
  margin: 0 0 12px;
  max-width: 780px;
}

.page-legal .legal-copy h2::before,
.page-legal .list-block h2::before,
.page-legal .contact-block h2::before,
.page-legal .block-card-grid h2::before,
.page-legal .faq-list h2::before {
  background: linear-gradient(180deg, var(--page-accent, #a855f7), #ec4899);
  border-radius: 999px;
  content: '';
  display: inline-block;
  height: 1.1em;
  margin-right: 10px;
  vertical-align: -0.16em;
  width: 5px;
}

.page-legal .legal-copy p,
.page-legal .contact-block p,
.page-legal .list-block li {
  color: #d6deef;
  font-size: clamp(14.5px, 1.5vw, 16px);
  line-height: 1.78;
  max-width: 820px;
}

.page-legal .list-block ul {
  list-style: none;
  margin: 0;
}

.page-legal .list-block li {
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px 12px 38px;
  position: relative;
}

.page-legal .list-block li::before {
  background: var(--page-accent, #a855f7);
  border-radius: 999px;
  content: '';
  height: 8px;
  left: 16px;
  position: absolute;
  top: 21px;
  width: 8px;
}

.page-legal .block-card-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.page-legal .block-card-grid article,
.page-legal .faq-list details {
  background: rgba(255, 255, 255, 0.045);
  border-color: rgba(255, 255, 255, 0.1);
  border-radius: 14px;
}

.page-legal.block-cta {
  text-align: left;
}

.page-legal.block-cta .cta-block {
  background: transparent;
  border: 0;
  padding: 0;
  text-align: left;
}

.page-legal.block-cta .cta-block p {
  margin-left: 0;
  margin-right: 0;
}

@media (max-width: 720px) {
  .block-hero { grid-template-columns: 1fr; min-height: 0; padding: 24px; }
  .hero-star { display: none; }
  .hero-copy h1 { font-size: clamp(34px, 12vw, 48px); }
  .page-legal.block-hero .hero-copy h1 { font-size: clamp(30px, 10vw, 42px); }
  .page-legal.block-legal-text,
  .page-legal.block-rules,
  .page-legal.block-contact-form,
  .page-legal.block-cards,
  .page-legal.block-faq,
  .page-legal.block-cta {
    border-radius: 16px;
    padding: 18px;
  }
}
</style>

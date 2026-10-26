<script setup>
import { compactPostCategory } from '@/services/postCategoryDisplay'
import { computed } from 'vue'
import { useVisualThemes } from '@/composables/useVisualThemes'
import { themeDecoration, postWebThemeCss } from '@/services/visualThemes'
import SeasonalThemeDecor from './SeasonalThemeDecor.vue'
import { normalizeHomeHero } from '@/services/homeHero'
import { titleRuns } from '@/services/socialContent'
import { defaultBannerUrl, resolveAssetUrl } from '@/constants/assets'
import { isVideoMedia, mediaFromUrl } from '@/services/mediaLinks'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'

const props = defineProps({
  showActions: { type: Boolean, default: true },
  editorial: { type: Boolean, default: false },
  post: {
    type: Object,
    default: () => ({})
  },
  authorProfile: {
    type: Object,
    default: null
  },
  authorIcon: {
    type: String,
    default: ''
  },
  authorIconMeta: {
    type: Object,
    default: () => ({})
  },
  isAnalysis: {
    type: Boolean,
    default: false
  },
  analysisScore: {
    type: Number,
    default: 0
  },
  analysisTier: {
    type: Object,
    default: () => ({ key: 'normal', label: 'Post' })
  },
  readStatus: {
    type: Object,
    default: () => ({ viewed: false, awarded: false })
  },
  readBadgeText: {
    type: String,
    default: ''
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  savingFavorite: {
    type: Boolean,
    default: false
  },
  dateLabel: {
    type: String,
    default: ''
  },
  preview: {
    type: Boolean,
    default: false
  },
  device: {
    type: String,
    default: 'desktop'
  }
})

const emit = defineEmits(['favorite', 'profile', 'share', 'copy', 'home', 'news'])
const {theme:visualTheme,enabled:themeEnabled}=useVisualThemes(()=>props.post,{preferLocal:props.preview})
const visualCss=computed(()=>themeEnabled.value.web?postWebThemeCss(props.post,visualTheme.value):{})

const coverMedia = computed(() => mediaFromUrl(props.post.image))
const categoryLabel = computed(() => compactPostCategory(props.post))
const authorName = computed(() => props.post.authorName || props.authorProfile?.name || 'Redactor')
const badgeLabel = computed(() => props.isAnalysis ? 'Analisis Premium' : categoryLabel.value)
const gameDetails = computed(() => props.post.game || {})
const platformLabel = computed(() => props.post.platform || props.post.platformName || gameDetails.value.nameEs || gameDetails.value.nameEn || '')
const gamePlatforms = computed(() => (Array.isArray(gameDetails.value.platforms) ? gameDetails.value.platforms : [])
  .map(platform => {
    if (typeof platform === 'string') return { name: platform.replace(/\?$/, '').trim(), confirmed: !platform.trim().endsWith('?') }
    return {
      name: String(platform?.name || platform?.label || '').trim(),
      confirmed: platform?.confirmed !== false && platform?.status !== 'unconfirmed'
    }
  })
  .filter(platform => platform.name))
const gameLinks = computed(() => (Array.isArray(gameDetails.value.officialLinks) ? gameDetails.value.officialLinks : [])
  .filter(link => link?.url && /^https?:\/\//i.test(link.url)))
const officialGameUrl = computed(() => {
  const directUrl = String(gameDetails.value.officialUrl || '')
  if (/^https?:\/\//i.test(directUrl)) return directUrl
  return gameLinks.value.find(link => /web oficial/i.test(link.label || ''))?.url || gameLinks.value[0]?.url || ''
})
const platformIcon = (platform = '') => {
  const value = platform.toLowerCase()
  if (value.includes('playstation') || value.includes('ps5') || value.includes('ps4')) return 'fab fa-playstation'
  if (value.includes('xbox')) return 'fab fa-xbox'
  if (value.includes('windows') || value === 'pc' || value.includes('steam')) return 'fas fa-desktop'
  if (value.includes('ios') || value.includes('mac')) return 'fab fa-apple'
  if (value.includes('android')) return 'fab fa-android'
  if (value.includes('switch') || value.includes('nintendo')) return 'fas fa-gamepad'
  return 'fas fa-gamepad'
}
const heroStyle = computed(() => ({
  ...visualCss.value,
  '--post-image-position': normalizeHomeHero(props.post.hero).position,
  '--post-hero-image': `url("${resolveAssetUrl(coverMedia.value.url, defaultBannerUrl)}")`
}))
const scoreTone = computed(() => {
  const score = Number(props.analysisScore || 0)
  if (score >= 95) return 'score-intense-gold'
  if (score >= 85) return 'score-soft-gold'
  if (score >= 75) return 'score-purple'
  if (score >= 65) return 'score-blue'
  return 'score-dark'
})
</script>





<template>
  <section
    class="post-cinematic-hero"
    :class="[
      Object.keys(visualCss).length ? 'visual-themed' : '',
      isAnalysis ? 'is-analysis' : 'is-standard',
      isAnalysis ? `analysis-tier-${analysisTier.key}` : '',
      isAnalysis ? scoreTone : '',
      preview ? 'is-preview' : '',
      editorial ? 'is-editorial' : '',
      preview ? `preview-${device}` : ''
    ]"
    :style="heroStyle"
  >
    <div class="hero-backdrop" aria-hidden="true">
      <div v-if="post.image" class="hero-media" :class="{ video: isVideoMedia(coverMedia) }">
        <iframe
          v-if="coverMedia.type === 'youtube'"
          :src="coverMedia.embedUrl"
          title="Video del post"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
        <video v-else-if="coverMedia.type === 'video'" :src="coverMedia.url" muted playsinline loop></video>
        <img v-else :src="coverMedia.url" alt="" fetchpriority="high" decoding="async" />
      </div>
    </div>

    <div class="hero-pattern" aria-hidden="true">
      <span v-for="tile in 18" :key="tile">{{ isAnalysis ? analysisTier.label : categoryLabel }}</span>
    </div>

    <SeasonalThemeDecor v-if="themeEnabled.web" :season="themeDecoration(visualTheme)" />
    <div class="hero-content">
      <nav v-if="!preview" class="hero-breadcrumb">
        <button type="button" @click="emit('home')">Inicio</button>
        <span>/</span>
        <button type="button" @click="emit('news')">Noticias</button>
        <span>/</span>
        <span>{{ categoryLabel }}</span>
      </nav>

      <div class="hero-badges">
        <span class="hero-pill hero-primary-pill">
          <i :class="isAnalysis ? 'fas fa-crown' : 'fas fa-gamepad'"></i>
          {{ badgeLabel }}
        </span>
        <a
          v-if="platformLabel && officialGameUrl"
          class="hero-pill hero-game-link"
          :href="preview ? undefined : officialGameUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click="preview && $event.preventDefault()"
        >
          {{ platformLabel }}
          <i class="fas fa-arrow-up-right-from-square"></i>
        </a>
        <span v-else-if="platformLabel" class="hero-pill">{{ platformLabel }}</span>
        <span v-if="isAnalysis" class="hero-mini-score">
          {{ analysisScore }}
          <small>{{ analysisTier.label }}</small>
        </span>
      </div>

      <div class="hero-copy">
        <h1><span v-for="(run,index) in titleRuns(post.title || 'Titulo de la publicacion',post.titleHighlights)" :key="index" :class="{'visual-title-highlight':run.highlighted}">{{run.text}}</span></h1>
      </div>

      <div v-if="gamePlatforms.length" class="hero-platforms" aria-label="Plataformas">
          <span
            v-for="platform in gamePlatforms"
            :key="platform.name"
            :class="{ unconfirmed: !platform.confirmed }"
            :title="platform.confirmed ? '' : 'Plataforma todavia no anunciada oficialmente'"
          >
            <small v-if="!platform.confirmed">Pendiente de confirmar</small>
            <i :class="platformIcon(platform.name)"></i>
            {{ platform.name }}
          </span>
      </div>

      <div class="hero-footer">
        <button
          v-if="post.authorId && !preview"
          class="hero-author"
          type="button"
          @click="emit('profile', post.authorId)"
        >
          <ProfileAvatar
            class="hero-avatar"
            :src="authorIcon"
            :alt="authorName"
            :label="authorName"
            :effect="authorIconMeta"
          />
          <span>
            <strong>{{ authorName }}</strong>
            <small>{{ dateLabel }}</small>
          </span>
        </button>

        <div v-else class="hero-author static">
          <ProfileAvatar
            v-if="authorIcon"
            class="hero-avatar"
            :src="authorIcon"
            :alt="authorName"
            :label="authorName"
            :effect="authorIconMeta"
          />
          <em v-else>{{ authorName.charAt(0).toUpperCase() }}</em>
          <span>
            <strong>{{ authorName }}</strong>
            <small>{{ dateLabel || 'Hoy' }}</small>
          </span>
        </div>

        <div v-if="showActions" class="hero-actions" :class="{ 'has-read-state': readBadgeText }">
          <div
            v-if="readBadgeText"
            class="hero-read-state"
            :class="{ earned: readStatus.awarded, viewed: readStatus.viewed && !readStatus.awarded }"
          >
            <i :class="readStatus.awarded ? 'fas fa-star' : 'far fa-star'"></i>
            <span>{{ readBadgeText }}</span>
          </div>

          <button type="button" class="hero-action" :class="{ active: isFavorite }" :disabled="savingFavorite || preview" @click="emit('favorite')">
            <i :class="isFavorite ? 'fas fa-bookmark' : 'far fa-bookmark'"></i>
            <span>{{ isFavorite ? 'Guardado' : 'Guardar' }}</span>
          </button>
          <button type="button" class="hero-action icon-only" :disabled="preview" aria-label="Compartir" @click="emit('copy')">
            <i class="fas fa-share-nodes"></i>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.post-cinematic-hero {
  --hero-accent: #a855f7;
  --hero-accent-soft: rgba(168, 85, 247, 0.32);
  --hero-accent-glow: rgba(168, 85, 247, 0.44);
  background:
    radial-gradient(circle at 72% 4%, var(--hero-accent-soft), transparent 30%),
    linear-gradient(135deg, rgba(7, 10, 22, 0.96), rgba(17, 24, 39, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 26px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42), 0 0 70px var(--hero-accent-glow);
  color: #ffffff;
  min-height: clamp(520px, 62vh, 660px);
  overflow: hidden;
  position: relative;
  isolation: isolate;
}

.post-cinematic-hero.is-analysis {
  --hero-accent: #facc15;
  --hero-accent-soft: rgba(250, 204, 21, 0.34);
  --hero-accent-glow: rgba(245, 158, 11, 0.36);
  background:
    radial-gradient(circle at 78% 6%, rgba(254, 240, 138, 0.28), transparent 28%),
    radial-gradient(circle at 16% 22%, rgba(217, 119, 6, 0.22), transparent 34%),
    linear-gradient(135deg, #100b04, #1d1408 46%, #3b2406);
  border-color: rgba(250, 204, 21, 0.32);
}

.post-cinematic-hero.score-intense-gold {
  --hero-accent: #fde047;
  --hero-accent-glow: rgba(250, 204, 21, 0.56);
}

.post-cinematic-hero.score-purple {
  --hero-accent: #c084fc;
  --hero-accent-glow: rgba(168, 85, 247, 0.48);
  border-color: rgba(192, 132, 252, 0.34);
}

.post-cinematic-hero.score-blue {
  --hero-accent: #38bdf8;
  --hero-accent-glow: rgba(56, 189, 248, 0.4);
  border-color: rgba(56, 189, 248, 0.26);
}

.post-cinematic-hero.score-dark {
  --hero-accent: #94a3b8;
  --hero-accent-glow: rgba(51, 65, 85, 0.46);
  border-color: rgba(148, 163, 184, 0.22);
}

.hero-backdrop,
.hero-media,
.hero-pattern {
  inset: 0;
  position: absolute;
}

.hero-backdrop {
  background: #020617;
  z-index: -3;
}

.hero-media {
  filter: saturate(1.14) contrast(1.04);
  opacity: 1;
  transform: scale(1.02);
  z-index: -4;
}

.hero-media img,
.hero-media iframe,
.hero-media video {
  border: 0;
  height: 100%;
  object-fit: cover;
  object-position: center;
  width: 100%;
}

.hero-media::after {
  background:
    radial-gradient(circle at 74% 10%, color-mix(in srgb, var(--hero-accent) 18%, transparent), transparent 25%),
    linear-gradient(90deg, rgba(2, 6, 23, 0.96) 0%, rgba(2, 6, 23, 0.78) 38%, rgba(2, 6, 23, 0.28) 66%, rgba(2, 6, 23, 0.08) 100%),
    linear-gradient(0deg, rgba(2, 6, 23, 0.96) 0%, rgba(2, 6, 23, 0.58) 34%, rgba(2, 6, 23, 0.18) 72%, rgba(2, 6, 23, 0.3) 100%);
  content: "";
  inset: 0;
  position: absolute;
}

.is-analysis .hero-media::after {
  background:
    radial-gradient(circle at 72% 12%, rgba(250, 204, 21, 0.24), transparent 28%),
    radial-gradient(circle at 18% 72%, rgba(217, 119, 6, 0.18), transparent 32%),
    linear-gradient(90deg, rgba(18, 10, 2, 0.94) 0%, rgba(33, 20, 4, 0.74) 38%, rgba(54, 33, 5, 0.22) 68%, rgba(54, 33, 5, 0.08) 100%),
    linear-gradient(0deg, rgba(6, 4, 1, 0.96) 0%, rgba(25, 15, 3, 0.5) 36%, rgba(25, 15, 3, 0.14) 72%, rgba(35, 22, 5, 0.24) 100%);
}

.hero-pattern {
  display: none;
}

.hero-pattern span {
  color: var(--hero-accent);
  font-size: clamp(44px, 6vw, 98px);
  font-weight: 950;
  line-height: 0.9;
  text-transform: uppercase;
  white-space: nowrap;
}

.hero-content {
  display: grid;
  gap: 18px;
  grid-template-rows: auto auto 1fr auto auto;
  min-height: inherit;
  padding: clamp(22px, 3vw, 34px) clamp(28px, 4vw, 46px) clamp(26px, 4vw, 44px);
  position: relative;
  z-index: 1;
}

.hero-breadcrumb {
  align-items: center;
  align-self: start;
  color: rgba(226, 232, 240, 0.82);
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  margin-bottom: 0;
  text-shadow: 0 8px 22px rgba(0, 0, 0, 0.72);
}

.hero-breadcrumb button:hover {
  color: var(--hero-accent);
}

.hero-badges,
.hero-actions,
.hero-footer,
.hero-author {
  align-items: center;
  display: flex;
}

.hero-badges {
  flex-wrap: wrap;
  gap: 12px;
}

.hero-pill,
.hero-mini-score,
.hero-action,
.hero-read-state {
  background: rgba(2, 6, 23, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 12px 28px rgba(0, 0, 0, 0.22);
}

.hero-pill {
  align-items: center;
  color: #f8fafc;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 34px;
  padding: 0 14px;
  text-transform: uppercase;
}

.hero-primary-pill {
  background: color-mix(in srgb, var(--hero-accent) 34%, rgba(2, 6, 23, 0.88));
  border-color: color-mix(in srgb, var(--hero-accent) 64%, transparent);
  color: #fff7ed;
}

.hero-primary-pill i {
  color: var(--hero-accent);
}

.hero-game-link {
  text-decoration: none;
}

.hero-game-link:hover {
  border-color: var(--hero-accent);
}

.hero-game-link i {
  color: var(--hero-accent);
  font-size: 9px;
}

.hero-mini-score {
  align-items: center;
  color: var(--hero-accent);
  display: none;
  font-size: 16px;
  font-weight: 950;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
}

.hero-mini-score small {
  color: #fff7d6;
  font-size: 9px;
  font-weight: 950;
  text-transform: uppercase;
}

.hero-copy {
  align-self: end;
  max-width: 760px;
}

.hero-copy h1 {
  color: #ffffff;
  font-size: clamp(34px, 4.35vw, 60px);
  font-weight: 950;
  line-height: 1.02;
  margin: 0;
  text-shadow: 0 20px 54px rgba(0, 0, 0, 0.58);
}

.hero-platforms {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 13px;
  width: min(100%, 820px);
}

.hero-platforms > span {
  align-items: center;
  backdrop-filter: blur(10px);
  background: color-mix(in srgb, var(--hero-accent) 24%, rgba(2, 6, 23, 0.82));
  border: 1px solid color-mix(in srgb, var(--hero-accent) 64%, transparent);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 7px;
  min-height: 30px;
  padding: 0 11px;
  position: relative;
}

.hero-platforms i {
  color: var(--hero-accent);
}

.hero-platforms > span.unconfirmed {
  filter: saturate(0.55);
  opacity: 0.52;
}

.hero-platforms > span small {
  color: #ffffff;
  font-size: 7px;
  font-weight: 950;
  left: 8px;
  position: absolute;
  text-transform: uppercase;
  top: -13px;
  white-space: nowrap;
}

.hero-footer {
  align-self: end;
  flex-wrap: wrap;
  gap: 18px;
  justify-content: space-between;
  width: min(100%, 820px);
}

.hero-author {
  color: #ffffff;
  gap: 12px;
  min-width: 0;
  text-align: left;
}

.hero-avatar {
  --avatar-size: 48px;
  --avatar-border: 2px;
}

.hero-author em {
  align-items: center;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  display: flex;
  flex: 0 0 48px;
  font-size: 15px;
  font-style: normal;
  font-weight: 950;
  height: 48px;
  justify-content: center;
  width: 48px;
}

.hero-author span {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.hero-author strong {
  color: #ffffff;
  font-size: 15px;
  font-weight: 950;
}

.hero-author small {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 800;
}

.hero-actions {
  flex-wrap: wrap;
  gap: 10px;
}

.hero-action,
.hero-read-state {
  align-items: center;
  color: #f8fafc;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  line-height: 1;
}

.hero-action.active,
.hero-read-state.earned {
  background: color-mix(in srgb, var(--hero-accent) 34%, rgba(2, 6, 23, 0.88));
  border-color: color-mix(in srgb, var(--hero-accent) 66%, transparent);
  color: #fff7d6;
}

.hero-action i,
.hero-read-state i {
  color: var(--hero-accent);
}

.hero-action.icon-only {
  justify-content: center;
  padding: 0;
  width: 44px;
}

.post-cinematic-hero.is-preview {
  border-radius: 18px;
  min-height: 360px;
}

.is-preview .hero-content {
  padding: 26px;
}

.is-preview .hero-copy h1 {
  font-size: clamp(30px, 5vw, 48px);
}

.preview-mobile {
  border-radius: 0;
  min-height: 560px;
}

.preview-mobile .hero-content {
  padding: 18px 14px 24px;
}

.preview-mobile .hero-copy h1 {
  font-size: 32px;
}

@media (max-width: 860px) {
  .post-cinematic-hero {
    border-radius: 18px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.42);
    min-height: clamp(570px, 82svh, 660px);
  }

  .hero-backdrop {
    background: #020617;
  }

  .hero-media {
    opacity: 1;
  }

  .hero-media::after {
    background:
      linear-gradient(0deg, #020617 0%, rgba(2, 6, 23, 0.98) 33%, rgba(2, 6, 23, 0.38) 62%, rgba(2, 6, 23, 0.12) 100%),
      radial-gradient(circle at 50% 16%, color-mix(in srgb, var(--hero-accent) 14%, transparent), transparent 32%);
  }

  .is-analysis .hero-media::after {
    background:
      radial-gradient(circle at 62% 8%, rgba(250, 204, 21, 0.22), transparent 30%),
      linear-gradient(0deg, #050300 0%, rgba(18, 11, 2, 0.96) 31%, rgba(42, 25, 4, 0.4) 64%, rgba(42, 25, 4, 0.12) 100%);
  }

  .hero-pattern {
    display: none;
  }

  .hero-content {
    gap: 16px;
    padding: 14px 18px 24px;
    grid-template-rows: auto auto 1fr auto auto;
  }

  .hero-breadcrumb {
    font-size: 11px;
  }

  .hero-copy h1 {
    font-size: clamp(28px, 8.4vw, 38px);
    line-height: 1.06;
    max-width: 100%;
    overflow-wrap: break-word;
    text-wrap: balance;
  }

  .hero-copy {
    max-width: 100%;
  }

  .hero-platforms > span {
    font-size: 10px;
    min-height: 28px;
    padding: 0 9px;
  }

  .hero-mini-score {
    display: inline-flex;
  }

  .hero-footer {
    align-items: flex-start;
    display: grid;
    gap: 16px;
  }

  .hero-actions {
    display: grid;
    grid-template-columns: minmax(106px, auto) minmax(96px, auto) 44px;
    width: 100%;
  }

  .hero-read-state,
  .hero-action {
    justify-content: center;
    min-width: 0;
    padding: 0 12px;
  }
}

@media (max-width: 420px) {
  .post-cinematic-hero {
    border-radius: 17px;
  }

  .hero-content {
    padding: 13px 16px 22px;
  }

  .hero-badges {
    gap: 8px;
  }

  .hero-pill {
    font-size: 10px;
    min-height: 30px;
    padding: 0 10px;
  }

  .hero-mini-score {
    font-size: 15px;
    min-height: 30px;
    padding: 0 10px;
  }

  .hero-copy h1 {
    font-size: clamp(27px, 8.1vw, 34px);
    line-height: 1.08;
  }

  .hero-actions {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 42px;
  }

  .hero-action span,
  .hero-read-state span {
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-media {
    transform: none;
  }
}

/* Keep long article headlines readable without a full-screen tablet cover. */
@media(min-width:761px) and (max-width:1440px){
 .post-cinematic-hero:not(.is-preview) { min-height:400px; }
 .post-cinematic-hero:not(.is-preview) .hero-content { padding:22px 24px; gap:14px; }
 .post-cinematic-hero:not(.is-preview) .hero-copy h1 { font-size:clamp(28px,2.65vw,36px); line-height:1.15; overflow-wrap:break-word; }
 .post-cinematic-hero:not(.is-preview) .hero-footer { flex-wrap:wrap; gap:14px; }
}

@media(min-width:1441px){
 .post-cinematic-hero:not(.is-preview) { min-height:480px; }
 .post-cinematic-hero:not(.is-preview) .hero-copy h1 { font-size:46px; line-height:1.15; }
}
.post-cinematic-hero > .seasonal-decor{z-index:0;opacity:.65}
</style>

<style scoped>
.visual-title-highlight{color:var(--visual-highlight,inherit)}
.visual-themed .hero-primary-pill{background:var(--visual-label-background);color:var(--visual-label-text);border-color:var(--visual-border)}
.visual-themed .hero-action{background:var(--visual-button-background);color:var(--visual-button-text);border-color:var(--visual-border)}
.visual-themed .hero-breadcrumb button:hover{color:var(--visual-accent)}
</style>

<style scoped>
.post-cinematic-hero.visual-themed{--hero-accent:var(--visual-accent);--hero-accent-soft:color-mix(in srgb,var(--visual-primary) 32%,transparent);--hero-accent-glow:color-mix(in srgb,var(--visual-primary) 30%,transparent)}
</style>

<style scoped>
.hero-actions .hero-action,.hero-actions .hero-read-state{white-space:nowrap;flex-shrink:0}
.visual-themed .hero-action i{color:inherit}
.visual-themed .hero-read-state{background:var(--visual-surface);color:var(--visual-text);border-color:var(--visual-border)}
.visual-themed .hero-read-state i{color:var(--visual-accent)}
.visual-themed .hero-read-state.earned{background:var(--visual-button-background);color:var(--visual-button-text);border-color:var(--visual-border)}
.visual-themed .hero-read-state.earned i{color:inherit}
@media(max-width:760px){
 .hero-actions{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:8px;width:100%;min-width:0}
 .hero-actions.has-read-state{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 44px}
 .hero-actions .hero-action,.hero-actions .hero-read-state{min-width:0;justify-content:center;padding:0 8px;gap:6px;min-height:44px;box-sizing:border-box}
 .hero-actions .hero-action.icon-only{width:44px;min-width:44px;height:44px;padding:0}
 .hero-actions .hero-action span,.hero-actions .hero-read-state span{font-size:11px;white-space:nowrap}
}
</style>

<style scoped>
.post-cinematic-hero.is-editorial:not(.is-preview){min-height:480px;border-radius:22px;box-shadow:0 18px 50px #0004;border-color:#d6b45b55}
.is-editorial .hero-pattern{display:none}.is-editorial .hero-content{max-width:760px;min-height:480px;padding:30px 38px;gap:20px;grid-template-rows:auto auto 1fr auto auto}
.is-editorial .hero-copy h1{font-size:clamp(32px,3.5vw,50px);line-height:1.12;letter-spacing:-.025em}
.is-editorial .hero-media::after{background:linear-gradient(90deg,#090c18eb 0%,#090c1899 40%,#090c1810 80%),linear-gradient(0deg,#090c18e8,transparent 70%)}
.is-editorial .hero-mini-score{display:none}.is-editorial .hero-footer{flex-wrap:wrap;gap:18px}
@media(max-width:760px){.post-cinematic-hero.is-editorial:not(.is-preview){min-height:600px}.is-editorial .hero-content{padding:20px;min-height:600px;gap:16px}.is-editorial .hero-breadcrumb{margin-bottom:200px}.is-editorial .hero-copy h1{font-size:clamp(28px,7.8vw,38px)}.is-editorial .hero-media::after{background:linear-gradient(180deg,#090c1808 5%,#090c1844 28%,#090c18e8 52%,#090c18 85%)}.is-editorial .hero-footer{align-items:start}.is-editorial .hero-author{max-width:100%}}
</style>

<style scoped>
.post-cinematic-hero.is-editorial:not(.is-preview){border-radius:0;border-left:0;border-right:0}
.is-editorial:not(.is-preview) .hero-content{margin-left:max(40px,calc((100% - 1320px)/2));padding-left:0;padding-right:24px}
@media(max-width:1023px){.is-editorial:not(.is-preview) .hero-content{margin-left:0;padding-left:20px;padding-right:20px}}
</style>

<style scoped>
.is-editorial:not(.is-preview) .hero-media::after{background:linear-gradient(90deg,#090c18e8 0%,#090c1880 40%,#090c1810 80%),linear-gradient(0deg,#0b0d18,transparent 55%)}
@media(max-width:760px){.is-editorial:not(.is-preview) .hero-media::after{background:linear-gradient(180deg,#090c1808 5%,#090c1844 28%,#090c18d9 52%,#0b0d18 100%)}}
</style>

<style scoped>
.is-editorial:not(.is-preview) .hero-backdrop::after{content:'';position:absolute;left:0;right:0;bottom:0;height:240px;pointer-events:none;background:linear-gradient(180deg,transparent,#0b0d1877);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);mask-image:linear-gradient(180deg,transparent,#000 65%);-webkit-mask-image:linear-gradient(180deg,transparent,#000 65%)}
@media(max-width:760px){.is-editorial:not(.is-preview) .hero-backdrop::after{height:180px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}}
</style>

<style scoped>
/* Blur a copy of the image itself; do not depend on backdrop-filter beneath a masked layer. */
.is-editorial:not(.is-preview) .hero-backdrop::after{display:none}
.is-editorial:not(.is-preview) .hero-media::before{content:'';position:absolute;inset:-18px;z-index:1;pointer-events:none;background:var(--post-hero-image) center / cover no-repeat;filter:blur(14px);mask-image:linear-gradient(to bottom,transparent calc(100% - var(--analysis-tail,240px)),#000 calc(100% - 50px));-webkit-mask-image:linear-gradient(to bottom,transparent calc(100% - var(--analysis-tail,240px)),#000 calc(100% - 50px))}
.is-editorial:not(.is-preview) .hero-media::after{z-index:2}
.is-editorial .hero-content,.is-editorial .hero-copy,.is-editorial .hero-footer{min-width:0;box-sizing:border-box}
.is-editorial:not(.is-preview) .hero-content{grid-template-rows:auto auto 1fr auto;align-content:start}
.is-editorial:not(.is-preview) .hero-content:has(.hero-platforms){grid-template-rows:auto auto 1fr auto auto}
.is-editorial:not(.is-preview) .hero-footer{align-self:end}
</style>

<style scoped>
.hero-media :is(img,video){object-position:var(--post-image-position,center top)}
.is-editorial:not(.is-preview) .hero-media::before{background-position:var(--post-image-position,center top)}
</style>

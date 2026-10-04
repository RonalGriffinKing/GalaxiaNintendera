<script setup>
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'

defineProps({
  profile: {
    type: Object,
    required: true
  },
  profileIcon: {
    type: String,
    default: ''
  },
  profileIconMeta: {
    type: Object,
    default: () => ({})
  },
  currentAchievement: {
    type: Object,
    required: true
  },
  nextProgress: { type: Object, default: null },
  isOwnProfile: {
    type: Boolean,
    default: false
  },
  memberSince: {
    type: String,
    default: ''
  },
  redeemedIconCount: {
    type: Number,
    default: 0
  },
  visibleProfileIcons: {
    type: Array,
    default: () => []
  },
  socialItems: {
    type: Array,
    default: () => []
  },
  displayStars: {
    type: Number,
    default: 0
  },
  isSpending: {
    type: Boolean,
    default: false
  },
  iconPanelOpen: {
    type: Boolean,
    default: false
  },
  followBusy: {
    type: Boolean,
    default: false
  },
  isFollowing: {
    type: Boolean,
    default: false
  },
  canUseDirectChat: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'toggle-rewards',
  'toggle-icon-panel',
  'open-icon-collection',
  'toggle-follow',
  'open-direct-message',
  'share'
])
</script>

<template>
  <section class="profile-hero">
    <button
      class="profile-level-pill"
      type="button"
      aria-label="Ver logros y recompensas"
      @click="emit('toggle-rewards')"
    >
      <span class="profile-level-icon">
        <img v-if="currentAchievement.iconUrl" :src="currentAchievement.iconUrl" alt="" />
        <i v-else class="fas fa-gem"></i>
      </span>
      <span class="profile-level-label">{{ currentAchievement.label }}</span>
      <i class="fas fa-crown profile-level-crown" aria-hidden="true"></i>
      <i class="fas fa-chevron-right"></i>
    </button>

    <div class="profile-avatar-wrap">
      <ProfileAvatar
        class="profile-avatar-circle"
        :src="profileIcon"
        :alt="profile.name || profile.email || 'Usuario'"
        :effect="profileIconMeta"
        :role-badge="profile.role || 'user'"
      />
      <button
        v-if="isOwnProfile"
        class="avatar-edit-shortcut"
        type="button"
        aria-label="Editar perfil e iconos"
        @click="emit('toggle-icon-panel')"
      >
        <i class="fas fa-pen"></i>
        <span>Editar</span>
      </button>
    </div>

    <div class="profile-main-copy">
      <h1>{{ profile.name || profile.email || 'Usuario' }}</h1>
      <small class="profile-username">@{{ profile.username || (profile.name || profile.email || 'usuario').toString().split('@')[0].replace(/\s+/g, '') }}</small>
      <p>{{ profile.description || 'Miembro de la comunidad' }}</p>
      <div class="profile-meta-row">
        <span v-if="memberSince"><i class="fas fa-calendar"></i> Miembro desde {{ memberSince }}</span>
        <span v-if="profile.location"><i class="fas fa-location-dot"></i> {{ profile.location }}</span>
        <span v-if="profile.birthday"><i class="fas fa-cake-candles"></i> {{ profile.birthday }}</span>
      </div>
    </div>



    <div class="profile-social-panel">
      <strong>Mis redes</strong>
      <div class="profile-social-links">
        <component
          v-for="item in socialItems"
          :is="item.url ? 'a' : 'span'"
          :key="item.id"
          :href="item.url"
          :aria-label="item.label"
          target="_blank"
          rel="noopener noreferrer"
          :class="{ disabled: !item.url }"
          @click.stop
        >
          <i :class="item.icon"></i>
        </component>
      </div>
    </div>




    <aside class="hero-side"><div class="star-wallet" :class="{ spending: isSpending }">
      <i class="fas fa-star"></i>
      <strong>{{ displayStars }}</strong>
      <span>estrellas</span>
      <small>Gana mas leyendo noticias y participando en la galaxia.</small>
      <button v-if="nextProgress" class="hero-next-goal" type="button" @click="emit('toggle-rewards')">
        <span>Siguiente logro</span><strong>{{ nextProgress.label }}</strong>
        <progress :value="nextProgress.progress" max="100" :aria-label="`Progreso de ${nextProgress.label}`"></progress>
        <span>{{ nextProgress.currentValue }} / {{ nextProgress.target }}</span>
      </button>
    </div><div class="hero-rewards-panel">
      <button type="button" @click.stop.prevent="emit('open-icon-collection')">
        <i class="fas fa-icons"></i>
        <span>{{ redeemedIconCount }} iconos</span>
      </button>
      <div v-if="visibleProfileIcons.length" class="hero-icon-stack">
        <ProfileAvatar
          v-for="icon in visibleProfileIcons.slice(0, 4)"
          :key="icon.id"
          class="hero-stack-avatar"
          :src="icon.src"
          :alt="icon.name"
          :effect="icon"
          decorative
        />
      </div>
    </div><div class="profile-actions" :class="{ 'profile-actions-three': !isOwnProfile && canUseDirectChat }">
      <button type="button" class="ghost" @click="emit('toggle-rewards')">
        <i class="fas fa-trophy"></i>
        Logros y recompensas
      </button>
      <button
        v-if="isOwnProfile"
        class="profile-edit-main-action"
        :class="{ active: iconPanelOpen }"
        type="button"
        @click="emit('toggle-icon-panel')"
      >
        <i class="fas fa-user-pen"></i>
        Editar perfil
      </button>
      <button v-if="!isOwnProfile" type="button" :disabled="followBusy" @click="emit('toggle-follow')">
        <i class="fas fa-plus"></i>
        {{ isFollowing ? 'Dejar de seguir' : 'Seguir' }}
      </button>
      <button v-if="!isOwnProfile && canUseDirectChat" type="button" class="ghost" @click="emit('open-direct-message')">
        <i class="far fa-envelope"></i>
        Enviar mensaje
      </button>
      <button type="button" class="ghost profile-share-action" @click="emit('share')">
        <i class="fas fa-share-nodes"></i>
        Compartir perfil
      </button>
    </div></aside>
  </section>
</template>

<style scoped>
.profile-hero { display:grid; grid-template-columns:160px minmax(0,1fr) 260px; grid-template-areas:'avatar level wallet' 'avatar info wallet' 'avatar socials rewards' 'avatar socials actions'; gap:12px 24px; padding:24px; width:100%; border:1px solid #a855f770; border-radius:18px; background:linear-gradient(90deg,#080a1da8,#140b3266),url('@/iconos/Banner.png') center/cover; color:white; min-width:0; }
.profile-level-pill { grid-area:level; display:flex; gap:8px; align-items:center; width:fit-content; max-width:100%; min-height:38px; padding:5px 12px 5px 5px; border:1px solid #fbbf24; border-radius:24px; background:linear-gradient(135deg,#6d28d970,#78350f80); color:#fde68a; font-size:12px; font-weight:700; }
.profile-level-icon { display:grid; place-items:center; width:27px; height:27px; flex-shrink:0; border-radius:50%; background:#a855f7; }.profile-level-icon img { width:100%; height:100%; object-fit:cover; border-radius:50%; }.profile-level-label { overflow-wrap:anywhere; }.profile-level-pill > .fa-chevron-right { display:none; }
.profile-avatar-wrap { grid-area:avatar; align-self:center; justify-self:center; }.profile-avatar-circle { --avatar-size:150px; }.avatar-edit-shortcut { display:none; }.profile-main-copy { grid-area:info; min-width:0; }.profile-main-copy h1 { font-size:clamp(28px,3vw,40px); line-height:1.15; font-weight:800; letter-spacing:-.03em; margin:0 0 8px; overflow-wrap:anywhere; }.profile-username { font-size:16px; font-weight:700; color:#c084fc; }.profile-main-copy p { font-size:13px; line-height:1.65; margin:10px 0 0; max-width:560px; }.profile-meta-row { display:flex; flex-wrap:wrap; gap:12px; margin-top:12px; color:#cbd5e1; font-size:11px; }
.profile-social-panel { grid-area:socials; align-self:end; }.profile-social-panel > strong { display:none; }.profile-social-links { display:flex; gap:8px; }.profile-social-links :is(a,span) { display:grid; place-items:center; width:36px; height:36px; color:white; background:#080c2480; border:1px solid #ffffff26; border-radius:50%; }.profile-social-links .disabled { opacity:.4; }
.star-wallet { grid-area:wallet; display:grid; grid-template-columns:30px minmax(0,1fr); gap:2px 10px; padding:14px; background:#080c24d9; border:1px solid #a855f744; border-radius:12px 12px 0 0; }.star-wallet > i { grid-row:span 2; align-self:center; color:#facc15; font-size:27px; }.star-wallet > strong { font-size:24px; }.star-wallet > span { color:#cbd5e1; font-size:9px; text-transform:uppercase; }.star-wallet > small { display:none; }.hero-next-goal { grid-column:1/-1; display:grid; gap:6px; text-align:left; padding-top:10px; margin-top:8px; border-top:1px solid #ffffff15; color:white; }.hero-next-goal strong { font-size:12px; line-height:1.4; }.hero-next-goal span { font-size:10px; color:#cbd5e1; }.hero-next-goal progress { width:100%; height:7px; border:0; border-radius:20px; overflow:hidden; background:#ffffff15; }.hero-next-goal progress::-webkit-progress-bar { background:#ffffff15; }.hero-next-goal progress::-webkit-progress-value { background:linear-gradient(90deg,#a855f7,#ec4899); }.hero-next-goal progress::-moz-progress-bar { background:#a855f7; }
.hero-rewards-panel { grid-area:rewards; display:grid; gap:8px; padding:10px 14px; margin-top:-12px; background:#080c24d9; border:1px solid #a855f744; border-top:0; border-radius:0 0 12px 12px; }.hero-rewards-panel > button { color:#cbd5e1; text-align:left; font-size:11px; min-height:26px; }.hero-icon-stack { display:flex; gap:8px; justify-content:center; }.hero-stack-avatar { --avatar-size:36px; }.profile-actions { grid-area:actions; display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; }.profile-actions > button { min-height:40px; padding:9px 12px; border:1px solid #a855f755; border-radius:22px; font-size:11px; color:white; background:#080c2480; }.profile-actions .profile-edit-main-action { background:linear-gradient(135deg,#7c3aed,#a855f7); }.profile-actions > .ghost:first-child { display:none; }
button:focus-visible,a:focus-visible { outline:2px solid #c084fc; outline-offset:4px; }
@media(max-width:1100px) { .profile-hero { grid-template-columns:120px minmax(0,1fr) 220px; gap:12px 16px; padding:20px; }.profile-avatar-circle { --avatar-size:116px; } }
@media(max-width:760px) { .profile-hero { grid-template-columns:100px minmax(0,1fr); grid-template-areas:'avatar level' 'avatar info' 'socials socials' 'wallet wallet' 'rewards rewards' 'actions actions'; padding:18px; gap:14px; }.profile-avatar-circle { --avatar-size:96px; }.profile-main-copy h1 { font-size:28px; }.profile-social-links { justify-content:center; }.profile-level-pill { font-size:10px; min-height:34px; }.profile-main-copy p { font-size:12px; }.hero-rewards-panel { margin-top:-14px; }.profile-actions { justify-content:center; }.profile-actions button { flex:1; }.hero-icon-stack { gap:12px; }.hero-stack-avatar { --avatar-size:38px; } }
@media(max-width:420px) { .profile-hero { grid-template-columns:82px minmax(0,1fr); gap:12px; padding:16px; }.profile-avatar-circle { --avatar-size:80px; }.profile-main-copy h1 { font-size:24px; }.profile-level-crown { display:none; }.profile-username { font-size:13px; } }


.profile-hero { grid-template-areas:'avatar level side' 'avatar info side' 'avatar socials side'; gap:12px 24px; align-items:start; }.hero-side { grid-area:side; display:flex; flex-direction:column; gap:0; min-width:0; }.hero-side .star-wallet { display:grid; }.hero-side .hero-rewards-panel { margin:0; }.hero-side .profile-actions { margin-top:10px; }.profile-social-panel { align-self:start; }.profile-avatar-wrap { align-self:center; }.profile-main-copy p { margin-bottom:0; }
@media(max-width:760px) { .profile-hero { grid-template-columns:100px minmax(0,1fr); grid-template-areas:'avatar level' 'avatar info' 'socials socials' 'side side'; gap:12px; }.hero-side { margin-top:4px; }.hero-side .star-wallet { grid-template-columns:30px 80px minmax(0,1fr); }.hero-side .hero-next-goal { grid-column:3; grid-row:1/span 2; margin:0; padding:0 0 0 12px; border-top:0; border-left:1px solid #ffffff15; }.hero-side .star-wallet > i { grid-column:1; grid-row:1/span 2; }.hero-side .star-wallet > strong { grid-column:2; grid-row:1; }.hero-side .star-wallet > span { grid-column:2; grid-row:2; }.hero-side .hero-rewards-panel { display:flex; align-items:center; justify-content:space-between; gap:10px; }.hero-side .hero-stack-avatar { --avatar-size:32px; }.hero-side .hero-icon-stack { gap:6px; } }
@media(max-width:420px) { .profile-hero { grid-template-columns:82px minmax(0,1fr); } }


.hero-side .star-wallet { padding:10px 14px; row-gap:0; }.star-wallet > strong { font-size:24px; line-height:1.1; }.star-wallet > span { line-height:1.2; }.hero-next-goal { gap:4px; padding:8px 0 0; margin-top:6px; }.hero-next-goal span { font-size:9px; line-height:1.2; }.hero-next-goal strong { font-size:12px; line-height:1.3; }.hero-side .hero-rewards-panel { padding:8px 14px; gap:6px; }.hero-rewards-panel > button { padding:0; min-height:18px; line-height:1.2; }.hero-side .hero-stack-avatar { --avatar-size:32px; }.hero-side .profile-actions button { min-height:38px; padding:8px 10px; }.profile-hero { grid-template-rows:auto auto auto; }.profile-main-copy { align-self:start; }
/* Keep action labels readable and give the optional third action a full row. */
.profile-hero { font-family: var(--font-family-base, 'Roboto', system-ui, sans-serif); }
.profile-hero button { font-family: inherit; }
.hero-side .profile-actions { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); width: 100%; gap: 8px; }
.hero-side .profile-actions > button { display: flex; align-items: center; justify-content: center; gap: 7px; min-width: 0; min-height: 44px; padding: 10px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; line-height: 1.35; text-align: center; }
.hero-side .profile-actions > .ghost:first-child { display: none; }
.profile-actions > button i { flex-shrink: 0; font-size: 13px; }
.profile-actions-three .profile-share-action { grid-column: 1 / -1; }
.hero-rewards-panel > button { display: flex; align-items: center; gap: 6px; font-weight: 500; }
@media(max-width:1100px) and (min-width:761px) { .profile-hero { grid-template-columns: 120px minmax(0,1fr) 260px; } }
@media(prefers-reduced-motion:no-preference) { .profile-actions > button { transition: background-color 160ms ease, border-color 160ms ease; } }
</style>

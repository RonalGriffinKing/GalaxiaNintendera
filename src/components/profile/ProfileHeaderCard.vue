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
  rewardsExpanded: {
    type: Boolean,
    default: false
  },
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
      :aria-expanded="rewardsExpanded"
      @click="emit('toggle-rewards')"
    >
      <span class="profile-level-icon">
        <img v-if="currentAchievement.iconUrl" :src="currentAchievement.iconUrl" alt="" />
        <i v-else class="fas fa-gem"></i>
      </span>
      <span class="profile-level-label">{{ currentAchievement.label }}</span>
      <i class="fas fa-crown profile-level-crown" aria-hidden="true"></i>
      <i :class="rewardsExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"></i>
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

    <div class="hero-rewards-panel">
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

    <div class="star-wallet" :class="{ spending: isSpending }">
      <i class="fas fa-star"></i>
      <strong>{{ displayStars }}</strong>
      <span>estrellas</span>
      <small>Gana mas leyendo noticias y participando en la galaxia.</small>
    </div>

    <div class="profile-actions">
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
      <button type="button" class="ghost" @click="emit('share')">
        <i class="fas fa-share-nodes"></i>
        Compartir perfil
      </button>
    </div>
  </section>
</template>

<style scoped>
.profile-hero {
  align-items: center;
  background:
    linear-gradient(135deg, rgba(7, 10, 24, 0.92), rgba(31, 19, 55, 0.86)),
    url('@/iconos/Banner.png') center / cover;
  border: 1px solid rgba(168, 85, 247, 0.18);
  border-radius: 28px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
  color: #ffffff;
  display: grid;
  gap: 18px;
  grid-template-areas:
    "level level level"
    "avatar info wallet"
    "avatar socials rewards"
    "actions actions actions";
  grid-template-columns: 136px minmax(0, 1fr) minmax(170px, auto);
  margin: 0 auto;
  max-width: 1120px;
  overflow: hidden;
  padding: 26px;
  position: relative;
}

.profile-level-pill,
.hero-rewards-panel button {
  align-items: center;
  background: rgba(168, 85, 247, 0.14);
  border: 1px solid rgba(168, 85, 247, 0.22);
  border-radius: 999px;
  color: #c084fc;
  display: inline-grid;
  font-size: 12px;
  font-weight: 950;
  gap: 9px;
  grid-template-columns: 32px minmax(0, 1fr) 16px 14px;
  min-height: 42px;
  padding: 5px 12px 5px 5px;
}

.profile-level-pill {
  background:
    radial-gradient(circle at 10% 50%, rgba(236, 72, 153, 0.34), transparent 30%),
    linear-gradient(135deg, rgba(88, 28, 135, 0.78), rgba(120, 53, 15, 0.5));
  border-color: rgba(250, 204, 21, 0.58);
  color: #fde68a;
  grid-area: level;
  justify-self: start;
  max-width: min(520px, 100%);
  min-width: 0;
  text-shadow: 0 8px 24px rgba(0, 0, 0, 0.36);
  width: auto;
}

.profile-level-icon {
  align-items: center;
  background: linear-gradient(135deg, #f59e0b, #facc15);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 14px;
  height: 32px;
  justify-content: center;
  overflow: hidden;
  width: 32px;
}

.profile-level-icon img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.profile-level-label {
  align-self: center;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-level-crown {
  color: #fde68a;
}

.profile-avatar-wrap {
  grid-area: avatar;
  position: relative;
}

.profile-avatar-circle {
  --avatar-size: 136px;
  --avatar-border: 4px;
  --avatar-role-offset: -8px;
}

.avatar-edit-shortcut {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border: 2px solid rgba(255, 255, 255, 0.82);
  border-radius: 999px;
  bottom: -8px;
  color: #ffffff;
  display: none;
  font-size: 11px;
  font-weight: 950;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  position: absolute;
  right: -8px;
}

.profile-main-copy {
  grid-area: info;
  min-width: 0;
}

.profile-main-copy h1 {
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 0.98;
  overflow-wrap: anywhere;
}

.profile-username {
  color: #c084fc;
  display: block;
  font-size: 13px;
  font-weight: 950;
  margin-top: 8px;
}

.profile-main-copy p {
  color: #dbe4f4;
  font-size: 15px;
  font-weight: 750;
  line-height: 1.5;
  margin-top: 10px;
  max-width: 680px;
}

.profile-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.profile-meta-row span {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #e2e8f0;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 7px;
  min-height: 30px;
  padding: 0 10px;
}

.hero-rewards-panel {
  align-self: center;
  display: grid;
  gap: 10px;
  grid-area: rewards;
  justify-items: center;
}

.hero-rewards-panel button {
  grid-template-columns: auto minmax(0, 1fr);
  justify-content: center;
}

.hero-icon-stack {
  display: flex;
  flex-direction: row-reverse;
  justify-content: center;
  min-width: 118px;
}

.hero-stack-avatar {
  --avatar-size: 36px;
  --avatar-border: 2px;
  margin-left: -8px;
}

.profile-social-panel {
  align-self: center;
  display: grid;
  gap: 8px;
  grid-area: socials;
}

.profile-social-panel strong {
  color: #cbd5e1;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.profile-social-links {
  display: flex;
  gap: 8px;
}

.profile-social-links a,
.profile-social-links span {
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.profile-social-links .disabled {
  opacity: 0.42;
}

.star-wallet {
  align-items: center;
  align-self: center;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(250, 204, 21, 0.24);
  border-radius: 18px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.24);
  color: #fef3c7;
  display: grid;
  gap: 2px;
  grid-area: wallet;
  justify-items: center;
  min-width: 138px;
  padding: 12px 18px;
}

.star-wallet.spending {
  animation: walletSpend 0.55s ease;
}

.star-wallet i {
  color: #facc15;
}

.star-wallet strong {
  color: #ffffff;
  font-size: 28px;
  font-weight: 950;
}

.star-wallet span {
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.star-wallet small {
  color: #cbd5e1;
  display: none;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
 }

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  grid-area: actions;
  justify-content: flex-end;
}

.profile-actions button {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
}

.profile-actions .ghost {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.profile-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

@keyframes walletSpend {
  0%,
  100% {
    transform: scale(1);
  }

  45% {
    transform: scale(1.06);
  }
}

@media (max-width: 760px) {
  .profile-hero {
    align-items: start;
    grid-template-areas:
      "avatar info"
      "level level"
      "rewards socials"
      "wallet wallet"
      "actions actions";
    grid-template-columns: minmax(112px, 34%) minmax(0, 1fr);
    gap: 16px 14px;
    padding: 20px 16px 18px;
  }

  .profile-avatar-wrap {
    align-self: start;
    display: grid;
    justify-items: center;
    padding-top: 8px;
  }

  .profile-avatar-circle {
    --avatar-size: clamp(104px, 30vw, 132px);
    --avatar-border: 4px;
    --avatar-role-offset: -5px;
  }

  .avatar-edit-shortcut {
    display: inline-flex;
    bottom: -42px;
    box-shadow: 0 12px 24px rgba(147, 51, 234, 0.36);
    gap: 6px;
    height: 36px;
    left: 50%;
    min-height: 36px;
    padding: 0 13px;
    right: auto;
    transform: translateX(-50%);
  }

  .avatar-edit-shortcut span {
    display: inline;
    font-size: 10px;
    line-height: 1;
    text-transform: uppercase;
  }

  .profile-main-copy {
    align-self: start;
    padding-top: 2px;
  }

  .profile-main-copy h1 {
    font-size: clamp(34px, 10vw, 48px);
    line-height: 0.94;
    max-width: 8ch;
  }

  .profile-main-copy p {
    display: -webkit-box;
    font-size: 14px;
    line-height: 1.42;
    margin-top: 12px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
    overflow: hidden;
  }

  .profile-level-pill {
    font-size: 12px;
    grid-template-columns: 34px minmax(0, 1fr) 18px 14px;
    justify-self: stretch;
    max-width: 100%;
    min-height: 44px;
    padding: 5px 12px 5px 5px;
    width: 100%;
  }

  .profile-level-icon {
    height: 34px;
    width: 34px;
  }

  .star-wallet {
    column-gap: 12px;
    grid-template-columns: 52px auto minmax(0, 1fr);
    justify-items: start;
    min-width: 0;
    padding: 14px 16px;
  }

  .star-wallet i {
    align-items: center;
    background: rgba(250, 204, 21, 0.14);
    border-radius: 999px;
    display: inline-flex;
    font-size: 26px;
    height: 52px;
    justify-content: center;
    grid-row: span 2;
    width: 52px;
  }

  .star-wallet strong {
    font-size: 34px;
    line-height: 0.95;
  }

  .star-wallet span {
    align-self: end;
  }

  .star-wallet small {
    display: block;
    grid-column: 3;
    grid-row: 1 / span 2;
    max-width: 22ch;
  }

  .hero-rewards-panel,
  .profile-social-panel {
    background: rgba(7, 10, 24, 0.54);
    border: 1px solid rgba(168, 85, 247, 0.18);
    border-radius: 20px;
    min-height: 110px;
    padding: 14px 10px;
  }

  .hero-rewards-panel {
    justify-items: center;
  }

  .hero-icon-stack {
    min-width: 0;
  }

  .hero-stack-avatar {
    --avatar-size: 36px;
    margin-left: -10px;
  }

  .profile-social-panel {
    align-content: center;
    justify-items: center;
  }

  .profile-social-links {
    flex-wrap: wrap;
    justify-content: center;
  }

  .profile-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .profile-actions button {
    border-radius: 999px;
    justify-content: center;
    min-height: 48px;
  }

  .profile-actions .profile-edit-main-action {
    display: none;
  }
}
</style>

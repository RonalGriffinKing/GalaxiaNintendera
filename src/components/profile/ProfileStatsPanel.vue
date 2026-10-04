<script setup>
const emit = defineEmits(['open'])
defineProps({
  stats: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <div class="profile-hero-stats" aria-label="Resumen rapido del perfil">
    <component :is="['icons', 'achievements'].includes(item.id) ? 'button' : 'div'" v-for="item in stats" :key="item.id" :type="['icons', 'achievements'].includes(item.id) ? 'button' : undefined" @click="['icons', 'achievements'].includes(item.id) && emit('open', item.id)">
      <i :class="item.icon"></i>
      <strong>{{ item.value }}</strong>
      <span>{{ item.label }}</span>
    </component>
  </div>
</template>

<style scoped>
.profile-hero-stats {
  background:
    radial-gradient(circle at 50% 0%, rgba(168, 85, 247, 0.18), transparent 58%),
    rgba(6, 9, 24, 0.72);
  border: 1px solid rgba(216, 180, 254, 0.14);
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(2, 6, 23, 0.18);
  display: grid;
  gap: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 14px auto 0;
  max-width: var(--profile-content-width, min(1500px, calc(100vw - 48px)));
  overflow: hidden;
}

.profile-hero-stats > :is(div, button) {
  align-items: center;
  display: grid;
  gap: 4px;
  justify-items: center;
  min-height: 88px;
  padding: 14px;
  position: relative;
  text-align: center;
}

.profile-hero-stats > :is(div, button) + div::before {
  background: rgba(216, 180, 254, 0.14);
  content: '';
  height: 42px;
  left: 0;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
}

.profile-hero-stats i {
  color: #8b5cf6;
}

.profile-hero-stats strong {
  color: #ffffff;
  font-size: 21px;
  font-weight: 950;
}

.profile-hero-stats span {
  color: #dbeafe;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

@media (max-width: 680px) {
  .profile-hero-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .profile-hero-stats > :is(div, button) + div::before {
    display: none;
  }
}
.profile-hero-stats > :is(div,button) + :is(div,button)::before { content: ''; position: absolute; left: 0; top: 25%; height: 50%; width: 1px; background: #a855f733; }
@media(max-width:680px) { .profile-hero-stats > :is(div,button) { padding: 12px 4px; min-height: 76px; }.profile-hero-stats span { font-size: 9px; text-transform: none; }.profile-hero-stats strong { font-size: 20px; } }
.profile-hero-stats > button { color: inherit; background: transparent; width: 100%; }
.profile-hero-stats > button:hover { background: rgba(168,85,247,.12); }


.profile-hero-stats { height:82px; }.profile-hero-stats > :is(div,button) { min-height:0; height:80px; padding:8px; }.profile-hero-stats span { font-size:11px; font-weight:500; text-transform:none; }
@media(max-width:680px) { .profile-hero-stats { height:76px; }.profile-hero-stats > :is(div,button) { height:74px; padding:6px 3px; }.profile-hero-stats span { font-size:9px; } }
</style>

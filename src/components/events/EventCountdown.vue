<script setup>
import { computed } from 'vue'

const props = defineProps({
  startsAt: {
    type: Number,
    default: 0
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const parts = computed(() => {
  const diff = Math.max(0, Number(props.startsAt || 0) - Date.now())
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return [
    { label: 'Dias', short: 'DIA', value: days },
    { label: 'Horas', short: 'HRS', value: hours },
    { label: 'Min', short: 'MIN', value: minutes },
    { label: 'Seg', short: 'SEG', value: seconds }
  ]
})
</script>

<template>
  <div class="event-countdown" :class="{ compact }">
    <span v-for="part in parts" :key="part.label">
      <strong>{{ String(part.value).padStart(2, '0') }}</strong>
      <small>{{ compact ? part.short : part.label }}</small>
    </span>
  </div>
</template>

<style scoped>
.event-countdown {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.event-countdown span {
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(168, 85, 247, 0.16);
  border-radius: 10px;
  color: #c4b5fd;
  display: grid;
  gap: 2px;
  min-width: 52px;
  padding: 9px 8px;
  text-align: center;
}

.event-countdown strong {
  color: #f8fafc;
  font-size: 22px;
  font-weight: 950;
  line-height: 1;
}

.event-countdown small {
  color: #aeb8d3;
  font-size: 9px;
  font-weight: 950;
  text-transform: uppercase;
}

.event-countdown.compact {
  gap: 6px;
}

.event-countdown.compact span {
  min-width: 44px;
  padding: 7px 6px;
}

.event-countdown.compact strong {
  font-size: 18px;
}

@media (max-width: 680px) {
  .event-countdown span {
    min-width: 0;
  }
}
</style>

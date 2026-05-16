<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  events: {
    type: Array,
    default: () => []
  },
  selectedId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select'])
const cursor = ref(new Date())

const monthLabel = computed(() => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(cursor.value))
const dayKey = (date) => date.toISOString().slice(0, 10)
const eventKey = (event) => dayKey(new Date(event.startsAt || 0))

const days = computed(() => {
  const year = cursor.value.getFullYear()
  const month = cursor.value.getMonth()
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = dayKey(date)
    const matches = props.events.filter(event => eventKey(event) === key)
    return {
      key,
      day: date.getDate(),
      current: date.getMonth() === month,
      events: matches,
      selected: matches.some(event => event.id === props.selectedId)
    }
  })
})

const move = (amount) => {
  const next = new Date(cursor.value)
  next.setMonth(next.getMonth() + amount)
  cursor.value = next
}
</script>

<template>
  <aside class="events-calendar-premium">
    <header>
      <h2>{{ monthLabel }}</h2>
      <div>
        <button type="button" @click="move(-1)"><i class="fas fa-chevron-left"></i></button>
        <button type="button" @click="move(1)"><i class="fas fa-chevron-right"></i></button>
      </div>
    </header>

    <div class="calendar-weekdays">
      <span v-for="day in ['Lun','Mar','Mie','Jue','Vie','Sab','Dom']" :key="day">{{ day }}</span>
    </div>

    <div class="calendar-days">
      <button
        v-for="day in days"
        :key="day.key"
        type="button"
        :class="[{ muted: !day.current, active: day.selected }, day.events[0]?.type?.toLowerCase()]"
        @click="day.events[0] && emit('select', day.events[0])"
      >
        {{ day.day }}
        <i v-if="day.events.length"></i>
      </button>
    </div>

    <footer>
      <span class="live">Live</span>
      <span class="direct">Direct</span>
      <span class="torneo">Torneo</span>
      <span class="anuncio">Anuncio</span>
    </footer>
  </aside>
</template>

<style scoped>
.events-calendar-premium {
  background: rgba(8, 12, 30, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 18px;
  color: #ffffff;
  padding: 18px;
}

.events-calendar-premium header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.events-calendar-premium h2 {
  font-size: 18px;
  font-weight: 950;
  text-transform: capitalize;
}

.events-calendar-premium header div {
  display: flex;
  gap: 8px;
}

.events-calendar-premium header button {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  color: #ffffff;
  height: 32px;
  width: 32px;
}

.calendar-weekdays,
.calendar-days {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-weekdays {
  margin-top: 18px;
}

.calendar-weekdays span {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 950;
  text-align: center;
  text-transform: uppercase;
}

.calendar-days {
  margin-top: 8px;
}

.calendar-days button {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 10px;
  color: #e5e7eb;
  font-weight: 900;
  position: relative;
}

.calendar-days button.muted {
  color: #475569;
}

.calendar-days button.active,
.calendar-days button:hover {
  background: rgba(124, 58, 237, 0.5);
}

.calendar-days i {
  border-radius: 999px;
  bottom: 6px;
  height: 6px;
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
  width: 6px;
}

.calendar-days .live i { background: #ef4444; }
.calendar-days .direct i { background: #a855f7; }
.calendar-days .torneo i { background: #facc15; }
.calendar-days .anuncio i { background: #38bdf8; }

.events-calendar-premium footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.events-calendar-premium footer span {
  border-radius: 999px;
  font-size: 10px;
  font-weight: 950;
  padding: 5px 8px;
  text-transform: uppercase;
}

.live { background: rgba(239, 68, 68, 0.18); color: #fecaca; }
.direct { background: rgba(168, 85, 247, 0.2); color: #d8b4fe; }
.torneo { background: rgba(250, 204, 21, 0.16); color: #fde68a; }
.anuncio { background: rgba(56, 189, 248, 0.14); color: #bae6fd; }
</style>

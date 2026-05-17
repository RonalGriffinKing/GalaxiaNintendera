<template>
  <div class="space-y-5">
    <div>
      <label class="app-label">Canal Twitch</label>
      <input
        v-model="widget.data.channel"
        class="app-input"
        placeholder="ibai"
      />
    </div>

    <div>
      <label class="app-label">Usuario TikTok</label>
      <input
        v-model="widget.data.tiktokUser"
        class="app-input"
        placeholder="sin @"
      />
    </div>

    <div>
      <label class="app-label">Color fondo</label>
      <input type="color" v-model="widget.data.bgColor" class="color-input" />

      <label class="app-label mt-3">Color texto</label>
      <input type="color" v-model="widget.data.textColor" class="color-input" />
    </div>

    <div>
      <label class="app-label">Tamano texto</label>
      <input
        type="range"
        min="12"
        max="40"
        v-model="widget.data.fontSize"
        class="slider"
      />
      <p class="section-caption">{{ widget.data.fontSize }} px</p>

      <label class="app-label mt-3">Ancho</label>
      <input
        type="range"
        min="200"
        max="900"
        v-model="widget.data.width"
        class="slider"
      />
      <p class="section-caption">{{ widget.data.width }} px</p>
    </div>

    <div>
      <label class="app-label">Bordes</label>

      <div class="flex gap-2 mt-2">
        <button
          @click="set('rounded', true)"
          :class="btn(widget.data.rounded)"
        >
          Redondeado
        </button>

        <button
          @click="set('rounded', false)"
          :class="btn(!widget.data.rounded)"
        >
          Recto
        </button>
      </div>

      <label class="app-label mt-3">Color borde</label>
      <input type="color" v-model="widget.data.borderColor" class="color-input" />

      <label class="app-label mt-3">Grosor</label>
      <input
        type="range"
        min="0"
        max="10"
        v-model="widget.data.borderWidth"
        class="slider"
      />
      <p class="section-caption">{{ widget.data.borderWidth }} px</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

const props = defineProps({
  widget: Object
})

onMounted(() => {
  if (!props.widget.data) props.widget.data = {}

  const d = props.widget.data

  d.channel ??= 'ibai'
  d.tiktokUser ??= ''
  d.bgColor ??= '#1f2937'
  d.textColor ??= '#ffffff'
  d.fontSize ??= 18
  d.width ??= 400
  d.rounded ??= true
  d.borderColor ??= '#ffffff'
  d.borderWidth ??= 2
})

const set = (key, value) => {
  props.widget.data[key] = value
}

const btn = (active) => [
  'px-3 py-2 rounded-lg text-xs font-black uppercase transition',
  active
    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
    : 'bg-gray-200 text-gray-700'
]
</script>

<style scoped>
.color-input {
  width: 100%;
  height: 40px;
  margin-top: 6px;
}

.slider {
  width: 100%;
  margin-top: 6px;
}
</style>

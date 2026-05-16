<template>
  <div class="space-y-5">
    <div>
      <label class="app-label">Titulo</label>
      <input v-model="widget.data.title" class="app-input" />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="app-label">Actual</label>
        <input type="number" v-model="widget.data.current" class="app-input" />
      </div>

      <div>
        <label class="app-label">Meta</label>
        <input type="number" v-model="widget.data.goal" class="app-input" />
      </div>
    </div>

    <div>
      <label class="app-label">Color barra</label>
      <input type="color" v-model="widget.data.barColor" class="color-input" />
    </div>

    <div>
      <label class="app-label">Tamano titulo</label>
      <input type="range" min="10" max="40" v-model="widget.data.titleSize" class="slider" />
      <p class="section-caption">{{ widget.data.titleSize }} px</p>

      <label class="app-label mt-3">Tamano numeros</label>
      <input type="range" min="10" max="40" v-model="widget.data.numberSize" class="slider" />
      <p class="section-caption">{{ widget.data.numberSize }} px</p>
    </div>

    <div>
      <label class="app-label">Ancho</label>
      <input type="range" min="200" max="800" v-model="widget.data.width" class="slider" />
      <p class="section-caption">{{ widget.data.width }} px</p>

      <label class="app-label mt-3">Alto</label>
      <input type="range" min="80" max="300" v-model="widget.data.height" class="slider" />
      <p class="section-caption">{{ widget.data.height }} px</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

const props = defineProps({
  widget: Object
})

onMounted(() => {
  const d = props.widget.data

  d.title ??= 'Meta'
  d.current ??= 1000
  d.goal ??= 2000
  d.barColor ??= '#a855f7'
  d.titleSize ??= 16
  d.numberSize ??= 18
  d.width ??= 400
  d.height ??= 120
})
</script>

<style>
.color-input { width: 100%; height: 40px; margin-top: 6px; }
.slider { width: 100%; margin-top: 6px; }
</style>

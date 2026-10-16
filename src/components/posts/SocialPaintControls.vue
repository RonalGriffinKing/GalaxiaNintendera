<script setup>
defineProps({ value: Object })
const emit = defineEmits(['change'])
</script>
<template>
 <div class="paint-controls">
  <label>Tipo de color<select :value="value.gradient === false ? 'solid' : 'gradient'" @change="emit('change', { key: 'gradient', value: $event.target.value === 'gradient' })"><option value="solid">Color sólido</option><option value="gradient">Degradado</option></select></label>
  <div class="colors">
   <label>{{ value.gradient === false ? 'Color' : 'Color de inicio' }}<input type="color" :value="value.color" @input="emit('change', { key: 'color', value: $event.target.value })" /></label>
   <label v-if="value.gradient !== false">Color final<input type="color" :value="value.endColor || value.color" @input="emit('change', { key: 'endColor', value: $event.target.value })" /></label>
  </div>
 </div>
</template>
<style scoped>
.paint-controls,label{display:grid;gap:8px}label{font-size:12px;font-weight:700}.colors{display:flex;gap:12px}.colors label{flex:1;min-width:0}select,input{width:100%;height:40px;border:1px solid #ffffff30;border-radius:8px;background:#192033;color:white;padding:6px;box-sizing:border-box}select option{background:#192033}
</style>

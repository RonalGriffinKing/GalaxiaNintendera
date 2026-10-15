<script setup>
defineProps({
  as: { type: String, default: 'div', validator: v => ['div', 'article', 'section', 'aside'].includes(v) },
  variant: { type: String, default: 'card', validator: v => ['card', 'panel', 'nested', 'raised'].includes(v) }
})
</script>
<template>
  <component :is="as" class="admin-surface" :class="`admin-surface--${variant}`"><slot /></component>
</template>

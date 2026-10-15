<script setup>
defineProps({
  as: { type: String, default: 'div', validator: value => ['div', 'nav'].includes(value) },
  vertical: Boolean
})
</script>

<template>
  <component :is="as" class="admin-nav-group" :class="{ 'admin-nav-group--vertical': vertical }"><slot /></component>
</template>

<script setup>
import { computed } from 'vue'
import { badgeVariants } from './adminBadgeVariants'
const props = defineProps({ variant: { type: String, default: 'neutral', validator: value => badgeVariants.includes(value) } })
const tone = computed(() => badgeVariants.includes(props.variant) ? props.variant : 'neutral')
</script>
<template><span class="admin-badge" :class="`admin-badge--${tone}`"><slot /></span></template>

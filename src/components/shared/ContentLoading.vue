<script setup>
defineProps({ module: { type: String, default: 'posts' }, variant: { type: String, default: 'inline' } })
</script>
<template><div class="content-loading" role="status" aria-live="polite">Cargando...</div></template>
<style scoped>.content-loading{padding:24px;text-align:center;color:var(--text-muted,#aab3c5);font-size:13px}</style>

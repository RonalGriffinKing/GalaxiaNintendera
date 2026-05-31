<script setup>
import PageBlockRenderer from '@/components/sitePages/PageBlockRenderer.vue'

defineProps({
  page: { type: Object, required: true },
  device: { type: String, default: 'desktop' }
})
</script>

<template>
  <article class="site-page-preview" :class="`device-${device}`" :style="{ '--page-accent': page.theme?.accent || '#a855f7' }">
    <div class="preview-shell">
      <PageBlockRenderer
        v-for="block in page.blocks"
        :key="block.id"
        :block="block"
        :page="page"
        preview
      />
      <div v-if="!page.blocks?.length" class="empty-preview">
        <i class="fas fa-cubes"></i>
        <strong>Agrega bloques para previsualizar la pagina.</strong>
      </div>
    </div>
  </article>
</template>

<style scoped>
.site-page-preview {
  background:
    radial-gradient(circle at 18% 8%, color-mix(in srgb, var(--page-accent) 24%, transparent), transparent 30%),
    linear-gradient(145deg, #07091d, #0b1028 48%, #160a2e);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 18px;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 14px;
}

.preview-shell {
  display: grid;
  gap: 18px;
  margin: 0 auto;
  max-width: 980px;
}

.device-mobile .preview-shell {
  max-width: 390px;
}

.device-tablet .preview-shell {
  max-width: 720px;
}

.empty-preview {
  align-items: center;
  border: 1px dashed rgba(192,132,252,0.4);
  border-radius: 18px;
  color: #cbd5e1;
  display: grid;
  gap: 10px;
  justify-items: center;
  min-height: 260px;
  text-align: center;
}

.empty-preview i {
  color: var(--page-accent);
  font-size: 32px;
}
</style>

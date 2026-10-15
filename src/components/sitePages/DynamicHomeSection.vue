<script setup>
import { computed, onMounted, ref } from 'vue'


import { listSitePages } from '@/services/sitePages'
import PageBlockRenderer from '@/components/sitePages/PageBlockRenderer.vue'

const props = defineProps({
  section: { type: String, default: 'custom' },
  limit: { type: Number, default: 1 }
})

const pages = ref([])
const visibleBlocks = computed(() => pages.value.flatMap(page => (page.blocks || []).map(block => ({ page, block }))))

onMounted(async () => {
  pages.value = (await listSitePages()).filter(page=>page.showInHome)
    .filter(page => page.status === 'published' && (!props.section || page.homeSection === props.section || props.section === 'custom'))
    .sort((a, b) => Number(a.homeOrder || 0) - Number(b.homeOrder || 0))
    .slice(0, props.limit)
})
</script>

<template>
  <section v-if="visibleBlocks.length" class="dynamic-home-section">
    <PageBlockRenderer
      v-for="{ page, block } in visibleBlocks"
      :key="`${page.id}-${block.id}`"
      :page="page"
      :block="block"
    />
  </section>
</template>

<style scoped>
.dynamic-home-section {
  display: grid;
  gap: 22px;
}
</style>

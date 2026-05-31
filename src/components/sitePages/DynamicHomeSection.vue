<script setup>
import { computed, onMounted, ref } from 'vue'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/firebase'
import { normalizeSitePage } from '@/services/sitePages'
import PageBlockRenderer from '@/components/sitePages/PageBlockRenderer.vue'

const props = defineProps({
  section: { type: String, default: 'custom' },
  limit: { type: Number, default: 1 }
})

const pages = ref([])
const visibleBlocks = computed(() => pages.value.flatMap(page => (page.blocks || []).map(block => ({ page, block }))))

onMounted(async () => {
  const homeQuery = query(collection(db, 'sitePages'), where('showInHome', '==', true))
  const snap = await getDocs(homeQuery).catch(() => ({ docs: [] }))
  pages.value = snap.docs
    .map(item => ({ id: item.id, ...normalizeSitePage(item.data()) }))
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

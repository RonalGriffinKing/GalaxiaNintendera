<script setup>
defineProps({ text: { type: String, default: '' } })
</script>

<template>
  <aside v-if="text.trim()" class="article-highlight" aria-label="Idea destacada">
    <p>{{ text }}</p>
  </aside>
</template>

<style scoped>
.article-highlight {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  margin: 28px 0;
  padding: clamp(22px, 4vw, 34px);
  border: 1px solid color-mix(in srgb, var(--visual-accent, #67e8f9) 45%, transparent);
  border-radius: 20px;
  background: linear-gradient(115deg, color-mix(in srgb, var(--visual-primary, #7c3aed) 55%, #101327), color-mix(in srgb, var(--visual-secondary, #c026d3) 38%, #101327) 50%, color-mix(in srgb, var(--visual-accent, #22d3ee) 40%, #101327));
  box-shadow: inset 0 1px 0 #ffffff15, 0 8px 28px #00000020;
}
.article-highlight::before {
  content: '';
  position: absolute;
  inset: -35%;
  z-index: -1;
  background: radial-gradient(ellipse at 20% 30%, var(--visual-primary, #7c3aed), transparent 55%), radial-gradient(ellipse at 80% 70%, var(--visual-accent, #22d3ee), transparent 55%);
  filter: blur(30px);
  opacity: .3;
  pointer-events: none;
}
.article-highlight p {
  margin: 0;
  color: #fff;
  font-size: clamp(20px, 2.3vw, 28px);
  line-height: 1.45;
  font-weight: 800;
  font-style: italic;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}
@media (max-width: 600px) { .article-highlight { border-radius: 16px; margin-block: 22px; } }
</style>

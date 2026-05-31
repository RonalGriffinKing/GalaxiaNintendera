<script setup>
import { computed, ref, watch } from 'vue'
import { BLOCK_TYPES, FOOTER_COLUMNS, SITE_PAGE_TYPES, createBlock, normalizeSitePage, pageTemplate, saveSitePage, slugifyPage } from '@/services/sitePages'
import SitePagePreview from '@/components/sitePages/SitePagePreview.vue'

const props = defineProps({
  editData: { type: Object, default: null }
})

const emit = defineEmits(['close', 'saved'])

const page = ref(normalizeSitePage(props.editData || pageTemplate('footer')))
const activePanel = ref('general')
const activeBlockId = ref(page.value.blocks?.[0]?.id || '')
const previewDevice = ref('desktop')
const saving = ref(false)
const toast = ref('')
const blockMenuOpen = ref(false)
const blockPresets = [
  {
    key: 'how-it-works',
    title: 'Como funciona',
    icon: 'fas fa-route',
    blocks: ['text', 'cards', 'timeline', 'faq']
  },
  {
    key: 'landing',
    title: 'Landing completa',
    icon: 'fas fa-rocket',
    blocks: ['cards', 'stats', 'cta']
  },
  {
    key: 'legal',
    title: 'Legal basico',
    icon: 'fas fa-scale-balanced',
    blocks: ['legal-text', 'faq', 'contact-form']
  }
]

watch(() => props.editData, (data) => {
  page.value = normalizeSitePage(data || pageTemplate('footer'))
  activeBlockId.value = page.value.blocks?.[0]?.id || ''
}, { immediate: false })

const activeBlock = computed(() => page.value.blocks.find(block => block.id === activeBlockId.value) || page.value.blocks[0] || null)
const pageTypeMeta = computed(() => SITE_PAGE_TYPES.find(item => item.value === page.value.type) || SITE_PAGE_TYPES[0])
const statusLabel = computed(() => page.value.status === 'published' ? 'Publicado' : 'Borrador')

const setType = (type) => {
  if (page.value.id) {
    page.value.type = type
    page.value.category = SITE_PAGE_TYPES.find(item => item.value === type)?.label || page.value.category
    return
  }
  page.value = normalizeSitePage(pageTemplate(type))
  activeBlockId.value = page.value.blocks[0]?.id || ''
}

const syncSlug = () => {
  page.value.slug = slugifyPage(page.value.title)
}

const addBlock = (type) => {
  if (!type) return
  const block = createBlock(type)
  page.value.blocks = [...page.value.blocks, block]
  activeBlockId.value = block.id
  blockMenuOpen.value = false
}

const addPreset = (preset) => {
  const newBlocks = preset.blocks.map(type => createBlock(type))
  page.value.blocks = [...page.value.blocks, ...newBlocks]
  activeBlockId.value = newBlocks[0]?.id || activeBlockId.value
  blockMenuOpen.value = false
}

const duplicateBlock = (block) => {
  const index = page.value.blocks.findIndex(item => item.id === block.id)
  const copy = JSON.parse(JSON.stringify(block))
  copy.id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  page.value.blocks.splice(index + 1, 0, copy)
  activeBlockId.value = copy.id
}

const removeBlock = (block) => {
  page.value.blocks = page.value.blocks.filter(item => item.id !== block.id)
  if (activeBlockId.value === block.id) activeBlockId.value = page.value.blocks[0]?.id || ''
}

const moveBlock = (index, direction) => {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= page.value.blocks.length) return
  const next = [...page.value.blocks]
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  page.value.blocks = next
}

const blockTitle = (block) => block.title || block.text || BLOCK_TYPES.find(item => item.type === block.type)?.label || block.type

const parseLines = (value) => String(value || '').split('\n').map(item => item.trim()).filter(Boolean)
const itemLines = (items, fields = ['title', 'text']) => (items || []).map(item => fields.map(field => item[field] || '').join(' | ')).join('\n')
const updateItemsFromLines = (block, value, fields = ['title', 'text']) => {
  block.items = parseLines(value).map((line, index) => {
    const parts = line.split('|').map(item => item.trim())
    return fields.reduce((acc, field, fieldIndex) => ({ ...acc, [field]: parts[fieldIndex] || '' }), { id: `${Date.now()}-${index}` })
  })
}

const addItemToBlock = (block) => {
  const item = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}` }
  if (block.type === 'faq') Object.assign(item, { question: 'Nueva pregunta', answer: 'Respuesta breve.' })
  else if (block.type === 'gallery') Object.assign(item, { url: '', title: 'Imagen destacada' })
  else if (['stats', 'rewards'].includes(block.type)) Object.assign(item, { value: '10', label: 'Dato destacado', icon: 'fas fa-star' })
  else if (block.type === 'footer-links') Object.assign(item, { label: 'Nuevo enlace', url: '/p/nueva-pagina' })
  else if (block.type === 'tabs') Object.assign(item, { label: 'Nueva pestana', text: 'Contenido de esta pestana.' })
  else Object.assign(item, { title: 'Nuevo item', text: 'Descripcion breve.', icon: 'fas fa-star' })
  block.items = [...(block.items || []), item]
}

const removeItemFromBlock = (block, index) => {
  block.items = (block.items || []).filter((_, itemIndex) => itemIndex !== index)
}

const save = async (status = page.value.status) => {
  if (!page.value.title.trim()) return
  saving.value = true
  try {
    const saved = await saveSitePage({ ...page.value, status, slug: slugifyPage(page.value.slug || page.value.title) })
    page.value = normalizeSitePage(saved)
    toast.value = status === 'published' ? 'Pagina publicada' : 'Borrador guardado'
    emit('saved', saved)
    window.dispatchEvent(new CustomEvent('site-pages-updated'))
    setTimeout(() => { toast.value = '' }, 2200)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="site-editor-modal">
      <section class="site-editor">
        <header class="site-editor-topbar">
          <div class="editor-title">
            <button type="button" @click="emit('close')"><i class="fas fa-arrow-left"></i></button>
            <span>
              <small>Paginas / Editar pagina</small>
              <strong>{{ page.title || 'Nueva pagina' }}</strong>
            </span>
            <em :class="{ published: page.status === 'published' }">{{ statusLabel }}</em>
          </div>
          <div class="editor-actions">
            <button type="button" class="device-btn" :class="{ active: previewDevice === 'desktop' }" @click="previewDevice = 'desktop'"><i class="fas fa-desktop"></i></button>
            <button type="button" class="device-btn" :class="{ active: previewDevice === 'tablet' }" @click="previewDevice = 'tablet'"><i class="fas fa-tablet-screen-button"></i></button>
            <button type="button" class="device-btn" :class="{ active: previewDevice === 'mobile' }" @click="previewDevice = 'mobile'"><i class="fas fa-mobile-screen"></i></button>
            <RouterLink v-if="page.slug" class="preview-link" :to="`/p/${page.slug}`" target="_blank"><i class="far fa-eye"></i> Vista previa</RouterLink>
            <button type="button" class="draft-btn" :disabled="saving" @click="save('draft')">Guardar borrador</button>
            <button type="button" class="publish-btn" :disabled="saving" @click="save('published')">{{ page.status === 'published' ? 'Actualizar pagina' : 'Publicar pagina' }}</button>
            <button type="button" class="close-btn" @click="emit('close')"><i class="fas fa-xmark"></i></button>
          </div>
        </header>

        <main class="site-editor-layout">
          <aside class="settings-panel">
            <div class="accordion">
              <button type="button" @click="activePanel = activePanel === 'general' ? '' : 'general'">Informacion general <i class="fas fa-chevron-down"></i></button>
              <div v-show="activePanel === 'general'" class="panel-body">
                <label>Titulo<input v-model="page.title" @blur="!page.slug && syncSlug()" /></label>
                <label>Slug<div class="inline-input"><input v-model="page.slug" @blur="page.slug = slugifyPage(page.slug)" /><button type="button" @click="syncSlug"><i class="fas fa-link"></i></button></div></label>
                <label>Descripcion<textarea v-model="page.description" /></label>
                <label>Icono<input v-model="page.icon" placeholder="fas fa-book-open" /></label>
                <label>Tipo<select :value="page.type" @change="setType($event.target.value)"><option v-for="type in SITE_PAGE_TYPES" :key="type.value" :value="type.value">{{ type.label }}</option></select></label>
                <small><i :class="pageTypeMeta.icon"></i> {{ pageTypeMeta.label }}</small>
              </div>
            </div>

            <div class="accordion">
              <button type="button" @click="activePanel = activePanel === 'appearance' ? '' : 'appearance'">Apariencia <i class="fas fa-chevron-down"></i></button>
              <div v-show="activePanel === 'appearance'" class="panel-body">
                <label>Tema<select v-model="page.theme.visual"><option value="space">Espacial</option><option value="premium">Premium</option><option value="minimal">Minimal</option></select></label>
                <label>Color de acento<input v-model="page.theme.accent" type="color" /></label>
                <label>Banner<input v-model="page.theme.banner" placeholder="URL de imagen" /></label>
                <label>Modo<select v-model="page.theme.mode"><option value="dark">Oscuro</option><option value="light">Claro</option></select></label>
              </div>
            </div>

            <div class="accordion">
              <button type="button" @click="activePanel = activePanel === 'seo' ? '' : 'seo'">SEO <i class="fas fa-chevron-down"></i></button>
              <div v-show="activePanel === 'seo'" class="panel-body">
                <label>Meta title<input v-model="page.seo.metaTitle" /></label>
                <label>Meta description<textarea v-model="page.seo.metaDescription" /></label>
                <label>Imagen social<input v-model="page.seo.socialImage" /></label>
                <label class="check-row"><input v-model="page.seo.noIndex" type="checkbox" /> No indexar</label>
              </div>
            </div>

            <div class="accordion">
              <button type="button" @click="activePanel = activePanel === 'location' ? '' : 'location'">Ubicacion <i class="fas fa-chevron-down"></i></button>
              <div v-show="activePanel === 'location'" class="panel-body">
                <label class="check-row"><input v-model="page.showInFooter" type="checkbox" /> Mostrar en footer</label>
                <label>Texto footer<input v-model="page.footerLabel" /></label>
                <label>Columna<select v-model="page.footerColumn"><option v-for="column in FOOTER_COLUMNS" :key="column.value" :value="column.value">{{ column.label }}</option></select></label>
                <label>Orden<input v-model.number="page.footerOrder" type="number" /></label>
                <label class="check-row"><input v-model="page.showInHome" type="checkbox" /> Usar en Home</label>
                <label>Seccion Home<input v-model="page.homeSection" placeholder="como-funciona" /></label>
              </div>
            </div>

            <div class="accordion">
              <button type="button" @click="activePanel = activePanel === 'publish' ? '' : 'publish'">Publicacion <i class="fas fa-chevron-down"></i></button>
              <div v-show="activePanel === 'publish'" class="panel-body">
                <label>Estado<select v-model="page.status"><option value="draft">Borrador</option><option value="published">Publicado</option></select></label>
                <small>Ultima edicion: {{ page.updatedAt ? new Date(page.updatedAt).toLocaleString() : 'Sin guardar' }}</small>
              </div>
            </div>
          </aside>

          <section class="blocks-panel">
            <div class="blocks-toolbar">
              <div class="block-add-menu" :class="{ open: blockMenuOpen }">
                <button type="button" @click="blockMenuOpen = !blockMenuOpen">
                  <i class="fas fa-plus"></i>
                  Agregar bloque
                  <i class="fas fa-chevron-down"></i>
                </button>
                <div v-if="blockMenuOpen" class="block-add-popover">
                  <div class="preset-group">
                    <small>Plantillas rapidas</small>
                    <button
                      v-for="preset in blockPresets"
                      :key="preset.key"
                      type="button"
                      class="preset-option"
                      @click="addPreset(preset)"
                    >
                      <i :class="preset.icon"></i>
                      <span>{{ preset.title }}</span>
                    </button>
                  </div>
                  <div class="preset-group">
                    <small>Bloques individuales</small>
                  </div>
                  <button
                    v-for="block in BLOCK_TYPES"
                    :key="block.type"
                    type="button"
                    @click="addBlock(block.type)"
                  >
                    <i :class="block.icon"></i>
                    <span>{{ block.label }}</span>
                  </button>
                </div>
              </div>
              <strong>{{ page.blocks.length }} bloques</strong>
            </div>

            <div class="block-list">
              <article v-for="(block, index) in page.blocks" :key="block.id" class="block-card" :class="{ active: activeBlockId === block.id }" @click="activeBlockId = block.id">
                <span><i :class="BLOCK_TYPES.find(item => item.type === block.type)?.icon || 'fas fa-cube'"></i></span>
                <div>
                  <strong>{{ blockTitle(block) }}</strong>
                  <small>{{ BLOCK_TYPES.find(item => item.type === block.type)?.label || block.type }}</small>
                </div>
                <nav>
                  <button type="button" :disabled="index === 0" @click.stop="moveBlock(index, -1)"><i class="fas fa-arrow-up"></i></button>
                  <button type="button" :disabled="index === page.blocks.length - 1" @click.stop="moveBlock(index, 1)"><i class="fas fa-arrow-down"></i></button>
                  <button type="button" @click.stop="duplicateBlock(block)"><i class="far fa-copy"></i></button>
                  <button type="button" @click.stop="removeBlock(block)"><i class="fas fa-trash"></i></button>
                </nav>
              </article>
            </div>

            <aside v-if="activeBlock" class="block-inspector">
              <h3>Editar bloque</h3>
              <label v-if="['hero','gallery','cards','faq','timeline','alert','cta','list','stats','rewards','footer-links','legal-text','contact-form','tabs','rules'].includes(activeBlock.type)">Titulo<input v-model="activeBlock.title" /></label>
              <label v-if="activeBlock.type === 'hero'">Eyebrow<input v-model="activeBlock.eyebrow" /></label>
              <label v-if="['heading'].includes(activeBlock.type)">Texto<input v-model="activeBlock.text" /></label>
              <label v-if="['text','legal-text'].includes(activeBlock.type)">Contenido<textarea v-model="activeBlock.body" /></label>
              <label v-if="['hero','alert','cta','contact-form'].includes(activeBlock.type)">Texto<textarea v-model="activeBlock.text" /></label>
              <label v-if="['hero','image'].includes(activeBlock.type)">Imagen / URL<input v-model="activeBlock.image" v-if="activeBlock.type === 'hero'" /><input v-model="activeBlock.url" v-else /></label>
              <label v-if="activeBlock.type === 'image'">Texto alternativo<input v-model="activeBlock.alt" /></label>
              <label v-if="activeBlock.type === 'image'">Caption<input v-model="activeBlock.caption" /></label>
              <label v-if="activeBlock.type === 'video'">Video URL<input v-model="activeBlock.url" /></label>
              <label v-if="activeBlock.type === 'cta'">Boton<input v-model="activeBlock.label" /></label>
              <label v-if="['hero','cta'].includes(activeBlock.type)">URL principal<input v-model="activeBlock.primaryUrl" v-if="activeBlock.type === 'hero'" /><input v-model="activeBlock.url" v-else /></label>
              <label v-if="activeBlock.type === 'hero'">Boton principal<input v-model="activeBlock.primaryLabel" /></label>
              <label v-if="activeBlock.type === 'hero'">Boton secundario<input v-model="activeBlock.secondaryLabel" /></label>
              <label v-if="activeBlock.type === 'hero'">URL secundaria<input v-model="activeBlock.secondaryUrl" /></label>
              <label v-if="activeBlock.type === 'contact-form'">Email<input v-model="activeBlock.email" /></label>
              <label v-if="['list','rules'].includes(activeBlock.type)">Items<textarea v-model="activeBlock.itemsText" /></label>
              <label v-if="['cards','timeline'].includes(activeBlock.type)">Items: titulo | texto<textarea :value="itemLines(activeBlock.items)" @input="updateItemsFromLines(activeBlock, $event.target.value)" /></label>
              <label v-if="['stats','rewards'].includes(activeBlock.type)">Items: valor | etiqueta<textarea :value="itemLines(activeBlock.items, ['value', 'label'])" @input="updateItemsFromLines(activeBlock, $event.target.value, ['value', 'label'])" /></label>
              <label v-if="activeBlock.type === 'faq'">Items: pregunta | respuesta<textarea :value="itemLines(activeBlock.items, ['question', 'answer'])" @input="updateItemsFromLines(activeBlock, $event.target.value, ['question', 'answer'])" /></label>
              <label v-if="activeBlock.type === 'footer-links'">Links: texto | url<textarea :value="itemLines(activeBlock.items, ['label', 'url'])" @input="updateItemsFromLines(activeBlock, $event.target.value, ['label', 'url'])" /></label>
              <label v-if="activeBlock.type === 'gallery'">Imagenes: titulo | url<textarea :value="itemLines(activeBlock.items, ['title', 'url'])" @input="updateItemsFromLines(activeBlock, $event.target.value, ['title', 'url'])" /></label>
              <label v-if="activeBlock.type === 'tabs'">Tabs: etiqueta | contenido<textarea :value="itemLines(activeBlock.items, ['label', 'text'])" @input="updateItemsFromLines(activeBlock, $event.target.value, ['label', 'text'])" /></label>
              <div v-if="['gallery','cards','timeline','faq','stats','rewards','footer-links','tabs'].includes(activeBlock.type)" class="visual-item-editor">
                <div class="visual-item-head">
                  <strong>Items visuales</strong>
                  <button type="button" @click="addItemToBlock(activeBlock)"><i class="fas fa-plus"></i> Agregar</button>
                </div>
                <article v-for="(item, index) in activeBlock.items" :key="item.id || index" class="visual-item-row">
                  <template v-if="activeBlock.type === 'faq'">
                    <input v-model="item.question" placeholder="Pregunta" />
                    <textarea v-model="item.answer" placeholder="Respuesta"></textarea>
                  </template>
                  <template v-else-if="activeBlock.type === 'gallery'">
                    <input v-model="item.title" placeholder="Titulo de imagen" />
                    <input v-model="item.url" placeholder="URL de imagen" />
                  </template>
                  <template v-else-if="['stats','rewards'].includes(activeBlock.type)">
                    <input v-model="item.value" placeholder="Valor" />
                    <input v-model="item.label" placeholder="Etiqueta" />
                    <input v-model="item.icon" placeholder="Icono FontAwesome" />
                  </template>
                  <template v-else-if="activeBlock.type === 'footer-links'">
                    <input v-model="item.label" placeholder="Texto del enlace" />
                    <input v-model="item.url" placeholder="/p/contacto" />
                  </template>
                  <template v-else-if="activeBlock.type === 'tabs'">
                    <input v-model="item.label" placeholder="Etiqueta" />
                    <textarea v-model="item.text" placeholder="Contenido"></textarea>
                  </template>
                  <template v-else>
                    <input v-model="item.title" placeholder="Titulo" />
                    <textarea v-model="item.text" placeholder="Descripcion"></textarea>
                    <input v-model="item.icon" placeholder="Icono FontAwesome" />
                  </template>
                  <button type="button" class="remove-item-btn" @click="removeItemFromBlock(activeBlock, index)">
                    <i class="fas fa-trash"></i>
                  </button>
                </article>
              </div>
            </aside>
          </section>

          <aside class="preview-panel">
            <div class="preview-head">
              <strong>Vista previa</strong>
              <span>{{ previewDevice }}</span>
            </div>
            <SitePagePreview :page="page" :device="previewDevice" />
          </aside>
        </main>
      </section>
      <div v-if="toast" class="page-toast">{{ toast }}</div>
    </div>
  </Teleport>
</template>

<style scoped>
.site-editor-modal { background: rgba(1, 4, 16, 0.82); inset: 0; padding: 10px; position: fixed; z-index: 5000; }
.site-editor { background: #050816; border: 1px solid rgba(168, 85, 247, 0.28); border-radius: 18px; box-shadow: 0 28px 90px rgba(0,0,0,0.5); color: #fff; display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; overflow: hidden; }
.site-editor-topbar { align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; gap: 14px; justify-content: space-between; padding: 14px 16px; }
.editor-title, .editor-actions { align-items: center; display: flex; gap: 12px; min-width: 0; }
.editor-title button, .close-btn, .device-btn { background: rgba(255,255,255,0.07); border-radius: 10px; color: #fff; height: 38px; width: 38px; }
.editor-title small { color: #a78bfa; display: block; font-size: 11px; font-weight: 900; }
.editor-title strong { display: block; font-size: 18px; font-weight: 950; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.editor-title em { background: rgba(34,197,94,0.16); border-radius: 999px; color: #86efac; font-size: 11px; font-style: normal; font-weight: 950; padding: 7px 10px; }
.editor-title em:not(.published) { background: rgba(250,204,21,0.14); color: #fde68a; }
.device-btn.active { background: linear-gradient(135deg, #6d28d9, #9333ea); }
.preview-link, .draft-btn, .publish-btn { align-items: center; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #fff; display: inline-flex; font-size: 12px; font-weight: 950; gap: 8px; min-height: 38px; padding: 0 14px; }
.publish-btn { background: linear-gradient(135deg, #7c3aed, #ec4899); }
.site-editor-layout { display: grid; gap: 10px; grid-template-columns: 280px minmax(360px, 0.86fr) minmax(420px, 1.14fr); min-height: 0; padding: 10px; }
.settings-panel, .blocks-panel, .preview-panel { background: rgba(8, 13, 34, 0.88); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; min-height: 0; overflow: auto; }
.settings-panel { padding: 10px; }
.accordion { border-bottom: 1px solid rgba(255,255,255,0.08); }
.accordion > button { align-items: center; color: #c084fc; display: flex; font-weight: 950; justify-content: space-between; min-height: 46px; width: 100%; }
.panel-body { display: grid; gap: 12px; padding: 8px 0 16px; }
label { color: #94a3b8; display: grid; font-size: 11px; font-weight: 900; gap: 7px; }
input, textarea, select { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; color: #fff; min-height: 38px; padding: 0 11px; width: 100%; }
select option { background: #11142a; color: #fff; }
textarea { min-height: 84px; padding-top: 10px; resize: vertical; }
.inline-input { display: grid; grid-template-columns: minmax(0,1fr) 42px; }
.inline-input button { background: rgba(124,58,237,0.22); border-radius: 10px; color: #c084fc; }
.check-row { align-items: center; display: flex; gap: 9px; }
.check-row input { height: auto; min-height: 0; width: auto; }
.blocks-panel { display: grid; grid-template-rows: auto minmax(110px, max-content) minmax(0, 1fr); overflow: hidden; }
.blocks-toolbar { align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; padding: 10px 12px; position: relative; z-index: 4; }
.block-add-menu { position: relative; width: min(240px, 62%); }
.block-add-menu > button { align-items: center; background: rgba(255,255,255,0.06); border: 1px solid rgba(192,132,252,0.24); border-radius: 10px; color: #fff; display: flex; font-size: 13px; font-weight: 950; gap: 9px; height: 38px; justify-content: space-between; padding: 0 12px; width: 100%; }
.block-add-menu.open > button { border-color: rgba(192,132,252,0.72); box-shadow: 0 0 0 3px rgba(124,58,237,0.18); }
.block-add-popover { background: #11142a; border: 1px solid rgba(192,132,252,0.34); border-radius: 14px; box-shadow: 0 22px 55px rgba(0,0,0,0.42); display: grid; gap: 6px; left: 0; max-height: min(520px, 72vh); overflow: auto; padding: 8px; position: absolute; top: calc(100% + 8px); width: min(330px, 80vw); z-index: 20; }
.block-add-popover button { align-items: center; border-radius: 10px; color: #e5e7eb; display: grid; font-size: 12px; font-weight: 900; gap: 10px; grid-template-columns: 24px minmax(0,1fr); min-height: 38px; padding: 0 10px; text-align: left; }
.block-add-popover button:hover { background: rgba(124,58,237,0.22); color: #fff; }
.block-add-popover i { color: #c084fc; text-align: center; }
.preset-group { border-bottom: 1px solid rgba(255,255,255,0.08); display: grid; gap: 4px; padding-bottom: 6px; }
.preset-group small { color: #a78bfa; font-size: 10px; font-weight: 950; padding: 4px 8px; text-transform: uppercase; }
.preset-option { background: rgba(124,58,237,0.16); }
.block-list { align-content: start; display: grid; gap: 8px; max-height: 260px; overflow: auto; padding: 12px; }
.block-card { align-items: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; cursor: pointer; display: grid; gap: 10px; grid-template-columns: 42px minmax(0,1fr) auto; min-height: 72px; padding: 9px; }
.block-card.active { border-color: rgba(192,132,252,0.75); box-shadow: inset 0 0 0 1px rgba(192,132,252,0.28); }
.block-card > span { align-items: center; background: rgba(124,58,237,0.18); border-radius: 10px; color: #c084fc; display: flex; height: 38px; justify-content: center; }
.block-card strong, .block-card small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.block-card strong { color: #fff; font-size: 13px; font-weight: 950; }
.block-card small { color: #94a3b8; font-size: 11px; font-weight: 850; }
.block-card nav { display: flex; gap: 5px; }
.block-card nav button { background: rgba(255,255,255,0.06); border-radius: 8px; color: #cbd5e1; height: 28px; width: 28px; }
.block-inspector { border-top: 1px solid rgba(255,255,255,0.08); display: grid; gap: 10px; min-height: 0; overflow: auto; padding: 12px; }
.block-inspector h3, .preview-head strong { color: #fff; font-size: 13px; font-weight: 950; }
.visual-item-editor { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; display: grid; gap: 10px; padding: 10px; }
.visual-item-head { align-items: center; display: flex; justify-content: space-between; }
.visual-item-head strong { color: #fff; font-size: 12px; font-weight: 950; }
.visual-item-head button { align-items: center; background: rgba(124,58,237,0.22); border-radius: 10px; color: #e9d5ff; display: inline-flex; font-size: 11px; font-weight: 950; gap: 6px; min-height: 32px; padding: 0 10px; }
.visual-item-row { background: rgba(2,6,23,0.26); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; display: grid; gap: 8px; padding: 10px; position: relative; }
.visual-item-row textarea { min-height: 58px; }
.remove-item-btn { background: rgba(239,68,68,0.14); border-radius: 9px; color: #fca5a5; height: 30px; position: absolute; right: 8px; top: 8px; width: 30px; }
.preview-panel { display: grid; grid-template-rows: auto minmax(0,1fr); padding: 10px; }
.preview-head { align-items: center; display: flex; justify-content: space-between; padding: 0 4px 10px; }
.preview-head span { color: #a78bfa; font-size: 11px; font-weight: 950; text-transform: uppercase; }
.page-toast { background: #111827; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; bottom: 24px; color: #fff; font-size: 13px; font-weight: 950; left: 50%; padding: 12px 18px; position: fixed; transform: translateX(-50%); z-index: 5200; }
@media (max-width: 1180px) {
  .site-editor-layout { grid-template-columns: 260px minmax(0, 1fr); }
  .preview-panel { display: none; }
}
@media (max-width: 760px) {
  .site-editor-modal { padding: 0; }
  .site-editor { border-radius: 0; }
  .site-editor-topbar, .editor-actions { flex-wrap: wrap; }
  .site-editor-layout { grid-template-columns: 1fr; overflow: auto; }
  .settings-panel, .blocks-panel { overflow: visible; }
  .blocks-panel { grid-template-rows: auto auto auto; }
}
</style>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import { postCommentsRequest } from '@/services/postComments'
import { resolveProfileIcon } from '@/services/profileProgress'
import ProfileAvatar from '@/components/profile/ProfileAvatar.vue'

const props = defineProps({ postId: { type: String, required: true } })
const user = ref(auth.currentUser)
const items = ref([]), editing = ref(null), cursor = ref(null), sort = ref('recent')
const text = ref(''), rating = ref(null)
const loading = ref(false), saving = ref(false), removing = ref(false)
const error = ref(''), notice = ref(''), canWrite = ref(false), admin = ref(false), deletion = ref(null)
let requestVersion = 0, controller
let submissionId = crypto.randomUUID()
const valid = computed(() => canWrite.value && Boolean(text.value.trim()) && text.value.trim().length <= 2000 && !saving.value && !removing.value)
const messages = { 'authentication-required': 'Inicia sesión de nuevo para participar.', forbidden: 'Tu cuenta no tiene permiso para realizar esta acción.', 'invalid-comment': 'Escribe un comentario de hasta 2000 caracteres y una valoración de 1 a 5.', 'post-unavailable': 'Esta publicación no admite comentarios por ahora.' }
const errorText = err => messages[err.message] || 'No se pudieron cargar o guardar los comentarios. Inténtalo de nuevo.'
const date = value => value ? new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''
const avatar = entry => resolveProfileIcon({ imageUrl: entry.authorImage, selectedIcon: entry.selectedIcon })
async function load(append = false) {
 const version = ++requestVersion
 controller?.abort(); controller = new AbortController()
 loading.value = true; error.value = ''
 try {
  const result = await postCommentsRequest('list', { postId: props.postId, sort: sort.value, cursor: append ? cursor.value : null }, { signal: controller.signal })
  if (version !== requestVersion) return
  items.value = append ? [...new Map([...items.value, ...result.items].map(item => [item.id, item])).values()] : result.items
  cursor.value = result.nextCursor; canWrite.value = result.canWrite; admin.value = result.admin
 } catch (err) { if (version === requestVersion && err.name !== 'AbortError') error.value = errorText(err) }
 finally { if (version === requestVersion) loading.value = false }
}
async function submit() {
 if (!valid.value) return
 saving.value = true; error.value = ''; notice.value = ''
 try {
  await postCommentsRequest('save', { postId: props.postId, commentId: editing.value?.id || submissionId, text: text.value, rating: rating.value })
  text.value = ''; rating.value = null; editing.value = null; submissionId = crypto.randomUUID()
  notice.value = 'Tu comentario se ha guardado.'
  await load()
 } catch (err) { error.value = errorText(err) }
 finally { saving.value = false }
}
async function remove() {
 const target = deletion.value
 if (!target || removing.value) return
 removing.value = true; error.value = ''; notice.value = ''
 try {
  await postCommentsRequest('delete', { postId: props.postId, commentId: target.id })
  deletion.value = null
  if (target.id === editing.value?.id) { text.value = ''; rating.value = null; editing.value = null }
  notice.value = 'Comentario eliminado.'
  await load()
 } catch (err) { error.value = errorText(err) }
 finally { removing.value = false }
}
function cancelEdit() { editing.value = null; text.value = ''; rating.value = null; submissionId = crypto.randomUUID() }
function edit(entry) { editing.value = entry; text.value = entry.body; rating.value = entry.rating; document.getElementById('post-comment-body')?.focus() }
watch(sort, () => load())
watch(() => props.postId, () => { items.value = []; text.value = ''; rating.value = null; deletion.value = null; notice.value = ''; cancelEdit(); load() })
const unsubscribe = onAuthStateChanged(auth, current => { user.value = current; canWrite.value = false; admin.value = false; deletion.value = null; text.value = ''; rating.value = null; cancelEdit(); load() })
onBeforeUnmount(() => { requestVersion++; controller?.abort(); unsubscribe() })
</script>

<template>
 <section class="post-discussion" aria-labelledby="post-discussion-title">
  <header class="discussion-heading"><div><span>LA COMUNIDAD OPINA</span><h2 id="post-discussion-title">Comentarios y reseñas</h2><p>Comparte tu opinión sobre esta publicación.</p></div></header>
  <p v-if="!user" class="discussion-login"><RouterLink :to="{ path: '/login', query: { redirect: $route.fullPath } }">Inicia sesión</RouterLink> para comentar y valorar.</p>
  <form v-else-if="canWrite" class="discussion-form" @submit.prevent="submit">
   <label class="comment-label" for="post-comment-body">{{ editing ? 'Editar tu comentario' : 'Escribe un comentario' }}</label>
   <textarea id="post-comment-body" v-model="text" maxlength="2000" rows="4" placeholder="¿Qué te ha parecido?" :disabled="saving || removing"></textarea>
   <button v-if="editing" type="button" @click="cancelEdit">Cancelar edición</button>
   <fieldset :disabled="saving || removing"><legend>Tu valoración <span>(opcional)</span></legend><div class="rating-options"><label v-for="star in 5" :key="star" :class="{ selected: rating >= star }"><input v-model.number="rating" type="radio" name="post-comment-rating" :value="star" :aria-label="`${star} de 5 estrellas`" /><span aria-hidden="true">★</span></label><button v-if="rating" type="button" class="clear-rating" @click="rating = null">Quitar valoración</button></div></fieldset>
   <footer><small>{{ text.length }}/2000 · Puedes actualizar tu opinión cuando quieras.</small><button type="submit" class="discussion-publish" :disabled="!valid">{{ saving ? 'Guardando…' : editing ? 'Actualizar comentario' : 'Publicar comentario' }}</button></footer>
  </form>
  <p v-else-if="!loading && !error" class="discussion-login">Tu cuenta no puede publicar comentarios por ahora.</p>
  <div v-if="error" class="discussion-error" role="alert"><p>{{ error }}</p><button type="button" :disabled="loading" @click="load()">Reintentar</button></div>
  <p v-if="notice" class="discussion-notice" role="status">{{ notice }}</p>
  <div class="discussion-toolbar"><h3>Opiniones de los lectores</h3><label>Ordenar<select v-model="sort" aria-label="Ordenar comentarios"><option value="recent">Más recientes</option><option value="oldest">Más antiguos</option></select></label></div>
  <div v-if="deletion" class="discussion-confirm" role="alertdialog" aria-modal="false" aria-label="Confirmar eliminación"><p>¿Eliminar este comentario y su valoración?</p><button type="button" :disabled="removing" @click="deletion = null">Cancelar</button><button type="button" class="delete-confirm" :disabled="removing" @click="remove">{{ removing ? 'Eliminando…' : 'Eliminar' }}</button></div>
  <article v-for="entry in items" :key="entry.id" class="reader-comment">
   <ProfileAvatar :src="avatar(entry)" :label="entry.author" :alt="entry.author" class="comment-avatar" />
   <div class="reader-comment-content"><header><RouterLink :to="`/profile/${encodeURIComponent(entry.authorId)}`">{{ entry.author }}</RouterLink><time :datetime="new Date(entry.createdAt).toISOString()">{{ date(entry.createdAt) }}</time><small v-if="entry.updatedAt > entry.createdAt">Editado</small><button v-if="entry.authorId === user?.uid" class="comment-edit" type="button" :disabled="saving || removing" @click="edit(entry)">Editar</button><button v-if="admin || entry.authorId === user?.uid" class="comment-delete" type="button" :disabled="saving || removing" :aria-label="`Eliminar comentario de ${entry.author}`" @click="deletion = entry">Eliminar</button></header><p v-if="entry.rating" class="reader-rating" :aria-label="`${entry.rating} de 5 estrellas`"><span aria-hidden="true">{{ '★'.repeat(entry.rating) }}<i>{{ '★'.repeat(5-entry.rating) }}</i></span><small>{{ entry.rating }}/5</small></p><p class="reader-comment-body">{{ entry.body }}</p></div>
  </article>
  <p v-if="loading" class="discussion-state" role="status">Cargando comentarios…</p>
  <p v-else-if="!items.length && !error" class="discussion-state">Todavía no hay comentarios. ¡Comparte la primera opinión!</p>
  <button v-if="cursor" type="button" class="discussion-more" :disabled="loading" @click="load(true)">Ver más comentarios</button>
 </section>
</template>

<style scoped>
.post-discussion{width:100%;max-width:860px;min-width:0;box-sizing:border-box;margin-top:32px;padding-top:28px;border-top:1px solid var(--visual-border,#a78bfa45);color:#f1eff8}.discussion-heading>div>span{font-size:10px;font-weight:750;letter-spacing:.1em;color:var(--visual-accent,#c4b5fd)}.discussion-heading h2{font-size:clamp(24px,3vw,30px);font-weight:750;line-height:1.2;margin:8px 0}.discussion-heading p,.discussion-login,.discussion-state{font-size:14px;line-height:1.6;color:#c1bbd0;margin:12px 0 20px}.discussion-login a{color:#dcc4ff;text-decoration:underline}.discussion-form{display:grid;gap:12px;margin:24px 0;padding:20px;border:1px solid var(--visual-border,#a78bfa45);border-radius:20px;background:color-mix(in srgb,var(--visual-surface,#111024) 94%,transparent)}.comment-label{font-size:14px;font-weight:700}.discussion-form textarea{width:100%;min-width:0;box-sizing:border-box;padding:14px;border:1px solid #b99de345;border-radius:14px;resize:vertical;min-height:112px;max-height:360px;background:#080c1b90;color:#f8f5ff;font:inherit;font-size:15px;line-height:1.6}.discussion-form textarea::placeholder{color:#a7a0b9}.discussion-form fieldset{min-width:0;border:0;padding:0;margin:0}.discussion-form legend{font-size:12px;font-weight:650}.discussion-form legend>span{color:#aaa0ba;font-weight:400}.rating-options{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-top:4px}.rating-options label{position:relative;display:grid;place-items:center;width:36px;height:40px;cursor:pointer;color:#6c627d;font-size:30px}.rating-options label.selected{color:#facc15}.rating-options input{position:absolute;inset:0;opacity:0;cursor:pointer}.rating-options label:focus-within{outline:2px solid #d8b4fe;outline-offset:1px;border-radius:8px}.post-discussion button{cursor:pointer;color:#e9ddfa;background:#302044;border:1px solid #b99de340;border-radius:11px;font-size:12px;font-weight:650;padding:10px 14px}.post-discussion button:disabled{opacity:.45;cursor:default}.post-discussion .clear-rating{background:transparent;border:0;font-weight:400;font-size:11px}.discussion-form footer{display:flex;align-items:center;justify-content:space-between;gap:14px}.discussion-form footer small{font-size:11px;color:#b5adc5;line-height:1.5}.post-discussion .discussion-publish{background:linear-gradient(115deg,#8232d0,#c02e9d);border:0;color:#fff;min-height:44px;flex-shrink:0}.discussion-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:28px 0 10px}.discussion-toolbar h3{font-size:14px;font-weight:700;margin:0}.discussion-toolbar label{font-size:11px;color:#b5adc5;display:flex;gap:10px;align-items:center}.discussion-toolbar select{padding:9px 12px;border:1px solid #b99de340;border-radius:10px;background:#17132b;color:#eee6f9;font-size:12px}.reader-comment{display:grid;grid-template-columns:42px minmax(0,1fr);gap:13px;padding:22px 0;border-bottom:1px solid #b99de325;min-width:0}.comment-avatar{--avatar-size:42px;width:42px;height:42px}.reader-comment-content{min-width:0}.reader-comment-content header{display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap}.reader-comment-content header a{font-size:14px;font-weight:700;color:#eee5fa;text-decoration:none;overflow-wrap:anywhere}.reader-comment time,.reader-comment header small{font-size:11px;color:#b9aec8}.post-discussion .comment-edit{padding:4px 8px;background:transparent;border:0;color:#d5b4fd;font-size:11px}.post-discussion .comment-delete{margin-left:auto;padding:4px 8px;background:transparent;border:0;color:#e8acc1;font-size:11px}.reader-rating{display:flex;gap:10px;align-items:center;margin:8px 0 0;color:#facc15;letter-spacing:2px;font-size:15px}.reader-rating i{font-style:normal;color:#756785}.reader-rating small{font-size:10px;color:#bbafc9;letter-spacing:0}.reader-comment-body{margin:8px 0 0;font-size:15px;line-height:1.7;color:#e0d9e9;white-space:pre-wrap;overflow-wrap:anywhere}.discussion-error,.discussion-confirm{padding:14px;border:1px solid #d895b955;border-radius:14px;background:#251224;margin:14px 0;font-size:13px}.discussion-confirm button{margin-right:8px}.discussion-confirm p,.discussion-error p{margin:0 0 12px}.discussion-notice{font-size:13px;color:#c5efcd}.post-discussion .delete-confirm{background:#a82d56;color:#fff}.discussion-more{display:block;margin:20px auto 0}.post-discussion :is(button,textarea,select,a):focus-visible{outline:2px solid var(--visual-accent,#d8b4fe);outline-offset:3px}@media(max-width:600px){.discussion-form{padding:14px}.discussion-form footer{align-items:stretch;flex-direction:column;gap:10px}.discussion-publish{width:100%}.reader-comment{grid-template-columns:34px minmax(0,1fr);gap:10px}.comment-avatar{--avatar-size:34px;width:34px;height:34px}.reader-comment-content header a{width:100%}.reader-comment-body{font-size:14px}.discussion-toolbar label{width:100%;justify-content:space-between}.discussion-toolbar select{flex:1;max-width:190px}}
</style>

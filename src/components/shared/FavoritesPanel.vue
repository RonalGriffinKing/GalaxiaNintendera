<template>
  <div class="relative min-h-full">
    <div class="panel-header">
      <div>
        <h1 class="panel-title">Posts favoritos</h1>
        <p class="panel-subtitle">Noticias que guardaste para leer despues</p>
      </div>
    </div>

    <div v-if="favorites.length" class="favorites-grid">
      <button
        v-for="post in favorites"
        :key="post.id"
        class="favorite-card"
        @click="goPost(post.postId || post.id)"
      >
        <img v-if="post.image" :src="post.image" alt="" />
        <div v-else class="favorite-placeholder"></div>

        <div>
          <span>{{ post.category || 'General' }}</span>
          <h3>{{ post.title }}</h3>
          <p>{{ post.authorName || 'Redactor' }}</p>
        </div>
      </button>
    </div>

    <div v-else class="app-card p-5">
      <p class="section-caption">Todavia no guardaste ningun post como favorito.</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { collection, getDocs } from 'firebase/firestore'
import { auth, db } from '@/firebase'

const router = useRouter()
const favorites = ref([])

const loadFavorites = async () => {
  const user = auth.currentUser
  if (!user) return

  const snap = await getDocs(collection(db, 'users', user.uid, 'favorites'))
  favorites.value = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
}

const goPost = (id) => {
  router.push(`/post/${id}`)
}

onMounted(loadFavorites)
</script>

<style scoped>
.favorites-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.favorite-card {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  overflow: hidden;
  text-align: left;
  transition: all 0.2s ease;
}

.favorite-card:hover {
  box-shadow: 0 8px 15px rgba(0,0,0,0.04);
  transform: translateY(-2px);
}

.favorite-card img,
.favorite-placeholder {
  aspect-ratio: 16 / 9;
  object-fit: cover;
  width: 100%;
}

.favorite-placeholder {
  background: #e5e7eb;
}

.favorite-card div {
  padding: 12px;
}

.favorite-card span {
  background: #ede9fe;
  border-radius: 999px;
  color: #7c3aed;
  display: inline-flex;
  font-size: 10px;
  font-weight: 900;
  padding: 4px 8px;
}

.favorite-card h3 {
  color: #1f2937;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.25;
  margin-top: 8px;
}

.favorite-card p {
  color: #9ca3af;
  font-size: 11px;
  font-weight: 800;
  margin-top: 6px;
}
</style>

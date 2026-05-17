<script setup>
defineProps({
  officialCommunity: {
    type: Object,
    default: null
  },
  communities: {
    type: Array,
    default: () => []
  },
  posts: {
    type: Array,
    default: () => []
  },
  threads: {
    type: Array,
    default: () => []
  },
  cardTitle: {
    type: Function,
    required: true
  },
  cardActionIcon: {
    type: Function,
    required: true
  },
  formatAgo: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['open-community', 'open-archive', 'open-post'])
</script>

<template>
  <section class="community-discovery-panel">
    <div class="panel-heading">
      <h2>
        <span></span>
        Comunidades y conversaciones
      </h2>
      <button @click="emit('open-community')">
        Explorar
        <i class="fas fa-arrow-right"></i>
      </button>
    </div>

    <article v-if="officialCommunity" class="official-community-strip" @click="emit('open-community', officialCommunity)">
      <img v-if="officialCommunity.iconUrl" :src="officialCommunity.iconUrl" alt="" />
      <span v-else>{{ officialCommunity.name.slice(0, 2).toUpperCase() }}</span>
      <div>
        <small>Comunidad oficial</small>
        <strong>{{ officialCommunity.name }}</strong>
        <p>{{ officialCommunity.description }}</p>
      </div>
    </article>

    <div class="community-home-grid">
      <button v-for="community in communities" :key="community.id" type="button" class="community-home-card" @click="emit('open-community', community)">
        <img v-if="community.iconUrl" :src="community.iconUrl" alt="" />
        <span v-else>{{ community.name.slice(0, 2).toUpperCase() }}</span>
        <div>
          <strong>{{ community.name }}</strong>
          <small>{{ community.isOfficial ? 'Oficial' : `${community.membersCount || 0} miembros` }}</small>
        </div>
      </button>
    </div>

    <div v-if="posts.length" class="featured-dashboard-news">
      <div class="side-mini-head">
        <h3>Noticias destacadas</h3>
        <button type="button" @click="emit('open-archive')">Ver todas</button>
      </div>
      <button v-for="post in posts" :key="post.id" type="button" class="featured-news-row" @click="emit('open-post', post.id)">
        <img v-if="post.image" :src="post.image" alt="" />
        <span v-else><i :class="cardActionIcon(post)"></i></span>
        <div>
          <strong>{{ cardTitle(post) }}</strong>
          <small>{{ post.authorName || 'Redactor' }} - {{ formatAgo(post.createdAt) }}</small>
        </div>
      </button>
    </div>

    <div v-if="threads.length" class="thread-highlight-row">
      <article v-for="thread in threads" :key="thread.id" class="thread-highlight-card">
        <span>{{ thread.communityName || 'Comunidad' }}</span>
        <h3>{{ thread.title }}</h3>
        <p>{{ thread.body }}</p>
        <small><i class="far fa-comment"></i> {{ thread.replies || 0 }} respuestas - <i class="far fa-heart"></i> {{ thread.likes || 0 }}</small>
      </article>
    </div>
  </section>
</template>

<style scoped>
.community-discovery-panel {
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 28px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
  display: grid;
  gap: 16px;
  padding: 18px;
}

.panel-heading,
.side-mini-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.panel-heading h2 {
  align-items: center;
  display: flex;
  font-size: 21px;
  gap: 10px;
}

.panel-heading h2 span {
  background: linear-gradient(135deg, #a855f7, #ec4899);
  border-radius: 999px;
  height: 12px;
  width: 12px;
}

.panel-heading button,
.side-mini-head button {
  color: #c4b5fd;
  font-size: 12px;
  font-weight: 900;
}

.official-community-strip,
.featured-dashboard-news {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
}

.official-community-strip {
  align-items: center;
  color: #ffffff;
  cursor: pointer;
  display: grid;
  gap: 12px;
  grid-template-columns: 58px minmax(0, 1fr);
  padding: 12px;
  text-align: left;
}

.official-community-strip img,
.official-community-strip > span,
.community-home-card img,
.community-home-card > span {
  border-radius: 16px;
  height: 58px;
  object-fit: cover;
  width: 58px;
}

.official-community-strip > span,
.community-home-card > span {
  align-items: center;
  background: #ffffff;
  color: #7c3aed;
  display: flex;
  font-weight: 950;
  justify-content: center;
}

.official-community-strip small {
  color: #c4b5fd;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.official-community-strip strong,
.community-home-card strong,
.featured-news-row strong,
.thread-highlight-card h3 {
  color: #ffffff;
  display: block;
  font-weight: 950;
}

.official-community-strip p {
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1.35;
  margin-top: 3px;
}

.community-home-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.community-home-card {
  align-items: center;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 48px minmax(0, 1fr);
  padding: 10px;
  text-align: left;
}

.community-home-card img,
.community-home-card > span {
  border-radius: 13px;
  height: 48px;
  width: 48px;
}

.community-home-card small,
.featured-news-row small,
.thread-highlight-card small {
  color: #94a3b8;
  display: block;
  font-size: 11px;
  font-weight: 800;
}

.featured-dashboard-news {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.side-mini-head h3 {
  color: #ffffff;
  font-size: 14px;
  font-weight: 950;
}

.featured-news-row {
  align-items: center;
  color: #ffffff;
  display: grid;
  gap: 10px;
  grid-template-columns: 46px minmax(0, 1fr);
  text-align: left;
}

.featured-news-row img,
.featured-news-row > span {
  border-radius: 12px;
  height: 46px;
  object-fit: cover;
  width: 46px;
}

.featured-news-row > span {
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: center;
}

.thread-highlight-row {
  display: grid;
  gap: 10px;
}

.thread-highlight-card {
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 14px;
}

.thread-highlight-card span {
  color: #c4b5fd;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.thread-highlight-card p {
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1.4;
  margin: 6px 0;
}

@media (max-width: 680px) {
  .community-discovery-panel {
    border-radius: 22px;
    padding: 14px;
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .community-home-grid {
    grid-template-columns: 1fr;
  }
}
</style>

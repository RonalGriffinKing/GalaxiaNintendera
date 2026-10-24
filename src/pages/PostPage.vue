<script setup>
import ScrollTabRail from "@/components/shared/ScrollTabRail.vue"
import { vSoftReveal } from '@/directives/softReveal'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore"
import { auth, db } from "@/firebase"
import { resolveAssetUrl } from '@/constants/assets'
import { isVideoMedia, mediaFromUrl } from '@/services/mediaLinks'
import { READ_REWARD_STARS, awardPostRead, getReadRewardDelayMs, resolveProfileIcon, resolveProfileIconMeta } from '@/services/profileProgress'
import { renderRichText } from '@/services/richText'
import AnalysisRatingCard from '@/components/posts/AnalysisRatingCard.vue'
import ReaderActions from '@/components/posts/ReaderActions.vue'
import GameInfoCard from '@/components/posts/GameInfoCard.vue'
import { analysisRating, sectionNavLabel } from '@/services/articlePresentation'
import ReaderLoadingShell from '@/components/posts/ReaderLoadingShell.vue'
import PostCinematicHero from '@/components/posts/PostCinematicHero.vue'
import { useVisualThemes } from '@/composables/useVisualThemes'
import { postWebThemeCss } from '@/services/visualThemes'
import FloatingBackButton from '@/components/shared/FloatingBackButton.vue'

const route = useRoute()
const router = useRouter()
const post = ref({ sections: [] })
const {theme:visualTheme,enabled:themeEnabled}=useVisualThemes(()=>post.value)
const articleThemeStyle=computed(()=>themeEnabled.value.web?postWebThemeCss(post.value,visualTheme.value):{})
const relatedPosts = ref([])
const copied = ref(false)
const isFavorite = ref(false)
const savingFavorite = ref(false)
const authorProfile = ref(null)
const rewardToast = ref({ show: false, message: '' })
const hasReachedEnd = ref(false)
const readDelayPassed = ref(false)
const rewardChecked = ref(false)
const readStatus = ref({ viewed: false, awarded: false })
const isLoading = ref(true)
let readTimer = null
let previousTitle = ''
let loadRequestId = 0

const currentUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return window.location.href
})
const publicPostPath = computed(() => `/post/${post.value.slug || post.value.id || route.params.id}`)
const postSections = computed(() => (Array.isArray(post.value.sections) ? post.value.sections : []).filter(section => !section.hidden))
const activeSection = ref(-1)
const actualNavHeight = ref(null)
let navbarObserver
const displayedSections = computed(() => postSections.value.map((section,index)=>({...section,articleIndex:index})).filter(section=>activeSection.value===-1 || section.articleIndex===activeSection.value))
async function selectArticleSection(index) {
 activeSection.value=index
 await nextTick()
 if(!window.matchMedia('(max-width: 859px)').matches)return
 const panel=document.getElementById('article-reading-panel')
 const rail=document.querySelector('.article-section-rail')
 if(!panel||!rail)return
 const header=document.querySelector('.public-nav')
 const contentTop=window.scrollY+panel.getBoundingClientRect().top-rail.getBoundingClientRect().height-14
 // Keep the section below the reading margin once the header is hidden.
 const top=contentTop>120 ? 12 : (header?.offsetHeight||0)
 const destination=contentTop-top
 window.scrollTo({top:Math.max(0,destination),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})
}
async function tabKeydown(event) {
 const nav=event.currentTarget
 const count=postSections.value.length+1
 const current=activeSection.value+1
 let next
 if(event.key==='ArrowRight')next=(current+1)%count
 else if(event.key==='ArrowLeft')next=(current+count-1)%count
 else if(event.key==='Home')next=0
 else if(event.key==='End')next=count-1
 else return
 event.preventDefault()
 selectArticleSection(next-1)
 await nextTick()
 const tab=nav?.querySelectorAll('[role="tab"]')[next]
 tab?.focus({preventScroll:true})
 if(tab && tab.offsetLeft<nav.scrollLeft)nav.scrollLeft=tab.offsetLeft
 else if(tab && tab.offsetLeft+tab.offsetWidth>nav.scrollLeft+nav.clientWidth)nav.scrollLeft=tab.offsetLeft+tab.offsetWidth-nav.clientWidth
}
const mediaFor = (url) => mediaFromUrl(url)
const richText = (value) => renderRichText(value)
const sectionSubtitle = (section = {}) => String(section.subtitle || '').trim()
const postReleaseTime = computed(() => getTime(post.value.releaseAt || post.value.scheduledAt))
const isUpcomingPost = computed(() => postReleaseTime.value > Date.now())
const readRewardStars = computed(() => {
  const configuredReward = Math.max(0, Number(post.value.starReward || READ_REWARD_STARS))
  const multiplier = Math.max(0, Number(post.value.rewardMultiplier || 1))
  return Math.max(0, Math.round(configuredReward * multiplier))
})
const authorIcon = computed(() => authorProfile.value ? resolveProfileIcon(authorProfile.value) : '')
const authorIconMeta = computed(() => authorProfile.value ? resolveProfileIconMeta(authorProfile.value) : {})
const normalizeCategory = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
const isAnalysisPost = computed(() => Boolean(normalizeCategory(post.value.category).includes('analisis') && post.value.analysis))
const analysisScore = computed(() => analysisRating(post.value.analysis))
const analysisTier = computed(() => {
  const score = analysisScore.value
  if (score >= 95) {
      return {
        key: 'legendary',
        label: 'LEGENDARY',
        pattern: 'LEGENDARY',
        range: '95+'
      }
  }

  if (score >= 85) {
      return {
        key: 'gold',
        label: 'GOLD',
        pattern: 'GOLD',
        range: '85+'
      }
  }

  if (score >= 75) {
      return {
        key: 'purple',
        label: 'PREMIUM',
        pattern: 'PREMIUM',
        range: '75+'
      }
  }

  if (score >= 65) {
      return {
        key: 'blue',
        label: 'COOL',
        pattern: 'COOL',
        range: '65+'
      }
  }

  return {
    key: 'dark',
    label: 'REVIEW',
    pattern: 'REVIEW',
    range: '<65'
  }
})
const analysisPros = computed(() => Array.isArray(post.value.analysis?.pros) ? post.value.analysis.pros : [])
const analysisCons = computed(() => Array.isArray(post.value.analysis?.cons) ? post.value.analysis.cons : [])
const readBadgeText = computed(() => {
  if (readStatus.value.awarded) return `Visto +${readRewardStars.value}`
  if (readStatus.value.viewed) return 'Visto'
  return 'No visto'
})

const loadPost = async () => {
  const requestId = ++loadRequestId
  activeSection.value = -1
  isLoading.value = true
  clearReadTimer()
  hasReachedEnd.value = false
  readDelayPassed.value = false
  rewardChecked.value = false
  readStatus.value = { viewed: false, awarded: false }
  relatedPosts.value = []
  isFavorite.value = false
  authorProfile.value = null
  post.value = { sections: [] }

  try {
    let snap = await getDoc(doc(db, "posts", route.params.id))

    if (!snap.exists()) {
      const postsSnap = await getDocs(collection(db, "posts"))
      const slugMatch = postsSnap.docs.find(item => String(item.data()?.slug || '') === String(route.params.id || ''))
      if (slugMatch) {
        snap = slugMatch
      }
    }

    if (snap.exists()) {
      const loadedPost = { id: snap.id, sections: [], ...snap.data() }
      if (requestId !== loadRequestId) return

      if (loadedPost.placement === 'hero' || loadedPost.isMainEntry) {
        router.replace('/')
        return
      }

      if (loadedPost.visibility === 'private') {
        router.replace('/noticias')
        return
      }

      post.value = loadedPost
      if (loadedPost.slug && String(route.params.id) !== String(loadedPost.slug)) {
        router.replace(`/post/${loadedPost.slug}`)
      }
      isLoading.value = false

      if (isUpcomingPost.value) {
        loadAuthorProfile(requestId).catch(console.error)
        return
      }

      markPostViewed()
      startReadRewardTimer()
      setTimeout(checkEndReached, 80)
      loadPostExtras(requestId).catch(console.error)
    }
  } finally {
    if (requestId === loadRequestId && !post.value.id) {
      isLoading.value = false
    }
  }
}

const loadPostExtras = async (requestId) => {
  await Promise.allSettled([
    loadAuthorProfile(requestId),
    loadFavorite(requestId),
    loadReadStatus(requestId),
    loadRelatedPosts(requestId)
  ])
}

const loadAuthorProfile = async (requestId = loadRequestId) => {
  authorProfile.value = null
  if (!post.value.authorId) return

  const snap = await getDoc(doc(db, 'users', post.value.authorId))
  if (requestId !== loadRequestId) return
  if (snap.exists()) {
    authorProfile.value = { id: snap.id, ...snap.data() }
  }
}

const loadFavorite = async (requestId = loadRequestId) => {
  const user = auth.currentUser
  isFavorite.value = false
  if (!user || !post.value.id) return

  const snap = await getDoc(doc(db, 'users', user.uid, 'favorites', post.value.id))
  if (requestId !== loadRequestId) return
  isFavorite.value = snap.exists()
}

const loadRelatedPosts = async (requestId = loadRequestId) => {
  const snap = await getDocs(collection(db, "posts"))
  if (requestId !== loadRequestId) return
  const category = post.value.category || ''

  relatedPosts.value = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(item => item.id !== post.value.id && item.status === 'approved' && item.visibility !== 'private' && item.visibility !== 'unlisted' && item.placement !== 'hero' && !item.isMainEntry)
    .sort((a, b) => {
      const categoryScore = Number((b.category || '') === category) - Number((a.category || '') === category)
      if (categoryScore !== 0) return categoryScore
      return getTime(b.createdAt) - getTime(a.createdAt)
    })
    .slice(0, 3)
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatDateTime = (timestamp) => {
  const time = getTime(timestamp)
  if (!time) return ''
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(time))
}

const getTime = (timestamp) => {
  if (!timestamp) return 0
  return timestamp?.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime()
}

const goSection = index => selectArticleSection(index)
const goTop = () => selectArticleSection(-1)

const postPath = (postOrId) => {
  if (typeof postOrId === 'object' && postOrId) return `/post/${postOrId.slug || postOrId.id}`
  return `/post/${postOrId}`
}

const goPost = (postOrId) => {
  router.push(postPath(postOrId))
}

const goProfile = (uid) => {
  if (uid) router.push(`/perfil/${uid}`)
}

const clearReadTimer = () => {
  if (!readTimer) return
  clearTimeout(readTimer)
  readTimer = null
}

const viewedStorageKey = () => {
  const uid = auth.currentUser?.uid || 'guest'
  return `viewedPosts:${uid}`
}

const continueStorageKey = () => {
  const uid = auth.currentUser?.uid || 'guest'
  return `continueReading:${uid}`
}

const getViewedPosts = () => {
  if (typeof localStorage === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(viewedStorageKey()) || '[]')
  } catch (error) {
    return []
  }
}

const markPostViewed = () => {
  if (!post.value.id || typeof localStorage === 'undefined') return
  const viewed = new Set(getViewedPosts())
  viewed.add(post.value.id)
  localStorage.setItem(viewedStorageKey(), JSON.stringify([...viewed].slice(-300)))
  localStorage.setItem(continueStorageKey(), JSON.stringify({
    id: post.value.id,
    title: post.value.title || '',
    image: post.value.image || '',
    category: post.value.category || 'General',
    authorName: post.value.authorName || 'Redactor',
    createdAt: post.value.createdAt || null,
    content: post.value.content || '',
    viewedAt: Date.now()
  }))
  readStatus.value = { ...readStatus.value, viewed: true }
}

const loadReadStatus = async (requestId = loadRequestId) => {
  const user = auth.currentUser
  const viewed = post.value.id ? getViewedPosts().includes(post.value.id) : false
  if (!user || !post.value.id) {
    readStatus.value = { viewed, awarded: false }
    return
  }

  const snap = await getDoc(doc(db, 'users', user.uid, 'readPosts', post.value.id))
  if (requestId !== loadRequestId) return
  readStatus.value = { viewed: viewed || snap.exists(), awarded: snap.exists() }
}

const startReadRewardTimer = () => {
  const user = auth.currentUser
  if (!user || !post.value.id) return

  readTimer = setTimeout(() => {
    readDelayPassed.value = true
    tryAwardRead()
  }, getReadRewardDelayMs())
}

const checkEndReached = () => {
  if (typeof window === 'undefined' || !post.value.id) return
  const scrollBottom = window.scrollY + window.innerHeight
  const target = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - 80
  if (scrollBottom >= target) {
    hasReachedEnd.value = true
    tryAwardRead()
  }
}

const tryAwardRead = async () => {
  const user = auth.currentUser
  if (!user || !post.value.id || rewardChecked.value || readStatus.value.awarded) return
  if (!hasReachedEnd.value || !readDelayPassed.value) return

  rewardChecked.value = true

  try {
    const result = await awardPostRead({ user, post: post.value })
    if (result.awarded) {
      readStatus.value = { viewed: true, awarded: true }
      rewardToast.value = {
        show: true,
        message: `Has ganado ${result.awardedStars || readRewardStars.value} estrellas`
      }
      setTimeout(() => {
        rewardToast.value.show = false
      }, 3200)
    } else {
      await loadReadStatus()
    }
  } catch (error) {
    rewardChecked.value = false
    console.error(error)
  }
}

const share = (platform) => {
  const url = encodeURIComponent(currentUrl.value)
  const title = encodeURIComponent(post.value.title || '')
  const links = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    whatsapp: `https://api.whatsapp.com/send?text=${title}%20${url}`
  }

  window.open(links[platform], '_blank', 'noopener,noreferrer,width=720,height=520')
}

const copyLink = async () => {
  const url = post.value.slug && typeof window !== 'undefined'
    ? `${window.location.origin}${publicPostPath.value}`
    : currentUrl.value
  await navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1800)
}

const ensureMetaTag = (name, content) => {
  if (typeof document === 'undefined') return
  let meta = document.querySelector(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', name)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

const ensurePropertyMeta = (property, content) => {
  if (typeof document === 'undefined' || !content) return
  let meta = document.querySelector(`meta[property="${property}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('property', property)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

const absoluteUrl = (value) => {
  if (!value || typeof window === 'undefined') return ''
  try {
    return new URL(resolveAssetUrl(value), import.meta.env.VITE_SITE_URL || window.location.origin).href
  } catch {
    return ''
  }
}

const seoDescription = () => String(post.value.metaDescription || post.value.summary || post.value.content || '')
  .replace(/[*_#>`\[\]]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 160)

const isoDate = (value) => {
  const time = getTime(value)
  return time ? new Date(time).toISOString() : ''
}

const ensureArticleSchema = (canonical, description, image) => {
  let script = document.querySelector('#post-article-schema')
  if (!script) {
    script = document.createElement('script')
    script.id = 'post-article-schema'
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.value.title || 'Galaxia Nintendera',
    description,
    mainEntityOfPage: canonical,
    url: canonical,
    author: {
      '@type': 'Person',
      name: post.value.authorName || 'Redaccion Galaxia Nintendera'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Galaxia Nintendera',
      logo: {
        '@type': 'ImageObject',
        url: `${import.meta.env.VITE_SITE_URL || window.location.origin}/icons/icon-192.png`
      }
    }
  }

  if (image) schema.image = [image]
  const game = post.value.game || {}
  const gameName = game.nameEs || game.nameEn
  if (gameName) {
    schema.about = {
      '@type': 'VideoGame',
      name: gameName
    }
    if (game.nameEn && game.nameEn !== gameName) schema.about.alternateName = game.nameEn
    if (Array.isArray(game.platforms) && game.platforms.length) {
      schema.about.gamePlatform = game.platforms
        .map(platform => typeof platform === 'string' ? platform.replace(/\?$/, '').trim() : platform?.name)
        .filter(Boolean)
    }
    if (game.releaseDate) schema.about.datePublished = game.releaseDate
    const officialUrls = [game.officialUrl, ...(Array.isArray(game.officialLinks) ? game.officialLinks.map(link => link?.url) : [])]
      .filter(url => /^https?:\/\//i.test(url || ''))
    if (officialUrls.length) schema.about.sameAs = officialUrls
  }
  const published = isoDate(post.value.releaseAt || post.value.createdAt)
  const modified = isoDate(post.value.updatedAt || post.value.createdAt)
  if (published) schema.datePublished = published
  if (modified) schema.dateModified = modified
  script.textContent = JSON.stringify(schema)
}

const ensureCanonical = (href) => {
  if (typeof document === 'undefined') return
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

const applyPostSeo = () => {
  if (typeof document === 'undefined' || !post.value.id) return
  const title = `${post.value.title || 'Post'} | Galaxia Nintendera`
  const description = seoDescription()
  const image = absoluteUrl(post.value.image)
  document.title = title
  ensureMetaTag('description', description)
  ensureMetaTag('keywords', Array.isArray(post.value.keywords) ? post.value.keywords.join(', ') : '')
  ensureMetaTag('robots', post.value.indexGoogle === false || post.value.visibility === 'private' ? 'noindex,nofollow' : 'index,follow')
  const canonical = post.value.canonicalUrl || `${import.meta.env.VITE_SITE_URL || window.location.origin}${publicPostPath.value}`
  ensureCanonical(canonical)
  ensurePropertyMeta('og:type', 'article')
  ensurePropertyMeta('og:site_name', 'Galaxia Nintendera')
  ensurePropertyMeta('og:title', title)
  ensurePropertyMeta('og:description', description)
  ensurePropertyMeta('og:url', canonical)
  ensurePropertyMeta('og:image', image)
  ensureMetaTag('twitter:card', image ? 'summary_large_image' : 'summary')
  ensureMetaTag('twitter:title', title)
  ensureMetaTag('twitter:description', description)
  ensureMetaTag('twitter:image', image)
  ensureArticleSchema(canonical, description, image)
}

const toggleFavorite = async () => {
  const user = auth.currentUser
  if (!user) {
    router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }

  if (savingFavorite.value || !post.value.id) return

  savingFavorite.value = true

  try {
    const favoriteRef = doc(db, 'users', user.uid, 'favorites', post.value.id)

    if (isFavorite.value) {
      await deleteDoc(favoriteRef)
      isFavorite.value = false
    } else {
      await setDoc(favoriteRef, {
        postId: post.value.id,
        postSlug: post.value.slug || '',
        title: post.value.title || '',
        image: post.value.image || '',
        category: post.value.category || 'General',
        authorName: post.value.authorName || 'Redactor',
        createdAt: post.value.createdAt || null,
        savedAt: Date.now()
      })
      isFavorite.value = true
    }
  } finally {
    savingFavorite.value = false
  }
}

let authorAlignmentObserver
function alignReaderActions() {
 const root=document.querySelector('.editorial-page')
 const author=root?.querySelector('.hero-author')
 const sidebar=root?.querySelector('.post-sidebar')
 const actions=sidebar?.querySelector('.reader-actions')
 if(!author || !sidebar || !actions || window.innerWidth<1200) return
 const a=author.getBoundingClientRect(), b=sidebar.getBoundingClientRect()
 sidebar.style.setProperty('--reader-actions-top', (a.top+a.height/2-b.top-actions.offsetHeight/2)+'px')
}
watch(isLoading, async loading => {
 authorAlignmentObserver?.disconnect()
 if(loading) return
 await nextTick()
 authorAlignmentObserver=new ResizeObserver(alignReaderActions)
 for(const el of document.querySelectorAll('.editorial-page .hero-content,.editorial-page .hero-author,.editorial-page .post-sidebar')) authorAlignmentObserver.observe(el)
 alignReaderActions()
}, {flush:'post'})
watch(() => route.params.id, loadPost, { immediate: true })
watch(post, applyPostSeo, { deep: true })
onMounted(() => {
  previousTitle = document.title
  window.addEventListener('scroll', checkEndReached, { passive: true })
  const navbar=document.querySelector('.public-nav')
  if(navbar){
    const measure=()=>{actualNavHeight.value=navbar.getBoundingClientRect().height}
    measure()
    navbarObserver=new ResizeObserver(measure)
    navbarObserver.observe(navbar)
  }
  window.addEventListener('resize', checkEndReached)
  window.addEventListener('resize', alignReaderActions)
})
onUnmounted(() => {
  if (previousTitle) document.title = previousTitle
  document.querySelector('#post-article-schema')?.remove()
  clearReadTimer()
  window.removeEventListener('scroll', checkEndReached)
  navbarObserver?.disconnect()
  authorAlignmentObserver?.disconnect()
  window.removeEventListener('resize', alignReaderActions)
  window.removeEventListener('resize', checkEndReached)
})
</script>

<template>
  <ReaderLoadingShell v-if="isLoading" :style="{...articleThemeStyle,'--article-nav-height':actualNavHeight ? actualNavHeight+'px' : undefined}" />

  <div
    v-else
    class="post-page"
    :class="[{ 'analysis-page': isAnalysisPost, 'editorial-page':true, 'section-focused':activeSection>=0, 'visual-themed-article':Object.keys(articleThemeStyle).length }, isAnalysisPost ? `analysis-tier-${analysisTier.key}` : '']"
    :style="{...articleThemeStyle,'--article-nav-height':actualNavHeight ? actualNavHeight+'px' : undefined,...(isAnalysisPost ? { '--analysis-pattern': `'${analysisTier.pattern}'` } : {})}"
  >
    <div v-if="isAnalysisPost" class="analysis-pattern-field" aria-hidden="true">
      <span v-for="tile in 36" :key="tile">{{ analysisTier.pattern }}</span>
    </div>
    <div class="post-ambient-lights" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>

    <main v-soft-reveal="'.post-content-section,.post-sidebar > *'" class="post-layout">
      <FloatingBackButton fallback="/noticias" />
        <PostCinematicHero
          :post="post"
          :author-profile="authorProfile"
          :author-icon="authorIcon"
          :author-icon-meta="authorIconMeta"
          :is-analysis="isAnalysisPost"
          :editorial="true"
          :show-actions="false"
          :analysis-score="analysisScore"
          :analysis-tier="analysisTier"
          :read-status="readStatus"
          :read-badge-text="readBadgeText"
          :is-favorite="isFavorite"
          :saving-favorite="savingFavorite"
          :date-label="formatDate(post.createdAt)"
          @favorite="toggleFavorite"
          @profile="goProfile"
          @copy="copyLink"
          @home="router.push('/')"
          @news="router.push('/#noticias')"
        />
      <article class="post-article" id="article-introduction">
        <ScrollTabRail v-if="postSections.length && !isUpcomingPost" class="article-section-rail"><nav class="article-section-nav" role="tablist" aria-label="Apartados de la publicación" @keydown="tabKeydown">
          <button id="article-tab-all" type="button" role="tab" aria-controls="article-reading-panel" :aria-selected="activeSection===-1" :tabindex="activeSection===-1 ? 0 : -1" @click="selectArticleSection(-1)">{{ isAnalysisPost ? 'Análisis' : 'Noticia' }}</button>
          <button v-for="(section,index) in postSections" :id="'article-tab-'+index" :key="index" type="button" role="tab" aria-controls="article-reading-panel" :aria-selected="activeSection===index" :tabindex="activeSection===index ? 0 : -1" :title="section.title" @click="selectArticleSection(index)">{{ sectionNavLabel(section,index) }}</button>
        </nav></ScrollTabRail>
        <div id="article-reading-panel" class="article-reading-panel" :role="postSections.length ? 'tabpanel' : undefined" :aria-labelledby="postSections.length ? (activeSection===-1 ? 'article-tab-all' : 'article-tab-'+activeSection) : undefined" tabindex="-1">
        <div v-if="activeSection===-1 && post.content && !isUpcomingPost" class="analysis-introduction rich-content reading-prose" v-html="richText(post.content)"></div>



        <section v-if="isUpcomingPost" class="upcoming-post-lock">
          <span><i class="far fa-calendar"></i> Proximamente</span>
          <h2>Disponible para leer el {{ formatDateTime(postReleaseTime) }}</h2>
          <p>Este post ya esta anunciado en el calendario global, pero su contenido se abrira automaticamente cuando llegue la fecha de lanzamiento.</p>
          <button type="button" @click="router.push('/')">
            Volver al inicio
          </button>
        </section>

        <template v-else>
          <section
            v-for="section in displayedSections"
            :id="`section-${section.articleIndex}`"
            :key="section.articleIndex"
            class="post-content-section scroll-mt-28"
          >
            <h2 class="text-xl font-black text-gray-800 mb-2">
              {{ section.title }}
            </h2>

            <div
              v-if="section.image"
              class="post-section-image post-section-media post-content-image"
              :class="{ video: isVideoMedia(mediaFor(section.image)) }"
            >
              <iframe
                v-if="mediaFor(section.image).type === 'youtube'"
                :src="mediaFor(section.image).embedUrl"
                :title="section.title || `Seccion ${section.articleIndex + 1}`"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
              <video v-else-if="mediaFor(section.image).type === 'video'" :src="mediaFor(section.image).url" controls playsinline></video>
              <img v-else :src="mediaFor(section.image).url" alt="" loading="lazy" decoding="async" />
            </div>

            <p v-if="sectionSubtitle(section)" class="post-section-subtitle">
              {{ sectionSubtitle(section) }}
            </p>

            <div class="post-paragraph rich-content reading-prose" v-html="richText(section.content)"></div>
          </section>
        </template>


        </div>
      </article>

      <aside class="post-sidebar">
        <ReaderActions :read-status="readStatus" :read-badge-text="readBadgeText" :is-favorite="isFavorite" :saving-favorite="savingFavorite" @favorite="toggleFavorite" @copy="copyLink" />
        <AnalysisRatingCard v-if="isAnalysisPost && !isUpcomingPost" :analysis="post.analysis" :tier="analysisTier" />
        <GameInfoCard v-if="!isUpcomingPost" :game="post.game || {}" />
        <section v-if="isAnalysisPost && !isUpcomingPost && (analysisPros.length || analysisCons.length)" class="editorial-verdict post-side-card">
          <div v-if="analysisPros.length"><h3>Lo mejor</h3><ul><li v-for="item in analysisPros" :key="item">{{ item }}</li></ul></div>
          <div v-if="analysisCons.length"><h3>A mejorar</h3><ul><li v-for="item in analysisCons" :key="item">{{ item }}</li></ul></div>
        </section>
        <div class="post-side-card">
          <h3 class="post-side-title">Contenido</h3>

          <ul class="post-index">
            <li>
              <button @click="goTop">
                {{ isAnalysisPost ? 'Análisis completo' : 'Noticia completa' }}
              </button>
            </li>
            <li v-for="(section, i) in postSections" :key="i">
              <button @click="goSection(i)">
                {{ i + 2 }}. {{ section.title }}
              </button>
            </li>
          </ul>
        </div>

        <div class="post-side-card">
          <h3 class="post-side-title">Compartir</h3>

          <div class="share-actions">
            <button aria-label="Compartir en Facebook" @click="share('facebook')">
              <i class="fab fa-facebook-f"></i>
            </button>
            <button aria-label="Compartir en X" @click="share('twitter')">
              <i class="fab fa-twitter"></i>
            </button>
            <button aria-label="Compartir en WhatsApp" @click="share('whatsapp')">
              <i class="fab fa-whatsapp"></i>
            </button>
            <button aria-label="Copiar enlace" @click="copyLink">
              <i class="fas fa-link"></i>
            </button>
          </div>

          <p v-if="copied" class="copy-feedback">Enlace copiado</p>
        </div>

        <div v-if="relatedPosts.length" class="post-side-card">
          <h3 class="post-side-title">Noticias relacionadas</h3>

          <div class="related-list">
            <button
              v-for="item in relatedPosts"
              :key="item.id"
              class="related-item"
              @click="goPost(item)"
            >
              <img
                v-if="item.image"
                :src="resolveAssetUrl(item.image)"
                class="related-image"
              />
              <div v-else class="related-image related-placeholder"></div>

              <span>
                <strong>{{ item.title }}</strong>
                <small>{{ item.authorName || 'Redactor' }}</small>
              </span>
            </button>
          </div>
        </div>
      </aside>
    </main>

    <Transition name="toast">
      <div v-if="rewardToast.show" class="read-reward-toast">
        <i class="fas fa-star"></i>
        <span>{{ rewardToast.message }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.post-page {
  background:
    radial-gradient(circle at 82% 8%, rgba(250, 204, 21, 0.28), transparent 30%),
    radial-gradient(circle at 56% 18%, rgba(236, 72, 153, 0.28), transparent 34%),
    radial-gradient(circle at 14% 34%, rgba(34, 211, 238, 0.2), transparent 32%),
    linear-gradient(135deg, #061120 0%, #26104b 42%, #5b214f 70%, #503712 100%);
  color: #e5e7eb;
  min-height: 100vh;
  overflow-x: clip;
  position: relative;
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
}

.post-page.analysis-page {
  background:
    radial-gradient(circle at 82% 2%, rgba(250, 204, 21, 0.4), transparent 30%),
    radial-gradient(circle at 18% 28%, rgba(217, 119, 6, 0.2), transparent 32%),
    linear-gradient(135deg, #100b04, #211506 48%, #3a2407);
}

.analysis-pattern-field {
  display: grid;
  gap: clamp(52px, 6vw, 96px) clamp(96px, 10vw, 180px);
  grid-template-columns: repeat(6, max-content);
  left: 50%;
  opacity: 0.42;
  pointer-events: none;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-22deg);
  width: max-content;
  z-index: 0;
}

.analysis-pattern-field span {
  color: rgba(255, 244, 194, 0.11);
  font-size: clamp(54px, 6vw, 112px);
  font-weight: 950;
  line-height: 0.9;
  text-transform: uppercase;
  white-space: nowrap;
}

.post-ambient-lights {
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  position: fixed;
  z-index: 0;
}

.post-ambient-lights span {
  animation: ambientDrift 7s ease-in-out infinite;
  background: radial-gradient(circle, rgba(216, 180, 254, 0.72) 0 8%, rgba(168, 85, 247, 0.28) 22%, transparent 58%);
  border-radius: 999px;
  height: 150px;
  opacity: 0.36;
  position: absolute;
  width: 150px;
}

.post-ambient-lights span:nth-child(1) { right: 8%; top: 18%; }
.post-ambient-lights span:nth-child(2) { animation-delay: -2.4s; height: 110px; left: 4%; top: 45%; width: 110px; }
.post-ambient-lights span:nth-child(3) { animation-delay: -4.8s; bottom: 8%; height: 130px; left: 58%; width: 130px; }

.analysis-page .post-ambient-lights span {
  background: radial-gradient(circle, rgba(254, 240, 138, 0.82) 0 7%, rgba(245, 158, 11, 0.32) 22%, transparent 58%);
  opacity: 0.48;
}

.post-layout {
  display: grid;
  gap: 28px;
  margin: 0 auto;
  max-width: 1200px;
  padding: 104px 0 56px;
  position: relative;
  width: calc(100% - clamp(48px, 12vw, 180px));
  z-index: 1;
}

.post-article {
  display: grid;
  gap: 24px;
  min-width: 0;
}

.post-sidebar {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.post-paragraph {
  color: #dbe4f0;
  font-size: 16px;
  line-height: 1.86;
}

.rich-content :deep(p) { margin: 0 0 14px; }
.rich-content :deep(strong) { color: #ffffff; font-weight: 950; }
.rich-content :deep(em) { font-style: italic; }
.rich-content :deep(u) { text-decoration: underline; text-decoration-color: #c084fc; text-decoration-thickness: 2px; text-underline-offset: 3px; }
.rich-content :deep(ul), .rich-content :deep(ol) { counter-reset: article-list; display: grid; gap: 10px; margin: 14px 0 18px; padding: 0; }
.rich-content :deep(li) { list-style: none; padding: 0 0 8px 28px; position: relative; }
.rich-content :deep(li::before) { background: radial-gradient(circle, #fde68a 0 28%, #f59e0b 38%, #a855f7 76%); border-radius: 999px; box-shadow: 0 0 14px rgba(250, 204, 21, 0.42), 0 0 26px rgba(168, 85, 247, 0.22); content: ""; height: 9px; left: 4px; position: absolute; top: 0.72em; transform: translateY(-50%); width: 9px; }
.rich-content :deep(li::after) { background: linear-gradient(90deg, rgba(250, 204, 21, 0.38), rgba(168, 85, 247, 0.16), transparent); border-radius: 999px; bottom: 0; content: ""; height: 1px; left: 28px; position: absolute; right: 0; }
.rich-content :deep(ol > li) { counter-increment: article-list; padding-left: 40px; }
.rich-content :deep(ol > li::before) { align-items: center; background: linear-gradient(135deg, #facc15, #a855f7); color: #ffffff; content: counter(article-list); display: inline-flex; font-size: 11px; font-weight: 950; height: 23px; justify-content: center; left: 0; line-height: 1; top: 0.76em; width: 23px; }
.rich-content :deep(blockquote) { background: rgba(168, 85, 247, 0.12); border-left: 4px solid #a855f7; border-radius: 10px; margin: 14px 0; padding: 12px 14px; }
.rich-content :deep(a) { color: #d8b4fe; font-weight: 900; text-decoration: underline; text-underline-offset: 3px; }
.rich-content :deep(hr) { border: 0; border-top: 1px solid rgba(216, 180, 254, 0.35); margin: 18px 0; }
.analysis-page .rich-content :deep(blockquote) { background: rgba(250, 204, 21, 0.1); border-left-color: #facc15; }
.analysis-page .rich-content :deep(a) { color: #fde68a; }

.post-content-section {
  background: transparent;
  border: 0;
  border-radius: 0;
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 0;
}

.post-cinematic-hero + .post-content-section,
.post-cinematic-hero + .post-paragraph + .post-content-section {
  border-top: 1px solid rgba(250, 204, 21, 0.28);
  padding-top: 26px;
}

.analysis-page .post-content-section {
  border-top-color: transparent;
}

.analysis-page .post-cinematic-hero + .post-content-section,
.analysis-page .post-cinematic-hero + .post-paragraph + .post-content-section {
  border-top-color: rgba(250, 204, 21, 0.34);
}

.post-content-section h2 {
  color: #ffffff;
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 950;
  line-height: 1.08;
  margin: 0;
}

.post-section-subtitle {
  color: #d8b4fe;
  font-size: clamp(17px, 2vw, 22px);
  font-weight: 900;
  line-height: 1.35;
  margin: 0;
}

.post-section-image,
.post-section-media {
  aspect-ratio: 21 / 9;
  background:
    radial-gradient(circle at 20% 10%, rgba(168, 85, 247, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(3, 7, 18, 0.98));
  border-radius: 14px;
  justify-self: center;
  margin: 8px 0 4px;
  max-height: 430px;
  max-width: 100%;
  overflow: hidden;
  width: 100%;
}

.post-section-media img,
.post-section-media iframe,
.post-section-media video {
  border: 0;
  display: block;
  height: 100%;
  object-fit: cover;
  object-position: center;
  width: 100%;
}

.upcoming-post-lock {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(49, 20, 85, 0.9));
  border: 1px solid rgba(168, 85, 247, 0.28);
  border-radius: 18px;
  color: #ffffff;
  display: grid;
  gap: 12px;
  padding: 24px;
}

.upcoming-post-lock span { color: #c084fc; font-size: 11px; font-weight: 950; text-transform: uppercase; }
.upcoming-post-lock h2 { color: #ffffff; font-size: clamp(22px, 3vw, 34px); font-weight: 950; line-height: 1.1; }
.upcoming-post-lock p { color: #cbd5e1; font-size: 14px; font-weight: 750; line-height: 1.55; max-width: 680px; }
.upcoming-post-lock button { background: linear-gradient(135deg, #7c3aed, #c026d3); border-radius: 12px; color: #ffffff; font-size: 13px; font-weight: 950; justify-self: start; min-height: 42px; padding: 0 18px; }

.analysis-summary {
  backdrop-filter: blur(22px);
  background:
    radial-gradient(circle at 70% 0%, rgba(250, 204, 21, 0.2), transparent 38%),
    linear-gradient(145deg, rgba(42, 30, 9, 0.82), rgba(8, 10, 18, 0.86));
  border: 1px solid rgba(250, 204, 21, 0.32);
  border-radius: 22px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34), 0 0 48px rgba(245, 158, 11, 0.16);
  display: grid;
  gap: 18px;
  overflow: hidden;
  padding: 20px;
  position: relative;
}

.analysis-summary-mobile { display: none; }
.analysis-summary-side::before { color: rgba(250, 204, 21, 0.08); content: "OFFICIAL SCORE"; font-size: 42px; font-weight: 950; left: 16px; line-height: 0.86; position: absolute; right: 16px; top: 12px; }

.analysis-score-card {
  align-items: center;
  background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.16), transparent 34%), rgba(3, 7, 18, 0.48);
  border: 1px solid rgba(250, 204, 21, 0.34);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  padding: 22px 16px;
  position: relative;
}

.analysis-score-card strong { animation: scoreTextGlow 2.7s ease-in-out infinite; color: #facc15; font-size: 70px; font-weight: 950; line-height: 1; }
.analysis-score-card span { color: #fde68a; font-size: 12px; font-weight: 950; text-transform: uppercase; }

.analysis-rating-grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
.analysis-rating-grid div { align-items: center; backdrop-filter: blur(18px); background: rgba(3, 7, 18, 0.44); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; color: #ffffff; display: flex; justify-content: space-between; min-height: 48px; padding: 0 14px; }
.analysis-rating-grid span { font-size: 13px; font-weight: 900; }
.analysis-rating-grid strong { color: #facc15; display: inline-flex; gap: 4px; }

.analysis-pros-cons-view { display: grid; gap: 14px; grid-template-columns: 1fr; }
.analysis-pros-cons-view article { backdrop-filter: blur(18px); background: rgba(3, 7, 18, 0.44); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; }
.analysis-pros-cons-view article:first-child { border-left: 5px solid #22c55e; }
.analysis-pros-cons-view article:last-child { border-left: 5px solid #ef4444; }
.analysis-pros-cons-view h3 { color: #fef3c7; font-size: 15px; font-weight: 950; margin-bottom: 10px; text-transform: uppercase; }
.analysis-pros-cons-view li { color: #e7dcc4; font-size: 14px; font-weight: 700; line-height: 1.55; margin-left: 18px; }

.analysis-tier-purple .analysis-summary { border-color: rgba(192, 132, 252, 0.32); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34), 0 0 48px rgba(168, 85, 247, 0.16); }
.analysis-tier-purple .analysis-score-card strong, .analysis-tier-purple .analysis-rating-grid strong, .analysis-tier-purple .post-index button:hover { color: #c084fc; }
.analysis-tier-blue .analysis-summary { border-color: rgba(56, 189, 248, 0.28); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34), 0 0 48px rgba(56, 189, 248, 0.14); }
.analysis-tier-blue .analysis-score-card strong, .analysis-tier-blue .analysis-rating-grid strong, .analysis-tier-blue .post-index button:hover { color: #38bdf8; }
.analysis-tier-dark .analysis-score-card strong, .analysis-tier-dark .analysis-rating-grid strong, .analysis-tier-dark .post-index button:hover { color: #cbd5e1; }

.post-side-card {
  backdrop-filter: blur(18px);
  background: rgba(3, 7, 18, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.2);
  padding: 18px;
}

.post-side-title { color: #f8fafc; font-size: 14px; font-weight: 950; margin-bottom: 14px; }
.analysis-page .post-side-title { color: #fde68a; }
.post-index { display: grid; gap: 10px; }
.post-index button { color: #cbd5e1; display: block; font-size: 13px; font-weight: 750; line-height: 1.35; text-align: left; }
.post-index button:hover { color: #c084fc; }
.analysis-page .post-index button:hover { color: #facc15; }

.share-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.share-actions button { align-items: center; background: rgba(15, 23, 42, 0.72); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 999px; color: #d8b4fe; display: inline-flex; height: 36px; justify-content: center; transition: all 0.2s ease; width: 36px; }
.analysis-page .share-actions button { color: #fde68a; }
.share-actions button:hover { transform: translateY(-1px); }
.copy-feedback { color: #22c55e; font-size: 12px; font-weight: 800; margin-top: 10px; }

.related-list { display: grid; gap: 14px; }
.related-item { align-items: center; display: grid; gap: 12px; grid-template-columns: 78px 1fr; text-align: left; }
.related-item strong { color: #ffffff; display: -webkit-box; font-size: 13px; font-weight: 900; line-height: 1.3; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.related-item small { color: #cbd5e1; display: block; font-size: 11px; font-weight: 700; margin-top: 4px; }
.related-image { aspect-ratio: 16 / 10; border-radius: 8px; object-fit: cover; width: 100%; }
.related-placeholder { background: rgba(148, 163, 184, 0.2); }

.read-reward-toast { align-items: center; animation: rewardPulse 0.7s ease both; background: #111827; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; bottom: 24px; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24); color: #ffffff; display: flex; font-size: 13px; font-weight: 900; gap: 10px; left: 24px; padding: 12px 14px; position: fixed; z-index: 330; }
.read-reward-toast i { animation: rewardStar 1.2s ease-in-out infinite; color: #f59e0b; font-size: 18px; }
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-14px, 12px) scale(0.94); }

@media (min-width: 1024px) {
  .post-layout { align-items: start; grid-template-columns: minmax(0, 1fr) 360px; }
  .post-sidebar { position: sticky; top: 96px; }
}

@media (max-width: 720px) {
  .post-layout { gap: 22px; padding: 68px 0 var(--public-page-bottom-mobile, calc(112px + env(safe-area-inset-bottom))); width: 100%; }
  .post-cinematic-hero { margin-left: 6px; margin-right: 6px; }
  .post-paragraph, .post-content-section, .upcoming-post-lock, .analysis-summary-mobile { margin-left: 10px; margin-right: 10px; }
  .post-paragraph { font-size: 15px; }
  .post-content-section h2 {
    font-size: 24px;
    line-height: 1.12;
  }
  .post-content-section .post-paragraph {
    margin-left: 0;
    margin-right: 0;
    max-width: 100%;
  }
  .post-content-section .rich-content {
    text-align: left;
  }
  .post-content-section { padding: 0; }
  .post-cinematic-hero + .post-content-section,
  .post-cinematic-hero + .post-paragraph + .post-content-section {
    padding-top: 20px;
  }
  .post-section-image,
  .post-section-media {
    aspect-ratio: 16 / 9;
    max-width: 100%;
  }

  .post-section-media img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }

  .post-section-media iframe,
  .post-section-media video {
    aspect-ratio: 16 / 9;
    height: auto;
  }
  .analysis-pattern-field { display: none; }
  .post-sidebar { display: none; }
  .analysis-summary-mobile { display: grid; margin-top: 6px; }
}

@keyframes ambientDrift { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(10px, -14px, 0) scale(1.08); } }
@keyframes scoreTextGlow { 0%, 100% { text-shadow: 0 0 14px rgba(250, 204, 21, 0.24); } 50% { text-shadow: 0 0 26px rgba(250, 204, 21, 0.5); } }
@keyframes rewardPulse { 0% { transform: translate(-16px, 14px) scale(0.88); } 60% { transform: translate(0, 0) scale(1.04); } 100% { transform: translate(0, 0) scale(1); } }
@keyframes rewardStar { 0%, 100% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(14deg) scale(1.22); } }

@media (prefers-reduced-motion: reduce) {
  .post-ambient-lights span,
  .analysis-score-card strong,
  .read-reward-toast,
  .read-reward-toast i { animation: none; }
}

/* Articles use the same centered margins as the public listings. */
@media(min-width:761px){
 .post-layout { width:var(--public-content-width); max-width:1200px; }
 .post-layout { padding-top:calc(var(--public-nav-offset, 72px) + 24px); }
}
@media(min-width:1024px) and (max-width:1440px){
 .post-layout { grid-template-columns:minmax(0,1fr) 260px; gap:22px; }
}


@media(max-width:760px){
 .post-layout { padding-top:calc(var(--public-nav-offset, 64px) + 16px); }
}
.post-content-section { scroll-margin-top:calc(var(--public-nav-offset, 72px) + 20px); }

.article-section-rail{position:sticky;top:var(--article-nav-height,var(--public-nav-offset,72px));z-index:10;justify-self:start;width:100%}.article-section-rail .article-section-nav{position:static}
</style>



<style scoped>
.post-page.visual-themed-article{background:radial-gradient(ellipse at 85% 5%,color-mix(in srgb,var(--visual-primary) 25%,transparent),transparent 45%),radial-gradient(ellipse at 10% 45%,color-mix(in srgb,var(--visual-secondary) 18%,transparent),transparent 55%),var(--visual-background);color:var(--visual-text)}
.post-page.analysis-page.visual-themed-article{background:radial-gradient(ellipse at 90% 5%,color-mix(in srgb,var(--visual-primary) 70%,transparent),transparent 65%),linear-gradient(120deg,var(--visual-background),color-mix(in srgb,var(--visual-secondary) 65%,var(--visual-background)));}
.visual-themed-article .post-side-card{background:color-mix(in srgb,var(--visual-surface) 92%,transparent);border-color:var(--visual-border);color:var(--visual-text)}
.visual-themed-article .post-ambient-lights span{background:radial-gradient(circle,var(--visual-primary),transparent 65%);opacity:.25}
.visual-themed-article .share-actions button{color:var(--visual-accent);border-color:var(--visual-border)}
.visual-themed-article .post-content-section{border-color:var(--visual-border)}
</style>

<style scoped>
.editorial-rating-mobile,.editorial-game-mobile,.editorial-verdict-mobile{display:none}
.article-section-nav{position:sticky;top:76px;z-index:10;display:flex;gap:5px;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;padding:7px;background:#10121ef5;border:1px solid #ffffff20;border-radius:14px;min-width:0;max-width:100%;box-shadow:0 8px 22px #0003}
.article-section-nav button{flex:0 0 auto;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:10px 15px;border:0;border-radius:999px;background:transparent;color:#e5e7eb;font-size:12px;font-weight:700;cursor:pointer;min-height:40px}.article-section-nav button[aria-selected="true"]{background:#ffda64;color:#241b05}.article-section-nav button:focus-visible{outline:2px solid #ffda64;outline-offset:-2px}
#article-introduction{scroll-margin-top:85px}.editorial-page .post-content-section{scroll-margin-top:160px}.analysis-introduction{font-size:17px;line-height:1.85;color:#dae0eb}.editorial-verdict h3{font-size:15px;color:#ffe49a;margin-bottom:10px}.editorial-verdict ul{padding-left:18px;margin:0 0 14px;font-size:14px;line-height:1.7;color:#dce2ec}.editorial-page .analysis-pattern-field{display:none}.post-page.editorial-page.visual-themed-article{background:radial-gradient(ellipse at 90% 0,color-mix(in srgb,var(--visual-primary,#725818) 18%,transparent),transparent 65%),#0b0d18}.editorial-page .post-content-section h2{font-size:clamp(26px,2.5vw,34px);line-height:1.25}.editorial-page .post-paragraph,.analysis-introduction{font-weight:400}.editorial-page .rich-content :deep(strong){font-weight:750}
@media(min-width:1024px){.post-layout>.post-cinematic-hero{grid-column:1;grid-row:1}.post-article{grid-column:1;grid-row:2;align-content:start}.post-sidebar{grid-column:2;grid-row:1 / span 2;position:static;align-content:start}.editorial-page .post-layout{max-width:1320px;width:calc(100% - 80px);grid-template-columns:minmax(0,1fr) 330px;gap:28px}.editorial-page .post-layout>.post-cinematic-hero{grid-column:1/-1}.editorial-page .post-sidebar{grid-row:2}.editorial-page .post-article{gap:28px}}
@media(max-width:1023px){.editorial-page .post-sidebar{display:none}.editorial-rating-mobile,.editorial-game-mobile,.editorial-verdict-mobile{display:block}.editorial-rating-mobile{display:grid}.editorial-page .post-layout{width:calc(100% - 32px)}.editorial-page .post-layout>.post-cinematic-hero{margin:0}.article-section-nav{top:68px}.analysis-introduction{font-size:16px}.editorial-page .post-content-section,.analysis-introduction{margin:0}.editorial-page .post-paragraph{margin:0}.editorial-page .post-content-section h2{font-size:clamp(24px,5vw,32px);line-height:1.25}}
</style>

<style scoped>
/* Full width artwork, with the reading columns kept within the editorial measure. */
@media(min-width:1024px){
 .editorial-page .post-layout{width:100%;max-width:none;grid-template-columns:minmax(12px,1fr) minmax(0,962px) 330px minmax(12px,1fr)}
 .editorial-page .post-layout>.post-cinematic-hero{grid-column:1/-1}
 .editorial-page .post-article{grid-column:2}
 .editorial-page .post-sidebar{grid-column:3}
}
@media(max-width:1023px){
 .editorial-page .post-layout{width:100%;grid-template-columns:16px minmax(0,1fr) 16px;column-gap:0}
 .editorial-page .post-layout>.post-cinematic-hero{grid-column:1/-1}
 .editorial-page .post-article{grid-column:2}
}
</style>

<style scoped>
.editorial-page .post-layout>.post-cinematic-hero{padding-bottom:180px;margin-bottom:-180px;border-bottom:0;box-shadow:none;mask-image:linear-gradient(to bottom,#000 calc(100% - 110px),transparent);-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 110px),transparent)}
.editorial-page .post-layout>.post-cinematic-hero :deep(.hero-content){min-height:540px}
.editorial-page .post-article{position:relative}.editorial-page .post-sidebar{z-index:1}
@media(max-width:760px){
 .editorial-page .post-layout>.post-cinematic-hero{padding-bottom:130px;margin-bottom:-130px}
 .editorial-page .post-layout>.post-cinematic-hero :deep(.hero-content){min-height:640px}
}
</style>

<style scoped>
.editorial-page .post-layout{padding-top:var(--public-nav-offset,72px)}
.article-section-nav{width:max-content;max-width:100%;justify-self:start;box-sizing:border-box}
.editorial-page .post-layout>.post-cinematic-hero{padding-bottom:280px;margin-bottom:-280px;mask-image:linear-gradient(to bottom,#000 calc(100% - 280px),#000b calc(100% - 140px),transparent);-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 280px),#000b calc(100% - 140px),transparent)}
@media(max-width:760px){.editorial-page .post-layout{padding-top:var(--public-nav-offset,64px)}.editorial-page .post-layout>.post-cinematic-hero{padding-bottom:200px;margin-bottom:-200px;mask-image:linear-gradient(to bottom,#000 calc(100% - 200px),transparent);-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 200px),transparent)}}
</style>

<style scoped>
.editorial-page .post-layout{padding-top:var(--article-nav-height,var(--public-nav-offset,72px))}
.article-reading-panel{display:grid;gap:24px;align-content:start;min-width:0;overflow-anchor:none}
.editorial-page .article-reading-panel{min-height:100svh}
.article-section-nav{top:var(--article-nav-height,var(--public-nav-offset,72px))}
@media(max-width:760px){.editorial-page .post-layout{padding-top:var(--article-nav-height,var(--public-nav-offset,64px))}}
</style>

<style scoped>
/* Explicit zero-minimum tracks prevent long navigation labels and media from widening the article. */
.post-article,.article-reading-panel{grid-template-columns:minmax(0,1fr);min-width:0;max-width:100%}
.article-reading-panel>*{min-width:0;max-width:100%;box-sizing:border-box}
.article-section-nav{width:fit-content;min-width:0;max-width:100%}
.editorial-page{--analysis-tail:clamp(180px,22vw,280px)}
.editorial-page .post-content-section{min-width:0;max-width:100%}
.editorial-page .post-content-section h2,.analysis-introduction,.editorial-page .post-paragraph{overflow-wrap:anywhere;min-width:0;max-width:100%}
.editorial-page .post-section-media{width:100%;min-width:0;max-width:100%;overflow:hidden}
.editorial-page .post-section-media :is(img,video,iframe){max-width:100%;box-sizing:border-box}
.editorial-page .post-layout>.post-cinematic-hero{padding-bottom:var(--analysis-tail);margin-bottom:calc(-1 * var(--analysis-tail));mask-image:linear-gradient(to bottom,#000 calc(100% - var(--analysis-tail)),#000b calc(100% - var(--analysis-tail)/2),transparent);-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - var(--analysis-tail)),#000b calc(100% - var(--analysis-tail)/2),transparent)}
@media(max-width:1199px){
 .editorial-page .post-layout{width:100%;max-width:none;grid-template-columns:clamp(14px,3vw,28px) minmax(0,1fr) clamp(14px,3vw,28px);column-gap:0}
 .editorial-page .post-layout>.post-cinematic-hero{grid-column:1/-1;grid-row:1}
 .editorial-page .post-article{grid-column:2;grid-row:2;gap:22px;width:100%;max-width:860px;justify-self:center}
 .editorial-page .post-sidebar{display:grid;grid-column:2;grid-row:3;width:100%;max-width:680px;justify-self:center;position:static;top:auto;min-width:0;align-content:start;gap:18px}
 .editorial-page.section-focused .post-sidebar{display:none}
 .editorial-page .post-sidebar>*{min-width:0;max-width:100%;box-sizing:border-box}
 .editorial-page .post-content-section h2{font-size:clamp(24px,3.8vw,32px);line-height:1.25}
 .editorial-page .post-paragraph,.analysis-introduction{font-size:clamp(15px,1.9vw,17px);line-height:1.8}
}
@media(min-width:1200px){
 .editorial-page .post-layout{grid-template-columns:minmax(12px,1fr) minmax(0,962px) 330px minmax(12px,1fr);column-gap:28px}
 .editorial-page .post-sidebar{display:grid;grid-column:3;grid-row:2;position:relative;top:auto}
 .editorial-page .post-sidebar>.reader-actions{position:absolute;top:var(--reader-actions-top,-60px);left:0;width:100%;min-height:44px}
}
</style>

<style scoped>
.article-section-nav{background:color-mix(in srgb,var(--visual-surface,#11121e) 90%,var(--visual-primary,#8b5cf6));border-color:var(--visual-border,#a855f780)}
.article-section-nav button[aria-selected="true"]{background:var(--visual-label-background,#7024dc);color:var(--visual-label-text,#ffffff)}
.article-section-nav button:focus-visible{outline-color:var(--visual-accent,#a855f7)}
.analysis-page .article-section-nav button[aria-selected="true"]{background:#facc15;color:#241800}
</style>

<style scoped>
/* Use the article's centered column for the cover copy at single-column widths. */
@media(min-width:761px) and (max-width:1199px){
 .editorial-page .post-layout>.post-cinematic-hero :deep(.hero-content){margin-left:max(clamp(14px,3vw,28px),calc((100% - 860px)/2));margin-right:max(clamp(14px,3vw,28px),calc((100% - 860px)/2));max-width:none;width:auto;padding-left:0;padding-right:0}
}
@media(max-width:760px){
 .editorial-page{--mobile-reading-gutter:clamp(20px,6vw,28px)}
 .editorial-page .post-layout{grid-template-columns:max(var(--mobile-reading-gutter),env(safe-area-inset-left,0px)) minmax(0,1fr) max(var(--mobile-reading-gutter),env(safe-area-inset-right,0px))}
 .editorial-page .post-layout>.post-cinematic-hero{min-height:0}
 .editorial-page .post-layout>.post-cinematic-hero :deep(.hero-content){margin-left:max(var(--mobile-reading-gutter),env(safe-area-inset-left,0px));margin-right:max(var(--mobile-reading-gutter),env(safe-area-inset-right,0px));padding:20px 0 24px;min-height:0;max-width:none;width:auto;gap:16px}
 .editorial-page .post-layout>.post-cinematic-hero :deep(.hero-breadcrumb){margin-bottom:72px}
}
</style>

<style scoped src="@/assets/styles/editorial-reading.css"></style>

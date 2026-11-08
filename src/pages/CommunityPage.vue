<script setup>
import GalaxyAtmosphere from '@/components/shared/GalaxyAtmosphere.vue'
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import CommunityPanel from '@/components/community/CommunityPanel.vue'
import FloatingBackButton from '@/components/shared/FloatingBackButton.vue'
import CommunitiesPage from '@/pages/CommunitiesPage.vue'
import { OFFICIAL_COMMUNITY_ID } from '@/constants/community'

defineOptions({
  name: 'CommunityPage'
})

const route = useRoute()
const selectedCommunityId = computed(() => route.query.id || '')
const selectedCommunity = ref(null)
const currentUser = ref(auth.currentUser)
const currentRole = ref('user')
const isCheckingAuth = ref(true)
let unsubscribeAuth = null

const loadRole = async (user) => {
  currentRole.value = 'user'
  if (!user) return

  const snap = await getDoc(doc(db, 'users', user.uid))
  const profile = snap.data() || {}
  currentRole.value = profile.isBlocked ? 'user' : (profile.role || 'user')
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    isCheckingAuth.value = true
    currentUser.value = user
    isCheckingAuth.value = false
    loadRole(user).catch(console.error)
  })
})

onUnmounted(() => {
  unsubscribeAuth?.()
})
</script>

<template>
  <div>
    <Transition name="community-content" appear>
      <main v-if="!isCheckingAuth" class="community-member-page">
    <GalaxyAtmosphere />
        <FloatingBackButton />
        <CommunityPanel :user-role="currentRole" :initial-community-id="selectedCommunityId" :show-rail="false" @community-selected="selectedCommunity = $event" />
        <CommunitiesPage v-if="selectedCommunity?.id === OFFICIAL_COMMUNITY_ID" embedded />
      </main>
    </Transition>
  </div>
</template>

<style scoped>
.community-member-page{position:relative;min-height:100vh;background:radial-gradient(circle at 12% 0%,#7c3aed30,transparent 32%),radial-gradient(circle at 86% 8%,#d946ef20,transparent 28%),linear-gradient(180deg,#070817,#100927 46%,#060814);color:#f8fafc;overflow-x:clip;padding:var(--public-page-top,88px) 18px 56px}
.community-member-page :deep(.community-panel){position:relative;z-index:1;width:100%;max-width:1500px;min-width:0;margin-inline:auto;background:transparent}
.community-member-page :deep(.community-main-column),.community-member-page :deep(.community-feed){min-width:0}
.community-content-enter-active,.community-content-leave-active{transition:opacity .25s ease}.community-content-enter-from,.community-content-leave-to{opacity:0}
@media(max-width:760px){.community-member-page{padding:var(--public-page-top-mobile,76px) 14px 40px}}
@media(prefers-reduced-motion:reduce){.community-content-enter-active,.community-content-leave-active{transition:none}}
</style>

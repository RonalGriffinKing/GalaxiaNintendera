<script setup>
import {ref,watch,onBeforeUnmount} from 'vue'
import {useRoute} from 'vue-router'
import {publicReadingControlsHidden,publicChromeLoading,publicNavigationOverlayOpen} from '@/composables/usePublicChromeLoading'
const storageKey='galaxia-mobile-navigation-hint-last-shown'
const reminderInterval=30*60*1000
const route=useRoute(),visible=ref(false)
let lastShown=0,showTimer,hideTimer
try{lastShown=Number(localStorage.getItem(storageKey))||0}catch{}
function clear(){clearTimeout(showTimer);clearTimeout(hideTimer);visible.value=false}
watch([publicReadingControlsHidden,publicChromeLoading,publicNavigationOverlayOpen,()=>route.fullPath],([hidden,loading,overlay],previous)=>{
 clear()
 if(Date.now()-lastShown<reminderInterval||!hidden||loading||overlay||!window.matchMedia('(max-width:859px)').matches||previous&&previous[3]!==route.fullPath)return
 showTimer=setTimeout(()=>{
  if(!publicReadingControlsHidden.value||publicChromeLoading.value||publicNavigationOverlayOpen.value)return
  lastShown=Date.now();visible.value=true
  try{localStorage.setItem(storageKey,String(lastShown))}catch{}
  hideTimer=setTimeout(()=>{visible.value=false},5000)
 },350)
})
onBeforeUnmount(clear)
</script>
<template><Transition name="navigation-hint"><div v-if="visible && publicReadingControlsHidden && !publicChromeLoading && !publicNavigationOverlayOpen" class="mobile-navigation-hint" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6M12 8v12" /></svg><span>Desliza hacia arriba para volver a ver el menú</span></div></Transition></template>
<style scoped>
.mobile-navigation-hint{position:fixed;z-index:1100;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:flex;align-items:center;gap:10px;width:max-content;max-width:calc(100vw - 40px);padding:12px 16px;box-sizing:border-box;background:#11172df2;border:1px solid #c4b5fd55;border-radius:16px;color:#e8e5f4;box-shadow:0 6px 24px #0004;font-size:13px;font-weight:600;line-height:1.45;pointer-events:none}
.mobile-navigation-hint svg{width:22px;height:22px;flex:0 0 22px;fill:none;stroke:#c4b5fd;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.navigation-hint-enter-active,.navigation-hint-leave-active{transition:opacity .22s ease,transform .22s ease}.navigation-hint-enter-from,.navigation-hint-leave-to{opacity:0;transform:translate(-50%,6px)}
@media(min-width:860px){.mobile-navigation-hint{display:none}}
@media(prefers-reduced-motion:reduce){.navigation-hint-enter-active,.navigation-hint-leave-active{transition:none}}
</style>

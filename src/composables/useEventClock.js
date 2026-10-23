import { onMounted,onUnmounted,ref } from 'vue'
export function useEventClock(){
 const now=ref(Date.now());let timer
 const sync=()=>{if(!document.hidden)now.value=Date.now()}
 onMounted(()=>{sync();timer=setInterval(sync,30000);document.addEventListener('visibilitychange',sync)})
 onUnmounted(()=>{clearInterval(timer);document.removeEventListener('visibilitychange',sync)})
 return now
}

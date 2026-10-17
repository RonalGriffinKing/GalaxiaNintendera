<script setup>
import { onMounted, ref } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import VisualThemeManager from './VisualThemeManager.vue'
const props=defineProps({userRole:String})
const emit=defineEmits(['loading','ready'])
const manager=ref(null),posts=ref([]),usageComplete=ref(false),usageError=ref('')
onMounted(async()=>{
 emit('loading','themes')
 try {
  if(props.userRole!=='admin') return
  const snapshot=await getDocs(collection(db,'posts'))
  posts.value=snapshot.docs.map(item=>({...item.data(),id:item.id}))
  usageComplete.value=true
 } catch {usageError.value='No se pudo comprobar el uso en publicaciones. Puedes editar o archivar temas; su eliminación queda desactivada.'}
 finally {emit('ready','themes')}
})
defineExpose({createTheme:()=>manager.value?.createTheme()})
</script>
<template>
 <div><p v-if="usageError" role="status">{{usageError}}</p><VisualThemeManager ref="manager" :user-role="userRole" :posts="posts" :usage-complete="usageComplete" embedded /></div>
</template>

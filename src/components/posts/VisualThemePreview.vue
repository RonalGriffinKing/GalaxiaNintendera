<script setup>
import { computed } from 'vue'
import SeasonalThemeDecor from './SeasonalThemeDecor.vue'
import { themeDecoration } from '@/services/visualThemes'
import { titleRuns } from '@/services/socialContent'
const props=defineProps({theme:{type:Object,required:true},mode:{type:String,default:'social'}})
const colors=computed(()=>{
 const {social:s,web:w,general:g}=props.theme.config
 return props.mode==='web'?{...s,gradientEnd:g.background,title:g.text,highlight:w.highlight,description:g.muted,labelBackground:w.labelBackground,labelText:w.labelText,cardBackground:g.surface,cardBorder:w.border,numberBackground:w.buttonBackground,numberText:w.buttonText,arrowBackground:w.buttonBackground,arrowIcon:w.buttonText}:s
})
</script>
<template>
  <div class="theme-preview" :style="{'--preview-bg':colors.gradientEnd,'--preview-title':colors.title,'--preview-highlight':colors.highlight,'--preview-description':colors.description}">
    <SeasonalThemeDecor :season="themeDecoration(theme)" />
    <div v-if="mode==='social'" class="theme-preview-progress"><span v-for="n in 5" :key="n" :style="{background:n<3?colors.progressActive:colors.progressInactive}"></span></div>
    <div v-else class="theme-preview-progress"><span :style="{background:colors.highlight}"></span></div>
    <small :style="{background:colors.labelBackground,color:colors.labelText}">NOTICIAS · EJEMPLO</small>
    <h3><span v-for="(run,i) in titleRuns('¡Una aventura llena de secretos!', ['llena de secretos'])" :key="i" :style="run.highlighted?{color:colors.highlight}:{}">{{run.text}}</span></h3>
    <p>{{mode==='web'?'Una lectura con los colores y detalles de tu tema.':'Tu contenido, con una identidad visual propia.'}}</p>
    <ol :style="{background:colors.cardBackground,borderColor:colors.cardBorder}"><li v-for="(text,i) in ['Imágenes y estructura originales','Palabras destacadas del JSON']" :key="text"><b :style="{background:colors.numberBackground,color:colors.numberText}">{{i+1}}</b>{{text}}</li></ol>
    <span class="theme-preview-arrow" :style="{background:colors.arrowBackground,color:colors.arrowIcon}">→</span>
  </div>
</template>
<style scoped>
.theme-preview{background:radial-gradient(ellipse at top right,#ffffff16,transparent 65%),var(--preview-bg);color:var(--preview-title);padding:24px;border-radius:16px;max-width:360px;width:100%;position:relative;box-sizing:border-box;border:1px solid #ffffff22;overflow:hidden}.theme-preview-progress{display:flex;gap:5px;margin-bottom:60px}.theme-preview-progress span{height:5px;flex:1;border-radius:8px}.theme-preview small{display:inline-block;padding:7px 10px;border-radius:20px;font-weight:800;font-size:10px}.theme-preview h3{font-size:27px;line-height:1.12;margin:15px 0}.theme-preview p{color:var(--preview-description);font-size:13px;line-height:1.5}.theme-preview ol{list-style:none;padding:12px;border:1px solid;border-radius:12px;display:grid;gap:10px;color:var(--preview-description);font-size:12px}.theme-preview li{display:flex;align-items:center;gap:8px}.theme-preview b{padding:4px 7px;border-radius:5px}.theme-preview-arrow{display:block;margin-left:auto;width:32px;height:32px;text-align:center;line-height:32px;border-radius:50%}
.theme-preview>:not(.seasonal-decor){position:relative;z-index:3}
</style>

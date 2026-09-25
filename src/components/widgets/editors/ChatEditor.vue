<template>
  <div class="space-y-5">
    <div><label class="app-label">Plataformas</label><div class="option-grid"><button :class="{active:data.platform==='both'||data.platform==='twitch'}" @click="togglePlatform('twitch')"><i class="fab fa-twitch"></i> Twitch</button><button :class="{active:data.platform==='both'||data.platform==='tiktok'}" @click="togglePlatform('tiktok')"><i class="fab fa-tiktok"></i> TikTok</button></div></div>

    <div v-if="data.platform!=='tiktok'"><label class="app-label">Canal de Twitch</label><div class="input-with-icon"><i class="fab fa-twitch"></i><input v-model.trim="data.channel" placeholder="Nombre del canal" /></div></div>
    <div v-if="data.platform!=='twitch'"><label class="app-label">Usuario de TikTok</label><div class="input-with-icon"><i class="fab fa-tiktok"></i><input v-model.trim="data.tiktokUser" placeholder="Usuario sin @" /></div></div>

    <div><label class="app-label">Estilo</label><div class="theme-grid"><button v-for="theme in themes" :key="theme.id" :class="['theme-option',theme.id,{active:data.theme===theme.id}]" @click="applyTheme(theme)"><span></span>{{ theme.label }}</button></div></div>
    <div class="color-grid"><label><span>Fondo</span><input v-model="data.bgColor" type="color" /></label><label><span>Texto</span><input v-model="data.textColor" type="color" /></label><label><span>Borde</span><input v-model="data.borderColor" type="color" /></label></div>

    <div><label class="app-label">Forma</label><div class="option-grid"><button :class="{active:data.rounded}" @click="data.rounded=true">Redondeada</button><button :class="{active:!data.rounded}" @click="data.rounded=false">Compacta</button></div></div>
    <label class="check-row"><input v-model="data.showIcons" type="checkbox" /> Mostrar icono de la plataforma</label>

    <div><label class="app-label">Mensajes visibles</label><div class="stepper"><button @click="data.messageLimit=Math.max(1,data.messageLimit-1)"><i class="fas fa-minus"></i></button><strong>{{ data.messageLimit }}</strong><button @click="data.messageLimit=Math.min(8,data.messageLimit+1)"><i class="fas fa-plus"></i></button></div></div>
    <div><label class="app-label">Ancho</label><input v-model.number="data.width" type="range" min="260" max="900" class="slider" /><p class="section-caption">{{ data.width }} px</p></div>
    <div><label class="app-label">Tamano del texto</label><input v-model.number="data.fontSize" type="range" min="12" max="34" class="slider" /><p class="section-caption">{{ data.fontSize }} px</p></div>
    <div><label class="app-label">Grosor del borde</label><input v-model.number="data.borderWidth" type="range" min="0" max="6" class="slider" /><p class="section-caption">{{ data.borderWidth }} px</p></div>
    <p class="editor-hint">La vista previa usa mensajes de ejemplo. Guarda el overlay para actualizar la fuente de OBS.</p>
  </div>
</template>

<script setup>
const props=defineProps({widget:Object});const data=props.widget.data||(props.widget.data={})
data.channel??='';data.tiktokUser??='';data.bgColor||='#17102f';data.textColor||='#ffffff';data.fontSize=Number(data.fontSize)||18;data.width=Number(data.width)||400;data.rounded=data.rounded!==false;data.borderColor||='#a855f7';data.borderWidth=Number.isFinite(Number(data.borderWidth))?Number(data.borderWidth):1;data.theme||='galaxy';data.platform||='both';data.showIcons=data.showIcons!==false;data.messageLimit=Number(data.messageLimit)||4
const themes=[{id:'galaxy',label:'Galaxia',bg:'#17102f',text:'#ffffff',border:'#a855f7'},{id:'nebula',label:'Nebulosa',bg:'#071a3d',text:'#ecfeff',border:'#22d3ee'},{id:'solar',label:'Solar',bg:'#4c1727',text:'#fff7ed',border:'#fb7185'}]
const applyTheme=theme=>{data.theme=theme.id;data.bgColor=theme.bg;data.textColor=theme.text;data.borderColor=theme.border}
const togglePlatform=target=>{if(data.platform==='both')data.platform=target==='twitch'?'tiktok':'twitch';else if(data.platform===target)data.platform='both';else data.platform='both'}
</script>

<style scoped>
.option-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:7px}.option-grid button,.theme-option{border:1px solid #dbe1ea;border-radius:8px;padding:9px;font-size:11px;font-weight:800;color:#64748b;background:white}.option-grid button.active,.theme-option.active{border-color:#9333ea;color:#7e22ce;box-shadow:0 0 0 2px rgba(147,51,234,.12)}.option-grid i{margin-right:5px}.input-with-icon{height:40px;margin-top:7px;border:1px solid #dbe1ea;border-radius:8px;display:flex;align-items:center;gap:8px;padding:0 11px;background:white;color:#9333ea}.input-with-icon input{min-width:0;width:100%;outline:0;background:transparent;color:#172033;font-size:12px;font-weight:700}.theme-grid{display:grid;gap:7px;margin-top:7px}.theme-option{display:flex;align-items:center;gap:9px;text-align:left}.theme-option span{width:28px;height:18px;border-radius:5px}.theme-option.galaxy span{background:linear-gradient(135deg,#281252,#c026d3)}.theme-option.nebula span{background:linear-gradient(135deg,#071a3d,#22d3ee)}.theme-option.solar span{background:linear-gradient(135deg,#4c1727,#fb7185)}.color-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.color-grid label{display:flex;flex-direction:column;gap:5px;font-size:9px;font-weight:900;color:#64748b}.color-grid input{width:100%;height:34px;border:0}.check-row{display:flex;gap:9px;align-items:center;font-size:12px;font-weight:700;color:#475569}.stepper{display:grid;grid-template-columns:38px 1fr 38px;align-items:center;margin-top:7px;border:1px solid #dbe1ea;border-radius:8px;overflow:hidden}.stepper button{height:36px;color:#7e22ce;background:#f5f3ff}.stepper strong{text-align:center;font-size:13px}.slider{width:100%;margin-top:6px}.editor-hint{font-size:10px;line-height:1.45;color:#94a3b8}
</style>

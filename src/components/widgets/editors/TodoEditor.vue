<template>
  <div class="space-y-5">
    <div>
      <label class="app-label">Vista inicial</label>
      <div class="option-grid"><button :class="{active:!data.minimized}" @click="data.minimized=false">Panel completo</button><button :class="{active:data.minimized}" @click="data.minimized=true">Burbuja</button></div>
    </div>

    <div>
      <div class="editor-title"><label class="app-label">Misiones</label><small>{{ data.tasks.length }}/5</small></div>
      <div class="mission-list">
        <div v-for="(task,index) in data.tasks" :key="task.id || index" class="mission-row">
          <button class="status-button" :class="{done:task.done}" :title="task.done?'Marcar pendiente':'Marcar completada'" @click="task.done=!task.done"><i :class="task.done?'fas fa-check':'far fa-circle'"></i></button>
          <input v-model="task.text" class="mission-input" placeholder="Escribe una mision..." />
          <button class="delete-button" title="Eliminar mision" @click="removeTask(index)"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <button class="add-button" :disabled="data.tasks.length>=5" @click="addTask"><i class="fas fa-plus"></i> Anadir mision</button>
    </div>

    <div><label class="app-label">Estilo</label><div class="theme-grid"><button v-for="theme in themes" :key="theme.id" :class="['theme-option',theme.id,{active:data.theme===theme.id}]" @click="applyTheme(theme)"><span></span>{{ theme.label }}</button></div></div>

    <div class="color-grid"><label><span>Fondo</span><input v-model="data.bgColor" type="color" /></label><label><span>Texto</span><input v-model="data.textColor" type="color" /></label><label><span>Acento</span><input v-model="data.bubbleColor" type="color" /></label></div>

    <div><label class="app-label">Icono de la burbuja</label><div class="icon-grid"><button v-for="icon in icons" :key="icon" :class="{active:data.icon===icon}" @click="data.icon=icon"><i :class="icon"></i></button></div></div>
    <div><label class="app-label">Ancho del panel</label><input v-model.number="data.width" type="range" min="260" max="700" class="slider" /><p class="section-caption">{{ data.width }} px</p></div>
    <div><label class="app-label">Tamano del texto</label><input v-model.number="data.fontSize" type="range" min="12" max="32" class="slider" /><p class="section-caption">{{ data.fontSize }} px</p></div>
    <div><label class="app-label">Tamano de la burbuja</label><input v-model.number="data.bubbleSize" type="range" min="48" max="130" class="slider" /><p class="section-caption">{{ data.bubbleSize }} px</p></div>
    <p class="editor-hint">Los cambios aparecen inmediatamente. Usa Guardar arriba para enviarlos a OBS.</p>
  </div>
</template>

<script setup>
const props=defineProps({widget:Object});const data=props.widget.data||(props.widget.data={})
data.tasks=Array.isArray(data.tasks)?data.tasks.map((task,index)=>({id:task.id||`${Date.now()}-${index}`,text:task.text||'',done:Boolean(task.done)})):[]
if(!data.tasks.length)data.tasks.push({id:Date.now(),text:'Nueva mision',done:false})
data.bgColor||='#17102f';data.textColor||='#ffffff';data.fontSize=Number(data.fontSize)||16;data.bubbleColor||='#a855f7';data.bubbleSize=Number(data.bubbleSize)||70;data.width=Number(data.width)||340;data.icon||='fa-solid fa-star';data.theme||='galaxy';data.minimized=Boolean(data.minimized)
const themes=[{id:'galaxy',label:'Galaxia',bg:'#17102f',text:'#ffffff',accent:'#a855f7'},{id:'nebula',label:'Nebulosa',bg:'#071a3d',text:'#ecfeff',accent:'#22d3ee'},{id:'solar',label:'Solar',bg:'#4c1727',text:'#fff7ed',accent:'#fb7185'}]
const icons=['fa-solid fa-star','fa-solid fa-heart','fa-solid fa-crown','fa-solid fa-fire','fa-solid fa-bolt']
const applyTheme=theme=>{data.theme=theme.id;data.bgColor=theme.bg;data.textColor=theme.text;data.bubbleColor=theme.accent}
const addTask=()=>{if(data.tasks.length<5)data.tasks.push({id:Date.now(),text:'',done:false})};const removeTask=index=>{data.tasks.splice(index,1);if(!data.tasks.length)addTask()}
</script>

<style scoped>
.option-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:7px}.option-grid button,.theme-option{border:1px solid #dbe1ea;border-radius:8px;padding:9px;font-size:11px;font-weight:800;color:#64748b;background:white}.option-grid button.active,.theme-option.active{border-color:#9333ea;color:#7e22ce;box-shadow:0 0 0 2px rgba(147,51,234,.12)}.editor-title{display:flex;justify-content:space-between;align-items:center}.editor-title small{font-size:10px;font-weight:900;color:#9333ea}.mission-list{display:flex;flex-direction:column;gap:8px;margin-top:8px}.mission-row{display:grid;grid-template-columns:32px 1fr 32px;gap:6px;align-items:center}.status-button,.delete-button{width:32px;height:36px;border-radius:8px;border:1px solid #e2e8f0;color:#94a3b8;background:#f8fafc}.status-button.done{color:white;background:#8b5cf6;border-color:#8b5cf6}.delete-button{color:#ef4444}.mission-input{min-width:0;width:100%;height:36px;padding:0 10px;border:1px solid #dbe1ea;border-radius:8px;background:white!important;color:#172033!important;-webkit-text-fill-color:#172033;font-size:11px;font-weight:700}.add-button{width:100%;margin-top:9px;padding:9px;border-radius:8px;color:white;background:linear-gradient(135deg,#7c3aed,#db2777);font-size:11px;font-weight:900}.add-button:disabled{opacity:.4}.theme-grid{display:grid;gap:7px;margin-top:7px}.theme-option{display:flex;align-items:center;gap:9px;text-align:left}.theme-option span{width:28px;height:18px;border-radius:5px}.theme-option.galaxy span{background:linear-gradient(135deg,#281252,#c026d3)}.theme-option.nebula span{background:linear-gradient(135deg,#071a3d,#22d3ee)}.theme-option.solar span{background:linear-gradient(135deg,#4c1727,#fb7185)}.color-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.color-grid label{display:flex;flex-direction:column;gap:5px;font-size:9px;font-weight:900;color:#64748b}.color-grid input{width:100%;height:34px;border:0}.icon-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:7px}.icon-grid button{height:36px;border:1px solid #e2e8f0;border-radius:8px;color:#64748b}.icon-grid button.active{color:white;border-color:#9333ea;background:#9333ea}.slider{width:100%;margin-top:6px}.editor-hint{font-size:10px;line-height:1.45;color:#94a3b8}
</style>

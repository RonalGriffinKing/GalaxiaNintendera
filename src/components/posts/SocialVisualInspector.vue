<script setup>
import { computed } from 'vue'
const props = defineProps({ element:String, scope:String, settings:Object, title:String, description:String, points:Array, fonts:Array, number:Number, image:String, imageUrl:String, overflow:Boolean, notice:String, canUndo:Boolean, canRedo:Boolean, inert:Boolean })
const emit=defineEmits(['select','scope','setting','title','description','points','undo','redo','close','center','fit','download','image-url','upload','original'])
const names={title:'Titulo',description:'Subtitulo',points:'Puntos',image:'Imagen de fondo',overlay:'Color del fondo',logo:'Logo Galaxia',gameLogo:'Logo del juego',author:'Autor',part:'Etiqueta Parte',arrow:'Flecha',button:'Boton',number:'Numeracion'}
const current=computed(()=>props.settings[props.element] || {})
const isText=computed(()=>['title','description','points'].includes(props.element))
const hidden=computed(()=>Object.keys(names).filter(k=>k!=='overlay' && props.settings[k]?.visible===false))
const text=computed(()=>props.element==='title'?props.title:props.element==='points'?(props.points||[]).join('\n'):props.description)
function set(key,value){emit('setting',{path:props.element+'.'+key,value})}
function content(value){emit(props.element,value)}
function restore(key){emit('setting',{path:key+'.visible',value:true});emit('select',key)}
function setNumber(key,event,min,max){const value=Number(event.target.value);if(Number.isFinite(value))set(key,Math.max(min,Math.min(max,value)))}
</script>
<template>
 <aside class="layers-panel" aria-label="Capas de la imagen">
  <header><div><small>Imagen {{ number }}</small><strong>Capas</strong></div></header>
  <small>Selecciona una capa para ver sus herramientas a la derecha.</small>
  <div class="layer-list"><div v-for="(name,key) in names" :key="key" class="layer-row" :class="{selected:element===key, muted:settings[key]?.visible===false}"><button :disabled="inert" @click="emit('select',key)">{{ name }}</button><button v-if="key!=='overlay'" :disabled="inert" class="visibility" :aria-label="(settings[key]?.visible===false?'Mostrar ':'Ocultar ')+name" :title="settings[key]?.visible===false?'Mostrar capa':'Ocultar capa'" @click="settings[key]?.visible===false?restore(key):emit('setting',{path:key+'.visible',value:false})"><span v-if="settings[key]?.visible===false">+</span><span v-else>&#9673;</span></button></div></div>
  <section v-if="hidden.length" class="layer-hidden"><strong>Elementos ocultos</strong><small>Pulsa uno para recuperarlo.</small><div class="chips"><button v-for="key in hidden" :key="key" :disabled="inert" @click="restore(key)">+ {{ names[key] }}</button></div></section>
 </aside>
 <aside class="visual-inspector" aria-label="Herramientas del elemento seleccionado">
  <header><div><small>Imagen {{ number }}</small><strong>{{ names[element] || 'Selecciona un elemento' }}</strong></div><button aria-label="Cerrar editor" @click="emit('close')">&#215;</button></header>
  <small>Toca un elemento de la imagen para editarlo. Puedes arrastrarlo para moverlo.</small>
  <fieldset :disabled="inert">
   <div class="tools"><button :disabled="!canUndo" @click="emit('undo')">Deshacer</button><button :disabled="!canRedo" @click="emit('redo')">Rehacer</button></div>
   <label class="scope">Aplicar apariencia a<select :value="scope" @change="emit('scope',$event.target.value)"><option value="single">Solo esta imagen</option><option value="all">Todo el carrusel</option></select></label>
   <small v-if="scope==='all'">Los ajustes individuales se conservan al cambiar el diseno general.</small>
   <section class="context" :key="element" :aria-label="names[element]">
    <template v-if="isText">
     <label>{{ names[element] }}<textarea :value="text" :rows="element==='points'?6:4" @input="content($event.target.value)" /></label>
     <small v-if="element==='points'">Un punto por linea. Enter agrega otro punto.</small>
     <small>El contenido cambia solo en esta imagen.</small>
     <div class="tools"><label>Tamano<input type="number" min="12" max="150" :value="current.size || 30" @input="setNumber('size',$event,12,150)" /></label><label>Color<input type="color" :value="current.color || settings.description.color" @input="set('color',$event.target.value)" /></label></div>
     <label>Fuente<select :value="current.family || settings.typography.family" @change="set('family',$event.target.value)"><option v-for="font in fonts" :key="font.value" :value="font.value">{{ font.label }}</option></select></label>
     <div class="tools"><button :class="{active:(current.weight||850)>=800}" @click="set('weight',(current.weight||850)>=800?500:900)"><b>Negrita</b></button><button v-for="(name,key) in {left:'Izq.',center:'Centro',right:'Der.'}" :key="key" :class="{active:(current.align||'left')===key}" @click="set('align',key)">{{ name }}</button></div>
     <div class="tools"><label v-if="element==='description'">Lineas visibles<input type="number" min="1" max="30" :value="current.lines" @input="setNumber('lines',$event,1,30)" /></label><label>Interlineado<input type="number" min="0.9" max="2" step="0.05" :value="current.line || 1.2" @input="setNumber('line',$event,.9,2)" /></label></div>
     <label v-if="element==='title'">Lineas visibles (0 = todas)<input type="number" min="0" max="30" :value="current.lines || 0" @input="setNumber('lines',$event,0,30)" /></label>
     <label v-if="element==='title'">Ancho del texto<input type="number" min="180" max="1000" :value="current.width" @input="setNumber('width',$event,180,1000)" /></label>
     <label v-if="element==='points'">Espacio entre puntos<input type="number" min="0" max="60" :value="current.gap ?? 18" @input="setNumber('gap',$event,0,60)" /></label>
     <p v-if="overflow" role="status">Parte del texto no cabe. Ajusta las lineas o el tamano.</p>
     <button @click="emit('fit')">Ajustar textos al espacio</button>
    </template>
    <template v-else-if="element==='image'">
     <img class="image-preview" :src="image" alt="Imagen seleccionada" />
     <label>URL de la imagen<input type="url" :value="imageUrl" placeholder="https://..." @change="emit('image-url',$event)" /></label>
     <label class="file">Subir una imagen temporal<input type="file" accept="image/*" @change="emit('upload',$event)" /></label>
     <small>Solo cambia este diseno; no reemplaza la imagen de la noticia.</small>
     <button @click="emit('original')">Volver a la imagen original</button>
     <div class="tools"><label>Zoom (%)<input type="number" min="100" max="200" :value="current.scale" @input="setNumber('scale',$event,100,200)" /></label><label>Brillo (%)<input type="number" min="20" max="180" :value="current.brightness" @input="setNumber('brightness',$event,20,180)" /></label></div>
     <div class="tools"><label>Horizontal (%)<input type="number" min="0" max="100" :value="current.x" @input="setNumber('x',$event,0,100)" /></label><label>Vertical (%)<input type="number" min="0" max="100" :value="current.y" @input="setNumber('y',$event,0,100)" /></label></div>
     <button @click="emit('select','overlay')">Color y sombreado del fondo</button>
    </template>
    <template v-else-if="element==='overlay'">
     <label>Color del fondo<input type="color" :value="current.color" @input="set('color',$event.target.value)" /></label>
     <label>Intensidad<input type="number" min="0" max="1" step="0.05" :value="current.intensity" @input="setNumber('intensity',$event,0,1)" /></label>
     <label class="check"><input type="checkbox" :checked="current.gradient" @change="set('gradient',$event.target.checked)" /> Degradado</label>
     <button @click="emit('select','image')">Editar imagen de fondo</button>
    </template>
    <template v-else>
     <label v-if="['part','button'].includes(element)">Texto<input :value="current.text" @input="set('text',$event.target.value)" /></label>
     <label v-if="element==='gameLogo'">URL del logo<input type="url" :value="current.url" @change="set('url',$event.target.value)" /></label>
     <template v-if="element==='author'"><label v-for="(name,key) in {avatar:'Mostrar avatar',name:'Mostrar nombre',date:'Mostrar fecha'}" :key="key" class="check"><input type="checkbox" :checked="current[key]" @change="set(key,$event.target.checked)" />{{ name }}</label></template>
     <label v-if="element==='arrow'">Icono<select :value="current.icon" @change="set('icon',$event.target.value)"><option value="fa-arrow-right">Flecha</option><option value="fa-chevron-right">Indicador</option><option value="fa-plus">Mas</option></select></label>
     <label>Tamano<input type="number" min="16" max="760" :value="current.size || 100" @input="setNumber('size',$event,16,760)" /></label>
     <label v-if="current.color">Color<input type="color" :value="current.color" @input="set('color',$event.target.value)" /></label>
    </template>
    <button v-if="!['image','overlay'].includes(element)" @click="emit('center')">Centrar horizontalmente</button>
    <button v-if="element!=='overlay'" class="hide" @click="set('visible',false)">Ocultar {{ names[element]?.toLowerCase() }}</button>
    <small v-if="notice" role="status">{{ notice }}</small>
   </section>
   <details class="elements"><summary>Elementos de la imagen</summary><div class="chips"><button v-for="(name,key) in names" :key="key" :class="{active:element===key}" @click="emit('select',key)">{{ name }}</button></div></details>
   <section v-if="hidden.length" class="hidden"><strong>Elementos ocultos</strong><small>Pulsa uno para volver a mostrarlo.</small><div class="chips"><button v-for="key in hidden" :key="key" @click="restore(key)">+ {{ names[key] }}</button></div></section>
   <button class="download" @click="emit('download')">Descargar carrusel ZIP</button>
  </fieldset>
 </aside>
</template>
<style scoped>
.layers-panel{display:none}
.layer-list{display:grid;gap:6px}.layer-row{display:flex;border:1px solid #ffffff15;border-radius:9px;overflow:hidden}.layer-row.selected{border-color:#a855f7;background:#7c3aed28}.layer-row button{border:0;border-radius:0;background:transparent;text-align:left}.layer-row .visibility{flex:0 0 36px;text-align:center;padding:7px}.layer-row.muted>button:first-child{color:#929db4}.layer-hidden{display:grid;gap:10px;padding-top:14px;border-top:1px solid #ffffff20}.layer-hidden strong{font-size:13px}
@media(min-width:1100px){.layers-panel{display:flex;flex-direction:column;gap:14px;position:fixed;left:0;top:var(--public-nav-offset,72px);bottom:0;width:240px;background:#0b1020;color:#fff;padding:18px;box-sizing:border-box;overflow:auto;border-right:1px solid #ffffff20;z-index:5000;font-family:Inter,Arial,sans-serif}.visual-inspector{width:340px!important;top:var(--public-nav-offset,72px)!important}.visual-inspector .elements,.visual-inspector .hidden{display:none}}

.visual-inspector{position:fixed;right:0;top:0;bottom:0;width:320px;padding:18px;box-sizing:border-box;background:#0b1020;color:#fff;border-left:1px solid #ffffff20;z-index:5000;overflow-y:auto;display:flex;flex-direction:column;gap:14px;font-family:Inter,Arial,sans-serif}
header{display:flex;justify-content:space-between;align-items:center}header div{display:grid;gap:6px}header strong{font-size:18px}header button{width:42px;font-size:22px}
fieldset,.context,label,.hidden{display:grid;gap:12px;min-width:0}fieldset{border:0;padding:0;margin:0}.context{padding-top:4px}.tools{display:flex;gap:8px;align-items:end}.tools>*{flex:1;min-width:0}
button,input,select,textarea{box-sizing:border-box;font:inherit}button,select,textarea,input:not([type=checkbox]){background:#ffffff09;border:1px solid #ffffff25;color:#fff;border-radius:8px;padding:9px;min-height:40px;width:100%}button{cursor:pointer;font-size:12px}button.active,.download{background:#7c3aed}button:disabled{opacity:.4;cursor:default}label{font-size:12px;font-weight:700;gap:7px}textarea{resize:vertical;line-height:1.45;min-height:90px}small,p{font-size:11px;line-height:1.5;color:#bdc5d8;margin:0}p{color:#fde68a}.check{display:flex;align-items:center}.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.chips button{width:auto;min-height:34px}.image-preview{width:100%;height:120px;object-fit:cover;border-radius:8px}.hide{color:#cbd5e1}.hidden{border-top:1px solid #ffffff20;padding-top:12px}.hidden strong,summary{font-size:12px}summary{cursor:pointer}.file input{font-size:11px}select option{background:#0b1020}input:focus-visible,button:focus-visible,textarea:focus-visible{outline:2px solid #c084fc;outline-offset:2px}
@media(max-width:800px){.visual-inspector{top:auto;left:0;width:100%;height:min(380px,48dvh);border-left:0;border-top:1px solid #ffffff20;padding-bottom:max(18px,env(safe-area-inset-bottom))}}
</style>

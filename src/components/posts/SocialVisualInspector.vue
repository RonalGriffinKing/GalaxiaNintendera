<script setup>
import { computed, ref } from 'vue'
import SocialPaintControls from './SocialPaintControls.vue'
import { SOCIAL_POINT_MARKERS } from '@/services/socialPointMarkers'
import { constrainImagePan } from '@/services/socialImageDrag'
const templateName = ref('')
const layerSearch = ref('')
const inspectorTab = computed(() => props.panel === 'templates' ? 'templates' : 'edit')
const layerGroup = ref('all')
const groups = [
 { id:'all', label:'Capas', icon:'fa-layer-group' },
 { id:'text', label:'Texto', icon:'fa-font' },
 { id:'background', label:'Fondos', icon:'fa-image' },
 { id:'brand', label:'Marca', icon:'fa-icons' }
]
const props = defineProps({ panel:String, imagePanLimits:Object, hasScore:Boolean, templates:Array, templateNotice:String, element:String, cta:String, slideType:String, slideAccent:String, scope:String, settings:Object, title:String, titleHighlights:Array, description:String, points:Array, fonts:Array, number:Number, image:String, imageUrl:String, overflow:Boolean, notice:String, canUndo:Boolean, canRedo:Boolean, inert:Boolean })
const emit=defineEmits(['save-template','load-template','reset','select','scope','preview-setting','setting','cta','title','title-highlights','description','points','undo','redo','close-panel','center','fit','download','image-url','upload','original'])
const names=computed(()=>({...(props.slideType==='closing'?{cta:'Invitacion a comentar'}:{}),...(props.hasScore?{score:'Nota del análisis'}:{}),brand:'Marca superior',progress:'Progreso del carrusel',title:'Titulo',description:'Subtitulo',points:'Puntos',image:'Imagen de fondo',overlay:'Color del fondo',logo:'Logo Galaxia',gameLogo:'Logo del juego',author:'Autor',part:'Etiqueta Parte',arrow:'Flecha',button:'Boton',number:'Numeracion'}))
const current=computed(()=>props.settings[props.element] || {})
const groupKeys={text:['title','description','points','cta'],background:['image','overlay'],brand:['brand','progress','logo','gameLogo','author','part','arrow','button','number','score']}
const filteredLayers=computed(()=>Object.fromEntries(Object.entries(names.value).filter(([key,name])=>(!groupKeys[layerGroup.value]||groupKeys[layerGroup.value].includes(key))&&name.toLocaleLowerCase().includes(layerSearch.value.trim().toLocaleLowerCase()))))
const isText=computed(()=>['title','description','points'].includes(props.element))
const text=computed(()=>props.element==='title'?props.title:props.element==='points'?(props.points||[]).join('\n'):props.description)
function set(key,value){emit('setting',{path:props.element+'.'+key,value})}
function preview(key,value){emit('preview-setting',{path:props.element+'.'+key,value})}
function content(value){emit(props.element,value)}
function restore(key){emit('setting',{path:key+'.visible',value:true})}
function setNumber(key,event,min,max){const value=Number(event.target.value);if(Number.isFinite(value))set(key,Math.max(min,Math.min(max,value)))}
const imageOffset=computed(()=>({x:constrainImagePan(props.settings.image?.panX,props.imagePanLimits||{min:0,max:0}),y:0}))
const rounded=value=>Math.round((Number(value)||0)*10)/10
function setImageOffset(event){const value=Number(event.target.value);if(Number.isFinite(value))emit('setting',{path:'image.panX',value:constrainImagePan(rounded(value),props.imagePanLimits||{min:0,max:0})})}
</script>
<template>
 <aside v-if="panel==='layers'" id="studio-side-panel" class="layers-panel" aria-label="Capas de la imagen">
  <header><div><small>Imagen {{ number }}</small><strong>Capas</strong></div><button aria-label="Cerrar capas" @click="emit('close-panel')">&#215;</button></header>
  <input v-model="layerSearch" type="search" aria-label="Buscar capa" placeholder="Buscar una capa…" />
  <div class="layer-filters" role="group" aria-label="Filtrar capas"><button v-for="group in groups" :key="group.id" :aria-pressed="layerGroup===group.id" @click="layerGroup=group.id">{{ group.id==='all'?'Todas':group.label }}</button></div>
  <div class="layer-list"><div v-for="(name,key) in filteredLayers" :key="key" class="layer-row" :class="{selected:element===key, muted:settings[key]?.visible===false}"><button :disabled="inert" :aria-pressed="element===key" @click="emit('select',key)"><i :class="['fas',key==='image'?'fa-image':['title','description','points','cta'].includes(key)?'fa-font':'fa-shapes']" aria-hidden="true"></i> {{ name }}</button><button v-if="key!=='overlay'" :disabled="inert" class="visibility" :aria-label="(settings[key]?.visible===false?'Mostrar ':'Ocultar ')+name" :title="settings[key]?.visible===false?'Mostrar capa':'Ocultar capa'" @click="settings[key]?.visible===false?restore(key):emit('setting',{path:key+'.visible',value:false})"><i :class="['fas',settings[key]?.visible===false?'fa-eye-slash':'fa-eye']" aria-hidden="true"></i></button></div></div>
  <small v-if="!Object.keys(filteredLayers).length">No hay capas que coincidan con tu búsqueda.</small>
 </aside>
 <aside v-else id="studio-side-panel" class="visual-inspector" aria-label="Herramientas del elemento seleccionado">
  <header><div><small>Imagen {{ number }}</small><strong>{{ inspectorTab==='templates'?'Plantillas':names[element] || 'Selecciona un elemento' }}</strong></div><button aria-label="Cerrar herramientas" @click="emit('close-panel')">&#215;</button></header>
  <fieldset :disabled="inert">
   <label v-if="inspectorTab==='edit'" class="scope-select"><span>Aplicar estilo a</span><select :value="scope" @change="emit('scope',$event.target.value)"><option value="single">Esta imagen</option><option value="all">Todo el carrusel</option></select></label>
   <small v-if="inspectorTab==='edit' && scope==='all'">Se conservan los ajustes individuales de cada imagen.</small>
   <section v-show="inspectorTab==='edit'" class="context" :key="element" :aria-label="names[element]">
    <template v-if="isText">
     <label>{{ names[element] }}<textarea :value="text" :rows="element==='points'?6:4" @input="content($event.target.value)" /></label>
     <details v-if="element==='title'" class="inspector-advanced"><summary>Palabras destacadas</summary><div>
      <label>Frases destacadas<textarea :value="(titleHighlights || []).join('\n')" rows="2" placeholder="Una frase exacta del titulo por linea" @input="emit('title-highlights',$event.target.value)" /></label>
      <small v-if="(titleHighlights || []).some(phrase => !title.includes(phrase))" role="status">Alguna frase no coincide con el titulo. Copiala exactamente para destacarla.</small>
      <label>Color del destacado<input type="color" :value="current.highlightColor || '#facc15'" @input="preview('highlightColor',$event.target.value)" @change="set('highlightColor',$event.target.value)" /></label>
     </div></details>
     <small v-if="element==='points'">Un punto por linea. Enter agrega otro punto.</small>
     <label v-if="element==='points'">Marcadores de la lista<select :value="current.marker || (slideType==='closing' ? 'stars' : 'numbers')" @change="set('marker',$event.target.value)"><option v-for="option in SOCIAL_POINT_MARKERS" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
     <small>El texto cambia solo en esta imagen.</small>
     <div class="tools"><label>Tamano<input type="number" min="12" max="150" :value="current.size || 30" @input="setNumber('size',$event,12,150)" /></label><label>Color<input type="color" :value="current.color || settings.description.color" @input="preview('color',$event.target.value)" @change="set('color',$event.target.value)" /></label></div>
     <label>Fuente<select :value="current.family || settings.typography.family" @change="set('family',$event.target.value)"><option v-for="font in fonts" :key="font.value" :value="font.value">{{ font.label }}</option></select></label>
     <div class="tools"><button :class="{active:(current.weight||850)>=800}" @click="set('weight',(current.weight||850)>=800?500:900)"><b>Negrita</b></button><button v-for="(name,key) in {left:'Izq.',center:'Centro',right:'Der.'}" :key="key" :class="{active:(current.align||'left')===key}" @click="set('align',key)">{{ name }}</button></div>
     <details class="inspector-advanced"><summary>Composición y espaciado</summary><div>
     <div class="tools"><label v-if="element==='description'">Lineas visibles<input type="number" min="1" max="30" :value="current.lines" @input="setNumber('lines',$event,1,30)" /></label><label>Interlineado<input type="number" min="0.9" max="2" step="0.05" :value="current.line || 1.2" @input="setNumber('line',$event,.9,2)" /></label></div>
     <label v-if="element==='title'">Lineas visibles (0 = todas)<input type="number" min="0" max="30" :value="current.lines || 0" @input="setNumber('lines',$event,0,30)" /></label>
     <label>Ancho de la caja de texto (px)<input type="number" min="180" max="1000" :value="current.width || 916" @input="setNumber('width',$event,180,1000)" /></label><small>Arrastra los tiradores laterales para cambiar el ancho sin cambiar la letra.</small>
     <label v-if="element==='points'">Espacio entre puntos<input type="number" min="0" max="60" :value="current.gap ?? 18" @input="setNumber('gap',$event,0,60)" /></label>
     </div></details>
     <p v-if="overflow" role="status">Parte del texto no cabe. Ajusta las lineas o el tamano.</p>
     <button v-if="overflow" @click="emit('fit')">Ajustar textos al espacio</button>
    </template>
    <template v-else-if="element==='image'">
     <label class="check"><input type="checkbox" :checked="current.visible!==false" @change="set('visible',$event.target.checked)" /> Mostrar foto de fondo</label>
     <small v-if="current.visible===false">Estás usando el fondo temático del post.</small>
     <small v-else>Arrastra la foto en el lienzo para cambiar el encuadre.</small>
     <details class="inspector-advanced"><summary>Cambiar imagen</summary><div>
     <label>URL de la imagen<input type="url" :value="imageUrl" placeholder="https://..." @change="emit('image-url',$event)" /></label>
     <label class="file">Subir una imagen temporal<input type="file" accept="image/*" @change="emit('upload',$event)" /></label>
     <small>Solo cambia este diseno; no reemplaza la imagen de la noticia.</small>
     <button @click="emit('original')">Volver a la imagen original</button>
     </div></details>
     <details class="inspector-advanced"><summary>Encuadre y brillo</summary><div>
     <div class="tools"><label>Zoom (%)<input type="number" min="100" max="200" :value="current.scale" @input="setNumber('scale',$event,100,200)" /></label><label>Brillo (%)<input type="number" min="20" max="180" :value="current.brightness" @input="setNumber('brightness',$event,20,180)" /></label></div>
     <small>Arrastra la foto a izquierda o derecha para elegir el recorte. El fondo siempre queda cubierto. Si no hay margen, aumenta el zoom.</small>
     <label>Horizontal (%)<input type="number" :min="imagePanLimits?.min||0" :max="imagePanLimits?.max||0" step="0.1" :value="rounded(imageOffset.x)" @input="setImageOffset($event)" /></label>
     <button @click="emit('setting',{path:'image.panX',value:0})">Restablecer posición del fondo</button>
     <details><summary>Punto de recorte original</summary><label>Recorte horizontal (%)<input type="number" min="0" max="100" step="0.1" :value="rounded(current.x)" @input="setNumber('x',$event,0,100)" /></label></details>
     </div></details>
     <button @click="emit('select','overlay')">Color y sombreado del fondo</button>
    </template>
    <template v-else-if="element==='overlay'">
     <SocialPaintControls :value="current" @preview="preview($event.key,$event.value)" @change="set($event.key,$event.value)" />
     <label>Intensidad del color · {{ Math.round((current.intensity || 0)*100) }} %<input type="range" min="0" max="1" step="0.01" :value="current.intensity" @input="setNumber('intensity',$event,0,1)" /></label>
     <label>Oscurecer toda la imagen · {{ Math.round((current.darkness || 0)*100) }} %<input aria-label="Oscurecer toda la imagen" type="range" min="0" max="1" step="0.01" :value="current.darkness || 0" @input="setNumber('darkness',$event,0,1)" /></label>

     <button @click="emit('select','image')">Editar imagen de fondo</button>
    </template>
    <template v-else>
     <label v-if="element==='cta'">Invitacion a comentar<textarea :value="cta" rows="2" @input="emit('cta',$event.target.value)" /></label>
     <label v-if="['part','button'].includes(element)">Texto<input :value="current.text" @input="set('text',$event.target.value)" /></label>
     <label v-if="element==='gameLogo'">URL del logo<input type="url" :value="current.url" @change="set('url',$event.target.value)" /></label>
     <template v-if="element==='author'"><label v-for="(name,key) in {avatar:'Mostrar avatar',name:'Mostrar nombre',date:'Mostrar fecha'}" :key="key" class="check"><input type="checkbox" :checked="current[key]" @change="set(key,$event.target.checked)" />{{ name }}</label></template>
     <label v-if="element==='arrow'">Icono<select :value="current.icon" @change="set('icon',$event.target.value)"><option value="fa-arrow-right">Flecha</option><option value="fa-chevron-right">Indicador</option><option value="fa-plus">Mas</option></select></label>
     <label v-if="element!=='progress'">{{ element==='score' ? 'Tamaño de la nota (%)' : 'Tamaño' }}<input type="number" min="16" max="760" :value="current.size || 100" @input="setNumber('size',$event,16,760)" /></label>
     <template v-if="['part','arrow','button','progress'].includes(element)">
      <label v-if="['arrow','button','part'].includes(element)">{{ element==='arrow' ? 'Color de la flecha interior' : 'Color del texto' }}<input type="color" :value="current.foregroundColor || (element==='part' && slideAccent==='gold' ? '#18120a' : '#ffffff')" @input="preview('foregroundColor',$event.target.value)" @change="set('foregroundColor',$event.target.value)" /></label>
      <strong class="paint-heading">{{ element==='progress' ? 'Color de la barra' : 'Fondo del botón' }}</strong>
      <SocialPaintControls :value="current" @preview="preview($event.key,$event.value)" @change="set($event.key,$event.value)" />
     </template>
     <label v-else-if="current.color">Color<input type="color" :value="current.color" @input="preview('color',$event.target.value)" @change="set('color',$event.target.value)" /></label>
    </template>
    <details class="inspector-advanced"><summary>Más acciones</summary><div>
    <button v-if="isText && !overflow" @click="emit('fit')">Ajustar textos al espacio</button>
    <button @click="emit('reset')">Restablecer este elemento</button>
    <button v-if="!['image','overlay'].includes(element)" @click="emit('center')">Centrar horizontalmente</button>
    <button v-if="!['image','overlay'].includes(element)" class="hide" @click="set('visible',current.visible===false)">{{ current.visible===false?'Mostrar':'Ocultar' }} {{ names[element]?.toLowerCase() }}</button>
    </div></details>
    <small v-if="notice" role="status">{{ notice }}</small>
   </section>
   <section v-show="inspectorTab==='templates'" class="template-library"><strong>Mis plantillas</strong><small>Guardan colores, posiciones y ajustes. No incluyen los textos ni las fotos de la noticia.</small><label>Nombre<input v-model="templateName" maxlength="80" placeholder="Mi plantilla" /></label><button :disabled="!templateName.trim()" @click="emit('save-template',templateName); templateName=''">Guardar plantilla nueva</button><label>Cargar plantilla<select value="" @change="emit('load-template',$event.target.value); $event.target.value='' "><option value="" disabled>Elegir plantilla...</option><option v-for="item in templates" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><small v-if="templateNotice" role="status">{{ templateNotice }}</small></section>
  </fieldset>
 </aside>
</template>
<style scoped src="./socialInspector.css"></style>

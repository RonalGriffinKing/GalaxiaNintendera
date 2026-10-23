<script setup>
import {computed} from 'vue'
import {INVITATION_LAYERS,layerVisible} from '@/services/invitationLayers'
const props=defineProps({options:{type:Object,required:true},selected:String})
const emit=defineEmits(['select','update'])
const visibleCount=computed(()=>INVITATION_LAYERS.filter(layer=>layerVisible(props.options,layer)).length)
function toggle(layer){emit('update',{[layer.flag]:!layerVisible(props.options,layer)})}
</script>
<template>
<div class="inv-layer-list"><p>{{ visibleCount }} visibles · {{ INVITATION_LAYERS.length-visibleCount }} apagadas</p><div v-for="layer in INVITATION_LAYERS" :key="layer.id" class="inv-layer-row" :class="{'is-off':!layerVisible(options,layer)}" :data-layer="layer.id">
<button type="button" class="inv-layer-name" @click="emit('select',layer.id)"><span>{{ layer.label }}</span><small>{{ layer.asset&&!options[layer.asset]?'Sin imagen':layerVisible(options,layer)?'Visible':'Apagada' }}</small></button>
<button type="button" class="inv-layer-eye" :disabled="!!layer.asset&&!options[layer.asset]" :aria-label="(layerVisible(options,layer)?'Ocultar ':'Mostrar ')+layer.label" :aria-pressed="layerVisible(options,layer)" @click="toggle(layer)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path v-if="!layerVisible(options,layer)" d="m3 3 18 18"/></svg></button>
</div><div v-if="options.tiktok" class="inv-layer-fixed"><strong>Referencia de TikTok · fija</strong><span>Guía de registro, flecha y luces. La tarjeta real se añade en TikTok.</span></div></div>
</template>
<style scoped>
.inv-layer-list{display:grid;gap:5px}.inv-layer-list>p{font-size:11px;color:#aeb8d2;margin:0 0 6px}.inv-layer-row{display:flex;align-items:center;gap:6px;min-width:0;background:#141a2c;border:1px solid #a78bfa22;border-radius:9px;padding:4px 5px 4px 9px}.inv-layer-name{flex:1;min-width:0;text-align:left;border:0;background:none;color:#ede9fe;cursor:pointer;padding:3px 0;font-size:11px;line-height:1.4}.inv-layer-name span{display:block}.inv-layer-name small{display:block;color:#6ee7b7;font-size:9px}.inv-layer-row.is-off{background:#0b1020;border-style:dashed}.is-off .inv-layer-name{color:#9aa8c0}.is-off .inv-layer-name small{color:#8491a9}.inv-layer-eye{flex-shrink:0;width:30px;height:30px;border:0;border-radius:7px;background:#a78bfa18;color:#c4b5fd;display:grid;place-items:center;cursor:pointer}.inv-layer-eye svg{width:17px;height:17px}.inv-layer-eye:disabled{opacity:.35;cursor:default}.inv-layer-fixed{display:grid;gap:5px;margin-top:8px;padding:9px;border-radius:9px;border:1px solid #f472b633;font-size:10px;color:#cbd5e1}.inv-layer-fixed span{color:#94a3b8;line-height:1.5}.inv-layer-list button:focus-visible{outline:2px solid #67e8f9;outline-offset:2px}
</style>

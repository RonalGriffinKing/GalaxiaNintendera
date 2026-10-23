import {describe,it,expect} from 'vitest'
import {tiktokPreset,INVITATION_LAYERS,layerVisible} from './invitationLayers'
import {invitationDefaults} from './eventInvitation'
describe('TikTok minimal layers',()=>{
 it('keeps only background, live badge, title and channel visible by default',()=>{const options={...invitationDefaults(),...tiktokPreset(invitationDefaults(),true)};expect(INVITATION_LAYERS.filter(l=>layerVisible(options,l)).map(l=>l.id)).toEqual(['image','status','title','brand']);expect(options.status).toBe('live')})
 it('preserves content and restores normal visibility and badge on exit',()=>{const original=invitationDefaults({title:'Mi directo',description:'Una aventura'});const tik={...original,...tiktokPreset(original,true)};const restored={...tik,...tiktokPreset(tik,false)};for(const layer of INVITATION_LAYERS)expect(restored[layer.flag]).toBe(original[layer.flag]);expect(restored.title).toBe(original.title);expect(restored.description).toBe(original.description);expect(restored.status).toBe('upcoming')})
 it('retains the original state when the preset is activated again',()=>{const first={...invitationDefaults(),...tiktokPreset(invitationDefaults(),true)};expect(tiktokPreset(first,true).tiktokPrevious).toEqual(first.tiktokPrevious)})
 it('only lists a game logo as visible if an image is assigned',()=>{const layer=INVITATION_LAYERS.find(l=>l.id==='logo');expect(layerVisible({showLogo:true,logo:''},layer)).toBe(false);expect(layerVisible({showLogo:true,logo:'/logo.png'},layer)).toBe(true)})
})

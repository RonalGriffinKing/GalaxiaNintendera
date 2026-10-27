import { expect, it } from 'vitest'
import { eventGameNames, eventImageSelection } from './eventGame'
import { eventCreatePayload, parseEventJson } from './eventJson'
it('assigns the selected image and supplies missing game names without changing existing names',()=>{
 const selected={url:'https://images.igdb.com/image.jpg',gameName:'The Smurfs: Dreams'}
 const patch=eventImageSelection({game:{nameEs:'Los Pitufos: Dreams'}},selected)
 expect(patch).toEqual({backgroundUrl:selected.url,game:{nameEs:'Los Pitufos: Dreams',nameEn:selected.gameName}})
 const imported=parseEventJson(JSON.stringify({title:'Directo',startsAt:'2026-10-27T18:00',...patch}))
 const saved=eventCreatePayload(imported,[],'owner')
 expect(saved.backgroundUrl).toBe(selected.url);expect(eventGameNames(saved)).toEqual(patch.game)
 expect(eventImageSelection({},selected).game).toEqual({nameEs:selected.gameName,nameEn:selected.gameName})
})
it('rejects unsafe or absent image URLs without altering the event',()=>{
 const event={game:{nameEn:'Original'}}
 for(const url of [undefined,'javascript:alert(1)','//example.com/a.jpg'])expect(()=>eventImageSelection(event,{url})).toThrow()
 expect(event.game.nameEn).toBe('Original')
})

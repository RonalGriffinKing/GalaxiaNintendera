import {describe,it,expect} from 'vitest'
import {cleanGamertag,validXuid,findExactXboxPlayer,xboxProfilePerson,normalizeXboxIdentity} from './xboxIdentity'
const person={xuid:'2533274792093122',gamertag:'Player',uniqueModernGamertag:'Player#1234',gamerScore:'123',displayPicRaw:'https://example.com/avatar.png',realName:'Private name'}
const history={content:{xuid:person.xuid,titles:[{titleId:'1',name:'Game',type:'Game',displayImage:'https://example.com/game.png',titleHistory:{visible:true,lastTimePlayed:'2026-10-18T10:00:00Z'}},{titleId:'2',name:'Hidden',type:'Game',titleHistory:{visible:false,lastTimePlayed:'2026-10-18T11:00:00Z'}},{titleId:'3',name:'App',type:'App',titleHistory:{lastTimePlayed:'2026-10-18T11:00:00Z'}}]}}
describe('Xbox public identity',()=>{
 it('validates gamertags and keeps XUIDs as strings',()=>{expect(cleanGamertag(' Player#1234 ')).toBe('Player#1234');expect(validXuid(person.xuid)).toBe(true);expect(validXuid(Number(person.xuid))).toBe(false);for(const value of ['https://evil.test','../name','bad?token=x','a'.repeat(33)])expect(()=>cleanGamertag(value)).toThrow()})
 it('requires one exact match, never the first fuzzy suggestion',()=>{expect(findExactXboxPlayer({content:{people:[person]}},'player#1234')).toEqual(person);expect(findExactXboxPlayer({people:[person]},'Play')).toBeNull();expect(findExactXboxPlayer({people:[person,{...person,xuid:'2533274792093123'}]},'Player')).toBeNull()})
 it('supports account settings without leaking real names',()=>{const parsed=xboxProfilePerson({content:{profileUsers:[{id:person.xuid,settings:[{id:'Gamertag',value:'Player'},{id:'Gamerscore',value:'0'}]}]}},person.xuid);expect(parsed.gamertag).toBe('Player');expect(parsed.gamerScore).toBe('0')})
 it('uses real presence and public history without inventing playtime',()=>{const value=normalizeXboxIdentity(person,{content:{xuid:person.xuid,state:'Online',devices:[{titles:[{id:'1',name:'Game',state:'Active'}]}]}},history);expect(value.presence.currentGame.title).toBe('Game');expect(value.presence.updatedAt).toBeNull();expect(value.history).toHaveLength(1);expect(value.history[0].game.title).toBe('Game');expect(value.playtime).toBeNull();expect(value.library).toBeNull();expect(value.achievements).toBeNull();expect(value.realName).toBeUndefined();expect(value.gamerscore).toBe(123)})
 it('does not call an offline or ambiguous title current',()=>{expect(normalizeXboxIdentity(person,{state:'Offline'},history).presence.currentGame).toBeNull();expect(normalizeXboxIdentity(person,{state:'Online',devices:[{titles:[{id:'1',name:'A',state:'Active'},{id:'2',name:'B',state:'Active'}]}]},null).presence.currentGame).toBeNull();expect(normalizeXboxIdentity(person,null,null).presence.state).toBe('unknown')})
 it('rejects responses for another account',()=>{expect(()=>normalizeXboxIdentity(person,{xuid:'2533274792093123'},null)).toThrow();expect(()=>normalizeXboxIdentity(person,null,{xuid:'2533274792093123'})).toThrow()})
 it('upgrades legacy Microsoft covers in history, highlights and current presence',()=>{
  const source=structuredClone(history);source.content.titles[0].displayImage='http://store-images.s-microsoft.com/image/apps.cover'
  const value=normalizeXboxIdentity(person,{state:'Online',devices:[{titles:[{id:'1',name:'Game',state:'Active'}]}]},source)
  for(const game of [value.history[0].game,value.featuredGames[0],value.presence.currentGame])expect(game.imageUrl).toBe('https://store-images.s-microsoft.com/image/apps.cover')
 })
 it('does not upgrade arbitrary HTTP hosts or credential-bearing URLs',()=>{
  for(const url of ['http://example.com/cover','http://store-images.s-microsoft.com.evil.test/image','http://user:pass@store-images.s-microsoft.com/image','http://store-images.s-microsoft.com:8080/image','javascript:alert(1)']){
   const source=structuredClone(history);source.content.titles[0].displayImage=url
   expect(normalizeXboxIdentity(person,null,source).history[0].game.imageUrl).toBe('')
  }
 })

 it('keeps per-game achievement summaries without inventing totals or individual awards',()=>{
  const source=structuredClone(history);source.content.titles[0].achievement={currentAchievements:6,totalAchievements:0,currentGamerscore:270,totalGamerscore:1000,progressPercentage:27}
  let value=normalizeXboxIdentity(person,null,source)
  expect(value.gameAchievements[0]).toMatchObject({unlocked:6,total:null,remaining:null,gamerscore:270,totalGamerscore:1000,remainingGamerscore:730,progress:27})
  expect(value.achievements).toBeNull();expect(value.playtime).toBeNull()
  source.content.titles[0].achievement={currentAchievements:6,totalAchievements:10,currentGamerscore:270,totalGamerscore:100,progressPercentage:101}
  value=normalizeXboxIdentity(person,null,source)
  expect(value.gameAchievements[0]).toMatchObject({remaining:4,totalGamerscore:null,remainingGamerscore:null,progress:null})
  source.content.titles[0].achievement={currentAchievements:-1,currentGamerscore:'270',progressPercentage:null}
  expect(normalizeXboxIdentity(person,null,source).gameAchievements).toEqual([])
 })

})

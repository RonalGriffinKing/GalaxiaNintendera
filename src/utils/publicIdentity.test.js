import {describe,it,expect} from 'vitest'
import {publicName,publicText} from './publicIdentity'

describe('public identity presentation',()=>{
 it.each([undefined,null,'',' ','\t\n'])('uses a neutral label for an absent/blank name (%j)',name=>{
  expect(publicName(name)).toBe('Usuario de Galaxia')
 })
 it.each(['Persona ficticia','  Nombre válido  ','@usuario_publico','Nombre con ñ'])('preserves valid public names exactly (%s)',name=>{
  expect(publicName(name,'secondary')).toBe(name)
 })
 it.each(['private-sentinel@example.invalid','private-sentinel@localhost','PRIVATE-SENTINEL@EXAMPLE.INVALID','Nombre private-sentinel@example.invalid'])('rejects a historical email-shaped name/handle (%s)',email=>{
  expect(publicName(email)).toBe('Usuario de Galaxia');expect(publicText(email)).toBe('')
 })
 it('uses only explicit public candidates, not arbitrary object fields or internal IDs',()=>{
  const user={id:'INTERNAL_UID_SENTINEL',email:'private-sentinel@example.invalid',name:' ',username:'identificador_publico'}
  expect(publicName(user.name,user.username)).toBe('identificador_publico')
  expect(publicName(user)).toBe('Usuario de Galaxia')
 })
 it('does not mutate source data',()=>{
  const user=Object.freeze({name:'',email:'private-sentinel@example.invalid'})
  publicName(user.name);expect(user.email).toBe('private-sentinel@example.invalid')
 })
})

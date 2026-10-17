import { describe, expect, it } from 'vitest'
import { socialHeadline, socialSource } from './socialPostPresentation'
describe('post presentation shared with the social generator',()=>{
 it('keeps exact headlines and highlights for home cards',()=>{
  const post={title:'Artículo completo',social:{title:'¡Más secretos!',titleHighlights:['Más secretos']}}
  expect(socialHeadline(post)).toEqual({title:'¡Más secretos!',highlights:['Más secretos']})
 })
 it('supports old posts and social aliases without a public summary viewer',()=>{
  expect(socialHeadline({title:'Noticia'})).toEqual({title:'Noticia',highlights:[]})
  expect(socialSource({shortVersion:{title:'Portada'}})).toEqual({title:'Portada'})
 })
})

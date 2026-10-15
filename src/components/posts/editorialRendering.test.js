import { describe,it,expect } from 'vitest'
import { createSSRApp,h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import PostCinematicHero from './PostCinematicHero.vue'
import { renderRichText } from '../../services/richText'
const renderHero = props => renderToString(createSSRApp({ render:()=>h(PostCinematicHero,props) }))
describe('real editorial renderer contracts',()=>{
 it('preserves full headline and avoids interpreting headline HTML',async()=>{
  const title='Titular extenso '.repeat(15)+'<script>bad</script>'
  const html=await renderHero({post:{title,content:'Resumen',category:'Nintendo'}})
  expect(html).toContain('Titular extenso '.repeat(15))
  expect(html).toContain('&lt;script&gt;bad&lt;/script&gt;')
  expect(html).not.toContain('<script>bad</script>')
 })
 it('renders old optional data with its existing fallbacks',async()=>{
  const html=await renderHero({post:{title:'Artículo antiguo'}})
  expect(html).toContain('Artículo antiguo')
  expect(html).toContain('General')
  expect(html).toContain('Redactor')
  expect(html).not.toContain('undefined')
 })
 it('keeps external game destinations and preview safety distinct',async()=>{
  const post={title:'Juego',platform:'Nintendo Switch',game:{officialUrl:'https://www.nintendo.com/'}}
  expect(await renderHero({post})).toContain('href="https://www.nintendo.com/"')
  expect(await renderHero({post,preview:true})).not.toContain('href="https://www.nintendo.com/"')
 })
 it('keeps the existing analysis variant and its score',async()=>{
  const html=await renderHero({post:{title:'Análisis'},isAnalysis:true,analysisScore:88,analysisTier:{key:'gold',label:'GOLD'}})
  expect(html).toContain('Analisis Premium')
  expect(html).toContain('88')
  expect(html).toContain('GOLD')
 })
 it('renders paragraphs, lists, quote, link and divider in source order',()=>{
  const html=renderRichText('Primer **párrafo**\n\n- Uno\n- Dos\n\n1. Primero\n2. Segundo\n\n> Cita\n\n[Destino](https://www.nintendo.com/)\n---\nFinal')
  expect(html).toBe('<p>Primer <strong>párrafo</strong></p><ul><li>Uno</li><li>Dos</li></ul><ol><li>Primero</li><li>Segundo</li></ol><blockquote>Cita</blockquote><p><a href="https://www.nintendo.com/" target="_blank" rel="noopener noreferrer">Destino</a></p><hr /><p>Final</p>')
 })
 it('does not add new block syntax and continues escaping unsafe content',()=>{
  expect(renderRichText('# Encabezado literal\n<img src=x>\n[Enlace](javascript:bad)')).toBe('<p># Encabezado literal</p><p>&lt;img src=x&gt;</p><p><a href="#" target="_blank" rel="noopener noreferrer">Enlace</a></p>')
 })
})

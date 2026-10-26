import { describe, it, expect } from 'vitest'
import { DEFAULT_VISUAL_THEME, INITIAL_VISUAL_THEMES, VISUAL_THEME_KEY, validateVisualTheme, parseVisualThemeJson, resolveVisualTheme, socialThemeSettings, socialThemeCss, webThemeCss, postWebThemeCss, persistVisualThemes, loadVisualThemes, removeVisualTheme, visualThemeExportManifest } from './visualThemes'
import { titleRuns } from './socialContent'
import { mergeSocialSettings } from './socialTemplateState'
import { resolvePostVisualTheme, themeDecoration } from './visualThemes'
const clone=value=>JSON.parse(JSON.stringify(value))
const kirby=INITIAL_VISUAL_THEMES.find(t=>t.id==='kirby-dreamland')
const zelda=INITIAL_VISUAL_THEMES.find(t=>t.id==='zelda-hyrule')
const storage=()=>{const map=new Map();return {setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)??null}}
describe('visual themes local pilot',()=>{
 it('renders a published custom theme in a browser without the local library',()=>{
  const custom={...clone(kirby),id:'custom-published',name:'Custom published'}
  const post={visualThemeId:custom.id,visualThemeSnapshot:custom}
  expect(resolvePostVisualTheme(post,INITIAL_VISUAL_THEMES)).toEqual(custom)
  expect(resolvePostVisualTheme({...post,visualThemeSnapshot:{...custom,id:'other'}},INITIAL_VISUAL_THEMES)).toEqual(DEFAULT_VISUAL_THEME)
  expect(resolvePostVisualTheme({...post,visualThemeSnapshot:{id:custom.id}},[])).toEqual(DEFAULT_VISUAL_THEME)
 })
 it('uses the saved version publicly and local edits only in the editor',()=>{
  const edited={...clone(kirby),version:2}
  const post={visualThemeId:kirby.id,visualThemeSnapshot:kirby}
  expect(resolvePostVisualTheme(post,[edited]).version).toBe(1)
  expect(resolvePostVisualTheme(post,[edited],{preferLocal:true}).version).toBe(2)
 })
 it('validates every initial configuration',()=>{INITIAL_VISUAL_THEMES.forEach(t=>expect(validateVisualTheme(t)).toEqual(t))})
 it('keeps legacy and default output exactly unchanged',()=>{
  const theme=resolveVisualTheme(undefined,INITIAL_VISUAL_THEMES)
  expect(theme).toEqual(DEFAULT_VISUAL_THEME)
  expect(socialThemeSettings(theme)).toEqual({});expect(socialThemeCss(theme)).toEqual({});expect(webThemeCss(theme)).toEqual({})
  const previous={title:{color:'#fff',size:88},overlay:{height:100},image:{x:50},progress:{color:'#facc15'}}
  expect(mergeSocialSettings(previous,socialThemeSettings(theme))).toEqual(previous)
 })
 it('applies Kirby then Zelda without changing content, geometry or categories',()=>{
  const post={title:'¡Más secretos!',titleHighlights:['Más secretos'],categories:['Noticias','Kirby'],visualThemeId:kirby.id}
  const source=clone(post),settings={title:{size:88,line:1.08},image:{scale:100},overlay:{height:100}}
  const a=mergeSocialSettings(settings,socialThemeSettings(resolveVisualTheme(post.visualThemeId,INITIAL_VISUAL_THEMES)))
  const b=mergeSocialSettings(a,socialThemeSettings(zelda))
  expect(a.title.highlightColor).toBe(kirby.config.social.highlight);expect(b.title.highlightColor).toBe(zelda.config.social.highlight)
  expect(b.image).toEqual(settings.image);expect(b.title.size).toBe(88);expect(b.overlay.height).toBe(100);expect(post).toEqual(source)
 })
 it('imports valid JSON and rejects unknown versions, fields and unsafe CSS',()=>{
  expect(parseVisualThemeJson(JSON.stringify(kirby))).toEqual(kirby)
  for(const mutate of [t=>t.schemaVersion=2,t=>t.config.social.css='display:none',t=>t.config.social.title='url(javascript:alert(1))',t=>t.config.social.effect='arbitrary',t=>t.config.social.gradientOpacity=2,t=>t.version=1.5,t=>t.id='../bad',t=>t.config.general=null,t=>delete t.config.social.title,t=>t.config.social.labelText=t.config.social.labelBackground]){
   const value=clone(kirby);mutate(value);expect(()=>validateVisualTheme(value)).toThrow()
  }
  expect(()=>parseVisualThemeJson('{broken')).toThrow()
 })
 it('falls back for missing, archived and corrupt themes',()=>{
  for(const [id,list] of [['missing',INITIAL_VISUAL_THEMES],[kirby.id,[{...kirby,archived:true}]],[kirby.id,[{...kirby,config:null}]]])expect(resolveVisualTheme(id,list)).toEqual(DEFAULT_VISUAL_THEME)
 })
 it('persists and recovers edits and stable references without remote calls',()=>{
  const local=storage(),themes=clone(INITIAL_VISUAL_THEMES);themes[1].name='Nuevo nombre';themes[1].version=2
  persistVisualThemes(themes,'admin',local)
  expect(loadVisualThemes(local)).toEqual({themes,error:''})
  expect(resolveVisualTheme(kirby.id,loadVisualThemes(local).themes).name).toBe('Nuevo nombre')
 })
 it('keeps corrupted storage intact and uses safe defaults',()=>{
  const local=storage();local.setItem(VISUAL_THEME_KEY,'broken')
  expect(loadVisualThemes(local).themes).toEqual(INITIAL_VISUAL_THEMES);expect(loadVisualThemes(local).error).toBeTruthy();expect(local.getItem(VISUAL_THEME_KEY)).toBe('broken')
 })
 it('requires admin and complete usage checks for deletion',()=>{
  expect(()=>persistVisualThemes(INITIAL_VISUAL_THEMES,'publisher',storage())).toThrow(/administradores/)
  expect(()=>removeVisualTheme(INITIAL_VISUAL_THEMES,kirby.id,{role:'publisher',usageComplete:true})).toThrow()
  expect(()=>removeVisualTheme(INITIAL_VISUAL_THEMES,kirby.id,{role:'admin'})).toThrow(/verificar/)
  expect(()=>removeVisualTheme(INITIAL_VISUAL_THEMES,kirby.id,{role:'admin',usageComplete:true,posts:[{visualThemeId:kirby.id}]})).toThrow(/en uso/)
  expect(()=>removeVisualTheme(INITIAL_VISUAL_THEMES,'galaxia-general',{role:'admin',usageComplete:true})).toThrow()
  expect(removeVisualTheme(INITIAL_VISUAL_THEMES,kirby.id,{role:'admin',usageComplete:true})).toHaveLength(INITIAL_VISUAL_THEMES.length-1)
 })
 it('preserves exact highlights and safely ignores unmatched phrases',()=>{
  const title='¡Kirby esconde más secretos!'
  const runs=titleRuns(title,['más secretos','no coincide'])
  expect(runs.map(r=>r.text).join('')).toBe(title);expect(runs.filter(r=>r.highlighted).map(r=>r.text)).toEqual(['más secretos'])
 })
 it('exports a validated independent snapshot for reproducibility',()=>{
  const manifest=visualThemeExportManifest(kirby,true)
  expect(manifest.snapshot).toEqual(kirby);expect(manifest.visualThemeVersion).toBe(1)
  manifest.snapshot.name='changed';expect(kirby.name).toBe('Kirby Dreamland')
 })
 it('does not couple web and social tokens or rewrite metadata',()=>{
  expect(webThemeCss(kirby)['--visual-highlight']).toBe(kirby.config.web.highlight)
  expect(socialThemeCss(kirby)['--theme-card-border']).toBe(kirby.config.social.cardBorder)
 })
 it('keeps premium analyses gold across web placements without changing social exports',()=>{
  const theme=clone(kirby),before=socialThemeSettings(theme)
  for(const post of [{category:'Análisis'},{categories:['Nintendo Switch','Análisis']}]) {
   expect(postWebThemeCss(post,theme)['--visual-accent']).toBe('#facc15')
   expect(postWebThemeCss(post,theme)['--visual-label-background']).toBe('#6b4b0d')
   expect(postWebThemeCss(post,theme)['--visual-background']).toBe('#130e06')
  }
  expect(socialThemeSettings(theme)).toEqual(before)
  expect(theme).toEqual(kirby)
  expect(postWebThemeCss({categories:['Noticias']},theme)).toEqual(webThemeCss(theme))
 })
})

describe('seasonal visual themes',()=>{
 it('preserves optional decorations in published and exported snapshots',()=>{
  for(const id of ['halloween','christmas']) {
   const theme=INITIAL_VISUAL_THEMES.find(t=>t.id===id)
   expect(themeDecoration(resolvePostVisualTheme({visualThemeId:id,visualThemeSnapshot:theme},[]))).toBe(id)
   expect(visualThemeExportManifest(theme,true).snapshot.config.decoration).toBe(id)
   expect(postWebThemeCss({category:'Análisis'},theme)).toEqual(webThemeCss(theme))
  }
  const invalid=clone(kirby);invalid.config.decoration='url(https://example.com)'
  expect(()=>validateVisualTheme(invalid)).toThrow()
  expect(themeDecoration(kirby)).toBe('none')
 })
 it('adds seasonal choices to old libraries without altering custom themes',()=>{
  const local=storage(),old=clone(INITIAL_VISUAL_THEMES.filter(t=>!t.config.decoration))
  old[1].name='Mi Kirby personalizado'
  local.setItem(VISUAL_THEME_KEY,JSON.stringify({schemaVersion:1,themes:old}))
  const original=local.getItem(VISUAL_THEME_KEY),loaded=loadVisualThemes(local)
  expect(loaded.themes.slice(0,old.length)).toEqual(old)
  expect(loaded.themes.slice(-2).map(t=>themeDecoration(t))).toEqual(['halloween','christmas'])
  expect(local.getItem(VISUAL_THEME_KEY)).toBe(original)
  persistVisualThemes(loaded.themes.filter(t=>t.id!=='halloween'),'admin',local)
  expect(loadVisualThemes(local).themes.some(t=>t.id==='halloween')).toBe(false)
 })
})

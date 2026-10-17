// The theme library is local. Validated snapshots travel inside saved posts.
export const VISUAL_THEME_KEY = 'galaxia-visual-themes-v1'
export const DEFAULT_THEME_ID = 'galaxia-general'
const copy = value => JSON.parse(JSON.stringify(value))
const general = {
  primary:'#8b5cf6', secondary:'#5b21cf', accent:'#facc15', background:'#050816',
  surface:'#17141e', text:'#ffffff', muted:'#ede9fe', highlight:'#facc15'
}
const social = {
  title:'#ffffff', highlight:'#facc15', description:'#ede9fe', labelBackground:'#8b5cf6', labelEnd:'#5b21cf', labelText:'#ffffff',
  numberBackground:'#8b38f5', numberEnd:'#e346db', numberText:'#ffffff', cardBackground:'#252230b8', cardEnd:'#17141e8c', cardBorder:'#ffffff16',
  progressActive:'#facc15', progressMiddle:'#ffad47', progressEnd:'#fb7185', progressInactive:'#9a9dbb70',
  arrowBackground:'#20152e85', arrowEnd:'#ec4899', arrowIcon:'#ffffff', arrowBorder:'#b65ddd',
  gradientStart:'#050816', gradientEnd:'#050816', gradientOpacity:0.9, glowOpacity:0.22, effect:'none'
}
const web = { accent:'#a855f7', highlight:'#facc15', labelBackground:'#7024dc', labelText:'#ffffff', buttonBackground:'#7024dc', buttonText:'#ffffff', border:'#a855f780' }
export const DEFAULT_VISUAL_THEME = { schemaVersion:1, id:DEFAULT_THEME_ID, name:'Galaxia General', version:1, archived:false, config:{ general, social, web } }
function preset(id,name,primary,secondary,accent,background) {
  const theme=copy(DEFAULT_VISUAL_THEME)
  Object.assign(theme,{id,name})
  Object.assign(theme.config.general,{primary,secondary,accent,highlight:accent,background})
  Object.assign(theme.config.social,{highlight:accent,labelBackground:primary,labelEnd:secondary,numberBackground:primary,numberEnd:secondary,progressActive:primary,progressMiddle:accent,progressEnd:secondary,arrowBackground:primary,arrowEnd:secondary,gradientStart:background,gradientEnd:background})
  Object.assign(theme.config.web,{accent,highlight:accent,labelBackground:primary,buttonBackground:primary,border:primary})
  return theme
}
export const INITIAL_VISUAL_THEMES = [copy(DEFAULT_VISUAL_THEME),
  preset('kirby-dreamland','Kirby Dreamland','#9d2464','#155e75','#ff94d1','#200e24'),
  preset('zelda-hyrule','Zelda Hyrule','#06634d','#164e3b','#ffd65a','#041c16'),
  preset('mario-kingdom','Mario Kingdom','#b91c1c','#1d4ed8','#ffe35a','#170d19'),
  preset('nintendo-news','Nintendo News','#c40019','#111111','#ffffff','#100609'),
  preset('analisis-epico','Análisis Épico','#5b21b6','#351259','#ffda64','#11091e'),
  preset('petit-planet','Petit Planet','#166854','#155e75','#d8f7af','#0b211e')]

const fail = message => { throw new Error(message) }
function keysOnly(value, allowed, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path}: se esperaba un objeto.`)
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${path}.${key}: campo no permitido.`)
}
export function validateVisualTheme(input) {
  keysOnly(input,['schemaVersion','id','name','version','archived','config'],'tema')
  if(input.schemaVersion!==1) fail('Versión de esquema no compatible (se requiere 1).')
  if(typeof input.id!=='string'||!/^[a-z0-9][a-z0-9-]{1,63}$/.test(input.id)) fail('Identificador inválido: usa letras minúsculas, números y guiones.')
  if(typeof input.name!=='string'||!input.name.trim()||input.name.length>80) fail('Nombre inválido (1–80 caracteres).')
  if(!Number.isSafeInteger(input.version)||input.version<1) fail('La versión debe ser un entero positivo.')
  if(typeof input.archived!=='boolean') fail('archived debe ser booleano.')
  keysOnly(input.config,['general','social','web'],'config')
  for(const group of ['general','social','web']) {
    const values=input.config[group], shape=DEFAULT_VISUAL_THEME.config[group]
    keysOnly(values,Object.keys(shape),group)
    for(const [key,example] of Object.entries(shape)) {
      const value=values[key]
      if(typeof example==='number') {
        if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1) fail(`${group}.${key}: valor entre 0 y 1.`)
      } else if(key==='effect') {
        if(!['none','soft-glow'].includes(value)) fail('Efecto no permitido.')
      } else if(typeof value!=='string'||!/^#[a-f\d]{6}([a-f\d]{2})?$/i.test(value)) fail(`${group}.${key}: usa un color hexadecimal #RRGGBB o #RRGGBBAA.`)
    }
  }
  const theme=copy(input)
  theme.name=theme.name.trim()
  const warnings=themeContrastWarnings(theme)
  if(warnings.length) fail(warnings.join(' '))
  return theme
}
export function contrastRatio(a,b) {
  const luminance = hex => {
    const rgb=hex.slice(1,7).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4)
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
  }
  const x=luminance(a),y=luminance(b)
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)
}
export function themeContrastWarnings(theme) {
  const s=theme.config.social,w=theme.config.web,g=theme.config.general
  const composite=(color,background)=>{
    if(color.length===7)return color
    const opacity=parseInt(color.slice(7,9),16)/255
    return '#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*opacity+parseInt(background.slice(i,i+2),16)*(1-opacity)).toString(16).padStart(2,'0')).join('')
  }
  return [[g.text,g.background,'Texto general'],[g.muted,g.background,'Texto secundario'],[s.title,s.gradientEnd,'Título social'],[s.description,s.gradientEnd,'Descripción social'],[s.labelText,s.labelBackground,'Etiqueta social'],[s.labelText,s.labelEnd,'Final de etiqueta social'],[s.numberText,s.numberBackground,'Números'],[s.numberText,s.numberEnd,'Final de números'],[s.arrowIcon,s.arrowBackground,'Flecha'],[w.labelText,w.labelBackground,'Etiqueta web'],[w.buttonText,w.buttonBackground,'Botón web']]
    .filter(([a,b,name])=>{const bg=composite(b,'#050816');return contrastRatio(composite(a,bg),bg)<(/etiqueta social|números/i.test(name)?3:4.5)}).map(([, ,name])=>`${name}: contraste insuficiente (3:1 en etiquetas y números sociales grandes; 4.5:1 en el resto).`)
}
export function parseVisualThemeJson(json) { if(json.length>50000) fail('JSON demasiado grande.'); return validateVisualTheme(JSON.parse(json)) }
export function loadVisualThemes(storage=globalThis.localStorage) {
  try {
    const data=JSON.parse(storage?.getItem(VISUAL_THEME_KEY)||'null')
    if(!data) return {themes:copy(INITIAL_VISUAL_THEMES),error:''}
    if(data.schemaVersion!==1||!Array.isArray(data.themes)||data.themes.length>100) fail('Biblioteca local inválida.')
    const themes=data.themes.map(validateVisualTheme)
    if(new Set(themes.map(t=>t.id)).size!==themes.length) fail('Identificadores duplicados.')
    if(!themes.some(t=>t.id===DEFAULT_THEME_ID&&!t.archived)) fail('Falta el tema predeterminado.')
    return {themes,error:''}
  } catch { return {themes:copy(INITIAL_VISUAL_THEMES),error:'No se pudo leer la biblioteca local. Se muestran los valores iniciales sin sobrescribirla.'} }
}
export function persistVisualThemes(themes,role,storage=globalThis.localStorage) {
  if(role!=='admin') fail('Solo los administradores pueden gestionar temas.')
  if(!Array.isArray(themes)||themes.length>100) fail('Máximo 100 temas.')
  const checked=themes.map(validateVisualTheme)
  if(new Set(checked.map(t=>t.id)).size!==checked.length) fail('Identificadores duplicados.')
  if(!checked.some(t=>t.id===DEFAULT_THEME_ID&&!t.archived)) fail('El tema predeterminado debe permanecer disponible.')
  const previous=storage.getItem(VISUAL_THEME_KEY)
  if(previous) {
    let history=[]
    try{history=JSON.parse(storage.getItem(VISUAL_THEME_KEY+'-history')||'[]');if(!Array.isArray(history))history=[]}catch{}
    storage.setItem(VISUAL_THEME_KEY+'-history',JSON.stringify([...history.slice(-4),{savedAt:Date.now(),json:previous}]))
  }
  storage.setItem(VISUAL_THEME_KEY,JSON.stringify({schemaVersion:1,themes:checked}))
  if(typeof window!=='undefined') window.dispatchEvent(new Event('galaxia-themes-changed'))
  return checked
}
export function resolveVisualTheme(id,themes=[]) {
  if(!id) return copy(DEFAULT_VISUAL_THEME)
  try {const theme=themes.find(t=>t.id===id&&!t.archived);return theme?validateVisualTheme(theme):copy(DEFAULT_VISUAL_THEME)} catch {return copy(DEFAULT_VISUAL_THEME)}
}
// A published snapshot travels with the post, including to clean browsers.
export function resolvePostVisualTheme(post={},themes=[],{preferLocal=false}={}) {
 const id=post?.visualThemeId
 const local=themes.find(theme=>theme.id===id&&!theme.archived)
 if(preferLocal && local) return resolveVisualTheme(id,themes)
 try {
  const snapshot=post?.visualThemeSnapshot
  if(snapshot && snapshot.id===id && !snapshot.archived) return validateVisualTheme(snapshot)
 } catch {}
 return resolveVisualTheme(id,themes)
}
export function isLegacyTheme(theme) { return !theme || Object.entries(DEFAULT_VISUAL_THEME.config).every(([group,values])=>Object.entries(values).every(([key,value])=>theme.config?.[group]?.[key]===value)) }
export function removeVisualTheme(themes,id,{role,posts=[],usageComplete=false}={}) {
  if(role!=='admin') fail('Solo los administradores pueden eliminar temas.')
  if(id===DEFAULT_THEME_ID) fail('No se puede eliminar el tema predeterminado.')
  if(!usageComplete) fail('No se ha podido verificar el uso. Archiva el tema en su lugar.')
  if(posts.some(p=>p.visualThemeId===id)) fail('El tema está en uso. Puedes archivarlo sin modificar publicaciones.')
  return themes.filter(t=>t.id!==id)
}
// General has no overrides: keeps ALL existing styles, including per-slide gold accents.
export function socialThemeSettings(theme) {
  if(isLegacyTheme(theme)) return {}
  const s=theme.config.social
  return {title:{color:s.title,highlightColor:s.highlight},description:{color:s.description},points:{color:s.description},
    part:{color:s.labelBackground,endColor:s.labelEnd,foregroundColor:s.labelText,customPaint:true},
    arrow:{color:s.arrowBackground,endColor:s.arrowEnd,foregroundColor:s.arrowIcon},
    progress:{color:s.progressActive,endColor:s.progressEnd},number:{color:s.numberText},
    overlay:{color:s.gradientStart,endColor:s.gradientEnd,intensity:s.gradientOpacity}}
}
export function socialThemeCss(theme) {
  if(isLegacyTheme(theme)) return {}
  const s=theme.config.social
  return {'--theme-number-bg':`linear-gradient(140deg,${s.numberBackground},${s.numberEnd})`,'--theme-number-text':s.numberText,
    '--theme-card-bg':`linear-gradient(130deg,${s.cardBackground},${s.cardEnd})`,'--theme-card-border':s.cardBorder,
    '--theme-progress-active':`linear-gradient(90deg,${s.progressActive},${s.progressMiddle},${s.progressEnd})`,'--theme-progress-inactive':s.progressInactive,
    '--theme-arrow-bg':`linear-gradient(110deg,${s.arrowBackground},${s.arrowEnd})`,'--theme-arrow-border':s.arrowBorder,'--theme-glow-opacity':s.effect==='soft-glow'?s.glowOpacity:0}
}
export function webThemeCss(theme) {
  if(isLegacyTheme(theme)) return {}
  return {...Object.fromEntries(Object.entries(theme.config.web).map(([k,v])=>['--visual-'+k.replace(/[A-Z]/g,x=>'-'+x.toLowerCase()),v])),
    '--visual-background':theme.config.general.background,'--visual-surface':theme.config.general.surface,
    '--visual-primary':theme.config.general.primary,'--visual-secondary':theme.config.general.secondary,
    '--visual-text':theme.config.general.text,'--visual-muted':theme.config.general.muted}
}
export function visualThemeExportManifest(theme,enabled) {return {schemaVersion:1,visualThemeId:theme.id,visualThemeVersion:theme.version,enabled,snapshot:validateVisualTheme(theme)}}

// Keep the site's established premium review treatment independent of social export palettes.
export function postWebThemeCss(post,theme) {
 const css=webThemeCss(theme)
 const analysis=[...(Array.isArray(post?.categories)?post.categories:[]),post?.category||''].some(value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('analisis'))
 if(!analysis)return css
 return {...css,'--visual-background':'#130e06','--visual-surface':'#181309','--visual-primary':'#997419','--visual-secondary':'#5c3b0d',
  '--visual-accent':'#facc15','--visual-highlight':'#ffda64','--visual-border':'#d6a82899',
  '--visual-label-background':'#6b4b0d','--visual-label-text':'#fff4c2','--visual-button-background':'#171208','--visual-button-text':'#ffe17d'}
}

import { readFile } from 'node:fs/promises'
const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8'))
const seen=new Set()
function visit(key) {
  if(seen.has(key))return
  seen.add(key)
  const entry=manifest[key]
  // The shared application entry lists every route's lazy imports. A profile
  // visit executes its static imports, not other routes' lazy import functions.
  for(const child of entry?.imports || [])visit(child)
  if(!entry?.isEntry)for(const child of entry?.dynamicImports || [])visit(child)
}
visit('src/pages/ProfilePage.vue')
for(const key of seen){
  if(/components\/admin\/|profileIconAdmin|ProfileIconEditor/.test(key))throw new Error(`Administrative dependency in profile: ${key}`)
  const entry=manifest[key]
  if(!entry)continue
  const code=await readFile(`dist/${entry.file}`,'utf8')
  if(/Crear icono|Subir imagen|save-achievements|upload-icon-image|delete-icon|update-icon/.test(code))throw new Error(`Administrative code in profile dependency: ${entry.file}`)
}
if(!manifest['src/components/admin/ProfileRewardsManager.vue']?.isDynamicEntry)throw new Error('Manager must have its own lazy chunk')
console.log('OK: public profile and its dependencies exclude icon administration; the Global Manager has a separate lazy chunk.')
const eventDependencies=new Set()
function visitEvents(key){
  if(eventDependencies.has(key))return
  eventDependencies.add(key)
  for(const child of manifest[key]?.imports||[])visitEvents(child)
}
visitEvents('src/pages/EventsPage.vue')
for(const key of eventDependencies)if(/EventsManager|EventEditorModal|EventsBulkImport|EventSharePage|EventsCalendar/.test(key))throw Error('Administrative/calendar dependency in public Events: '+key)
console.log('OK: public Events excludes calendar, editors, JSON import and social generator dependencies.')

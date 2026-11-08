import { describe,it,expect,vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { readFileSync } from 'node:fs'
import { checkProgressRules } from '../../scripts/check-progress-rules.mjs'
import { createIconImageUploader } from '../../netlify/functions/lib/icon-image.js'
vi.mock('@/firebase',()=>({db:{},auth:{currentUser:null}}))
import ProfileRewardsHub from '@/components/profile/ProfileRewardsHub.vue'
import ProfileRewardsManager from '@/components/admin/ProfileRewardsManager.vue'
describe('public/admin separation',()=>{
  it('public collection has no administration mode, even for an admin or a forged tab',async()=>{
    const html=await renderToString(createSSRApp({render:()=>h(ProfileRewardsHub,{profile:{role:'admin'},tab:'manage',admin:true,own:true,icons:[],unlocked:[]})}))
    expect(html).not.toMatch(/Administrar|Crear icono|Subir imagen|Gestionar icono|Estrellas necesarias/)
  })
  it('manager renders no catalog tools for non-administrators',async()=>{
    const html=await renderToString(createSSRApp({render:()=>h(ProfileRewardsManager,{userRole:'user'})}))
    expect(html).toContain('Solo los administradores')
    expect(html).not.toMatch(/Crear icono|Crear logro|Subir imagen/)
  })
  it('profile source no longer imports or handles administrative catalog operations',()=>{
    const source=readFileSync(new URL('../pages/ProfilePage.vue',import.meta.url),'utf8')
    expect(source).not.toMatch(/profileIconAdmin|ProfileIconEditor|ProfileIconCatalogEditor|ProfileRewardsManager|uploadIcon|saveAchievementsConfig|updateProfileIcon|manage-icon/)
  })
})
describe('publication safety',()=>{
  it('flags the stated temporary deadline and broad grants without deploying anything',()=>{
    const source='match /{document=**} { allow read, write: if request.time < timestamp.date(2026, 11, 15); }'
    const result=checkProgressRules(source,new Date('2026-11-08T00:00:00Z'))
    expect(result.deadlines).toEqual([{date:'2026-11-15',daysRemaining:7}])
    expect(result.warnings).toHaveLength(2)
  })
  it('stores images at immutable unique paths and never deletes an existing image',async()=>{
    const saves=[]
    const bucket={file:path=>({path,save:async(bytes,options)=>saves.push({path,bytes,options})})}
    const uploader=createIconImageUploader(bucket,async file=>'https://example.test/'+file.path)
    const data={contentType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6HcAAAAASUVORK5CYII='}
    await uploader(data);await uploader(data)
    expect(saves[0].path).not.toBe(saves[1].path)
    expect(saves[0].options.preconditionOpts.ifGenerationMatch).toBe(0)
    expect(saves[0].options.metadata.contentType).toBe('image/png')
  })
})

import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, it, expect } from 'vitest'
import ProfileRewardsHub from './ProfileRewardsHub.vue'
describe('participation collection presentation',()=>{
  const icons=[{id:'free',name:'Starter',src:'/free.png',requiredStars:0,order:0},{id:'special',name:'Special',src:'/special.png',requiredStars:50,order:1}]
  const render=(stars,profile={})=>renderToString(createSSRApp({render:()=>h(ProfileRewardsHub,{tab:'collection',profile:{selectedIcon:'free',...profile},icons,stars,own:true,unlocked:['free'],saga:()=> 'Collection'})}))
  it('shows actual remaining progress and preserves a visible notice of unconverted legacy stars',async()=>{
    const html=await render(35,{stars:40})
    expect(html).toContain('Te faltan 15 estrellas')
    expect(html).toContain('40 estrellas se conserva')
    expect(html).toContain('Bloqueado: 50 estrellas')
    expect(html).toContain('aria-label="Progreso hacia el siguiente desbloqueo"')
    expect(html).not.toMatch(/gachap|comprar|canjear|monedas/i)
  })
  it('renders computed prestige beyond the initial levels and removes the migration notice after approval',async()=>{
    const html=await render(1200,{stars:40,progressMigrationVersion:2})
    expect(html).toContain('Prestigio 12')
    expect(html).not.toContain('Tu saldo anterior')
  })
})

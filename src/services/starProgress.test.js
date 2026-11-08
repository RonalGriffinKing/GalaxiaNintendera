import { describe, it, expect } from 'vitest'
import { canUseIcon, progressSummary, retainUnlocked, starCount } from './starProgress'
import { planMigration } from '../../scripts/plan-star-migration.mjs'
describe('permanent participation', () => {
  const icons = [0,10,25,50,100,500].map(n => ({id:`i${n}`,requiredStars:n}))
  it('unlocks all reached levels, preserves legacy ownership and excludes new inactive icons', () => {
    const user={stars:9999,participationStars:60,unlockedIcons:['old']}
    expect(retainUnlocked(user,[...icons,{id:'disabled',requiredStars:0,active:false}])).toEqual(['old','i0','i10','i25','i50'])
    expect(canUseIcon(user,{id:'old',requiredStars:500,active:false,visible:false,archived:true})).toBe(true)
    expect(canUseIcon({stars:9999},icons[1])).toBe(false)
  })
  it('calculates next progress and prestige without an artificial cap', () => {
    expect(progressSummary({participationStars:35},icons)).toMatchObject({next:50,remaining:15,prestige:0})
    expect(progressSummary({participationStars:12500},icons)).toEqual({stars:12500,next:null,remaining:0,prestige:125})
  })
  it.each([-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1])('rejects invalid stars %s',value=>expect(()=>starCount(value)).toThrow())
})
describe('offline historical migration',()=>{
  it('uses stored historical amounts without touching balances or icons and avoids double-counting v2',()=>{
    const source={users:[{id:'u',data:{stars:40,participationStars:1,readPostsCount:3,unlockedIcons:['old']},reads:[{id:'a',stars:10},{id:'b',stars:90},{id:'c',stars:1,progressVersion:2}]}]}
    const before=JSON.stringify(source)
    expect(planMigration(source)[0]).toMatchObject({status:'candidate-needs-approval',proposedParticipationStars:101,preserveUnlockedIcons:['old']})
    expect(JSON.stringify(source)).toBe(before)
  })
  it('refuses incomplete histories and invents no reimbursement',()=>{
    const result=planMigration({users:[{id:'u',data:{stars:100,readPostsCount:10},reads:[{id:'a',stars:10}]}]})[0]
    expect(result.status).toBe('manual-review');expect(result.proposedParticipationStars).toBeNull()
    expect(result.issues).toContain('incomplete-read-history');expect(result.alternatives).toHaveLength(2)
  })
})

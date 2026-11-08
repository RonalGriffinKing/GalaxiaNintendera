import { describe, it, expect } from 'vitest'
import { communitySlug, communityPath, resolveCommunityRoute } from './communityRoutes'
const communities=[{id:'galaxia-oficial',name:'Galaxia Nintendera',isOfficial:true},{id:'random-kirby-id',name:'Dream Land Club'},{id:'random-pokemon-id',name:'POKÉMON LEAGUE'}]
describe('named community routes',()=>{
 it('uses readable, accent-free names without exposing random IDs',()=>{expect(communityPath(communities[2],communities)).toBe('/comunidad/pokemon-league');expect(communitySlug('  Dream Land Club!  ')).toBe('dream-land-club')})
 it('resolves named routes and keeps legacy ID links compatible',()=>{expect(resolveCommunityRoute(communities,{slug:'pokemon-league'})).toBe(communities[2]);expect(resolveCommunityRoute(communities,{id:'random-kirby-id'})).toBe(communities[1]);expect(resolveCommunityRoute(communities,{})).toBe(communities[0])})
 it('does not select the wrong community when the slug or ID is unknown',()=>{expect(resolveCommunityRoute(communities,{slug:'missing'})).toBeNull();expect(resolveCommunityRoute(communities,{id:'missing'})).toBeNull()})
 it('disambiguates duplicate names using deterministic routes',()=>{const items=[{id:'first',name:'Kirby'},{id:'second',name:'Kirby'}];for(const item of items){const path=communityPath(item,items);expect(resolveCommunityRoute(items,{slug:path.split('/').at(-1)})).toBe(item)}expect(resolveCommunityRoute(items,{slug:'kirby'})).toBeNull()})
 it('keeps routing IDs separate from display names',()=>{expect(resolveCommunityRoute(communities,{slug:'dream-land-club'}).id).toBe('random-kirby-id')})
})

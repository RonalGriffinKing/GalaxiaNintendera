// Read adapter only: never writes/normalizes existing originals or changes their document IDs.
import {projectEditorial} from './contract.mjs';
const pick=(source,keys)=>Object.fromEntries(keys.filter(k=>source?.[k]!==undefined).map(k=>[k,source[k]]));
const gameKeys=['nameEs','nameEn','platforms','releaseDate','releaseNote','officialUrl','officialLinks'];
export function originalSource(id,raw){
 const source=pick(raw,['title','slug','subtitle','content','summary','image','category','categories','sections','tags','keywords','authorName','authorId','placement','isMainEntry','metaDescription','canonicalUrl','indexGoogle','game','analysis','releaseAt','scheduledAt','expiresAt','createdAt','updatedAt','publishedAt']);
 source.status='approved';source.visibility=raw.visibility||'public';source.slug=raw.slug||id;
 if(source.placement==='news')source.placement='feed';
 source.sections=(raw.sections||[]).map(s=>pick(s,['title','subtitle','content','image','label','hidden']));
 if(source.game){source.game=pick(source.game,gameKeys);if(typeof source.game.officialUrl==='string'){const m=source.game.officialUrl.match(/^\[.*\]\((https:\/\/[^)]+)\)$/);if(m)source.game.officialUrl=m[1];}if(Array.isArray(source.game.platforms))source.game.platforms=source.game.platforms.map(p=>typeof p==='string'?p:pick(p,['name','releaseDate','releaseNote']));if(Array.isArray(source.game.officialLinks))source.game.officialLinks=source.game.officialLinks.map(l=>pick(l,['label','url']));}
 if(source.analysis){source.analysis=pick(source.analysis,['score','hypeTitle','criteria','pros','cons']);source.analysis.criteria=(source.analysis.criteria||[]).map(c=>pick(c,['key','label','score']));}
 return source;
}
export function publicOriginal(id,raw,now){
 if(raw.status!=='approved'||raw.visibility==='private')return null;
 return projectEditorial(originalSource(id,raw),{now,revision:Number.isSafeInteger(raw.editorialRevision)&&raw.editorialRevision>0?raw.editorialRevision:1}).document;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPublicProfile,assertPublicProfile,createTrustedAssetPolicy,canonicalAssetPath,PublicContractError} from './public-profile.mjs';


const user=()=>({name:'Alice',username:'@alice',isBlocked:false,email:'private@example.invalid',stars:100,role:'admin',unlockedIcons:['private'],history:{email:'nested@example.invalid'}});
const policy=createTrustedAssetPolicy([{path:'/assets/icon.png',special:true,effectColor:'#123abc',saga:'Kirby'}]);
const options={publishHandle:true,assetPolicy:policy,equippedIcon:{src:'/assets/icon.png'}};

const rejected=fn=>assert.throws(fn,PublicContractError);
test('REQ1 explicit true only authorises handle publication',()=>{
  for(const publishHandle of ['false','true',1,[],{},null,undefined,false])assert.equal(projectPublicProfile(user(),{publishHandle}).handle,'Usuario de Galaxia');
  assert.equal(projectPublicProfile(user(),{publishHandle:true}).handle,'@alice');
});
test('REQ2 encoded private avatar rejected even when trusted origin matches',()=>{
  for(const src of ['https://galaxianintendera.com/assets/private%40example.invalid.png','/assets/private%2540example.invalid.png','/assets/private%252540example.invalid.png']){
    const out=projectPublicProfile(user(),{...options,equippedIcon:{src}});assert.equal(out.avatarUrl,'');assert.ok(!JSON.stringify(out).includes('example.invalid'));
  }
});
test('REQ3 effect color never coerces caller array/object; manifest rejects nonstrings',()=>{
  for(const effectColor of [['#123abc'],{email:'private@example.invalid'},123,null]){
    const out=projectPublicProfile(user(),{...options,equippedIcon:{src:'/assets/icon.png',effectColor}});
    assert.equal(typeof out.avatarEffect.effectColor,'string');assert.equal(out.avatarEffect.effectColor,'#123abc');
    rejected(()=>createTrustedAssetPolicy([{path:'/assets/icon.png',special:false,effectColor,saga:''}]));
  }
});
test('public profile rejects private root and nested fields',()=>{const out=projectPublicProfile(user(),options);assert.ok(assertPublicProfile(out,{assetPolicy:policy}));for(const bad of [{...out,email:'private@example.invalid'},{...out,avatarEffect:{...out.avatarEffect,email:'private@example.invalid'}}])rejected(()=>assertPublicProfile(bad,{assetPolicy:policy}));});






test('R9 labels multiline/control/bidi/zero-width/encoded emails fail safe without changing valid names',()=>{
  for(const name of ['Fake\nprivate@example.invalid','Name\r','Name\t','Name\u0000','Name\u007f','Name\u200b','Name\u202e','private%40example.invalid','private%2540example.invalid','private&#64;example.invalid','private\\u0040example.invalid']){
    assert.equal(projectPublicProfile({...user(),name}).displayName,'Usuario de Galaxia');
  }
  for(const name of ['María Nintendo','  Ana Galaxia  ','Fan 100% Nintendo'])assert.equal(projectPublicProfile({...user(),name}).displayName,name.trim());
});
test('R10 missing/invalid block and authority states never publish',()=>{
  for(const isBlocked of [undefined,null,1,'false',true])assert.equal(projectPublicProfile({...user(),isBlocked}),null);
});
test('R11 malformed input uses typed rejection; planning deletes instead of retaining stale document',()=>{
  for(const equippedIcon of [null,[],123,'icon']){
    rejected(()=>projectPublicProfile(user(),{equippedIcon}));
  }
  for(const input of [null,[],false,'user'])rejected(()=>projectPublicProfile(input));
});
test('trusted manifest required; default policy never accepts arbitrary assets',()=>{
  const unapproved=projectPublicProfile(user(),{equippedIcon:{src:'/assets/icon.png',special:true,effectColor:'#123abc'}});
  assert.equal(unapproved.avatarUrl,'');assert.equal(unapproved.avatarEffect.special,false);
  rejected(()=>projectPublicProfile(user(),{assetPolicy:{approved:true}}));
  for(const path of ['/assets/private@x.png','/assets/private%40x.png'])rejected(()=>createTrustedAssetPolicy([{path,special:false,effectColor:'#123abc',saga:''}]));
});
test('canonical trusted avatar collapses HTTPS default port/host case and safe path encodings',()=>{
  for(const src of ['/assets/icon.png','https://GALAXIANINTENDERA.com:443/assets/icon.png','/assets/%69con.png']){
    const out=projectPublicProfile(user(),{...options,equippedIcon:{src}});assert.equal(out.avatarUrl,'/assets/icon.png');
  }
  for(const src of ['http://galaxianintendera.com/assets/icon.png','https://galaxianintendera.com:444/assets/icon.png','https://evil.invalid/assets/icon.png','//evil.invalid/assets/icon.png','/assets/../assets/icon.png','/assets/%2e%2e/assets/icon.png','/assets/icon.png?token=private','/assets/icon.png#private','https://user:pass@galaxianintendera.com/assets/icon.png','/assets/icon.png%00','/assets/%ZZ'])assert.equal(canonicalAssetPath(src),'');
});
test('strict public output rejects arrays, extra nested keys, getter/symbol and mismatched asset effects',()=>{
  const out=projectPublicProfile(user(),options);
  for(const bad of [{...out,avatarEffect:['#123abc']},{...out,avatarEffect:{...out.avatarEffect,stars:50}},{...out,avatarEffect:{...out.avatarEffect,special:false}},{...out,avatarUrl:'/assets/unknown.png'},{...out,[Symbol('private')]:1}])rejected(()=>assertPublicProfile(bad,{assetPolicy:policy}));
  const getter={...out};Object.defineProperty(getter,'displayName',{get(){throw Error('getter executed');},enumerable:true});rejected(()=>assertPublicProfile(getter,{assetPolicy:policy}));
});
test('private getters never execute; arbitrary nested private source not propagated',()=>{
  const source=user();Object.defineProperty(source,'name',{get(){throw Error('getter executed');},enumerable:true});
  const out=projectPublicProfile(source);assert.equal(out.displayName,'Usuario de Galaxia');assert.ok(!JSON.stringify(out).includes('example.invalid'));
  assert.deepEqual(Object.keys(out),['publicSchemaVersion','displayName','handle','avatarUrl','avatarEffect']);assert.ok(Object.isFrozen(out)&&Object.isFrozen(out.avatarEffect));
});
test('manifest snapshots immutable; additional fields/repeated canonical asset rejected',()=>{
  const entry={path:'/assets/safe.png',special:false,effectColor:'#123abc',saga:'Kirby'};
  const p=createTrustedAssetPolicy([entry]);entry.effectColor='#ffffff';
  assert.equal(projectPublicProfile(user(),{assetPolicy:p,equippedIcon:{src:'/assets/safe.png'}}).avatarEffect.effectColor,'#123abc');
  rejected(()=>createTrustedAssetPolicy([{...entry,email:'private@example.invalid'}]));
  rejected(()=>createTrustedAssetPolicy([entry,{...entry,path:'https://galaxianintendera.com/assets/safe.png'}]));
});

test('public validation snapshots mutable DTO before a future asynchronous write can race',()=>{
  const source=JSON.parse(JSON.stringify(projectPublicProfile(user(),options)));
  const snapshot=assertPublicProfile(source,{assetPolicy:policy});
  source.displayName='private@example.invalid';source.avatarEffect.saga='private@example.invalid';source.email='private@example.invalid';
  assert.equal(snapshot.displayName,'Alice');assert.equal(snapshot.avatarEffect.saga,'Kirby');
  assert.ok(!JSON.stringify(snapshot).includes('example.invalid'));assert.ok(Object.isFrozen(snapshot));
});

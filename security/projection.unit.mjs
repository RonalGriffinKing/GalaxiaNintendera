import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPublicProfile as project,createTrustedAssetPolicy} from './public-profile.mjs';
// Synthetic asset approved ONLY for these original nine fixtures; not a production manifest.
const fixtureAssets=createTrustedAssetPolicy([{path:'/assets/icon.png',special:true,effectColor:'#123abc',saga:'Kirby'}]);
const projectPublicProfile=(user,options={})=>project(user,{...options,assetPolicy:fixtureAssets});
for (const [name, expected] of [['Nombre válido','Nombre válido'],[undefined,'Usuario de Galaxia'],['','Usuario de Galaxia'],['   ','Usuario de Galaxia'],['fake@example.invalid','Usuario de Galaxia']]) {
  test(`projection label ${JSON.stringify(name)}`, () => {
    const out = projectPublicProfile({name,email:'private@example.invalid',isBlocked:false,stars:123,role:'admin',readPosts:['secret'],unlockedIcons:['secret'],legalAccepted:true});
    assert.equal(out.displayName,expected);
    assert.deepEqual(Object.keys(out),['publicSchemaVersion','displayName','handle','avatarUrl','avatarEffect']);
    assert.ok(!JSON.stringify(out).includes('@example.invalid'));
  });
}
test('no unapproved handle, contact, private URL or nested metadata', () => {
  const out = projectPublicProfile({name:'Alice',username:'private@example.invalid',isBlocked:false,imageUrl:'https://private.invalid/avatar?token=secret'},
    {publishHandle:true,equippedIcon:{src:'https://galaxianintendera.com/assets/icon.png?token=secret',saga:'private@example.invalid',effectColor:'bad',private:'secret'}});
  assert.equal(out.handle,'Usuario de Galaxia'); assert.equal(out.avatarUrl,''); assert.equal(out.avatarEffect.saga,'');
  assert.ok(!JSON.stringify(out).includes('secret'));
});
test('trusted equipped icon only; no inventory/cost/rarity projection', () => {
  const out = projectPublicProfile({name:'Alice',isBlocked:false,username:'@alice'}, {publishHandle:true,equippedIcon:{src:'/assets/icon.png',special:true,effectColor:'#123abc',saga:'Kirby',cost:50,rarity:'legendary'}});
  assert.equal(out.avatarUrl,'/assets/icon.png'); assert.equal(out.handle,'@alice'); assert.equal(out.avatarEffect.special,true);
  assert.ok(!JSON.stringify(out).includes('legendary'));
});
test('missing or blocked moderation state unpublishes', () => {
  for (const isBlocked of [undefined,true,'false']) assert.equal(projectPublicProfile({name:'Alice',isBlocked}),null);
});
test('handle publication requires explicit decision',()=> assert.equal(projectPublicProfile({name:'Alice',username:'@alice',isBlocked:false}).handle,'Usuario de Galaxia'));

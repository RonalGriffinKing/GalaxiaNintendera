// Server-only purchase operation. No client balance, cost or target UID is accepted.
import {builtinIcon} from './profile-progress.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
export function createIconPurchaseService({db,auth,clock=Date.now}){
 return {async execute(token,input){
  if(!input||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).some(k=>!['iconId','expectedCost'].includes(k))||typeof input.iconId!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(input.iconId))fail('invalid-purchase');
  let user;try{const claims=await auth.verifyIdToken(token,true);user=await auth.getUser(claims.uid);if(user.uid!==claims.uid||user.disabled||!user.emailVerified)fail('authentication-denied');}catch{fail('authentication-denied');}
  if(input.expectedCost!==undefined&&(!Number.isSafeInteger(input.expectedCost)||input.expectedCost<0))fail('invalid-cost');
  return db.runTransaction(async tx=>{
   const ref=db.doc('users/'+user.uid),iconRef=db.doc('profileIcons/'+input.iconId);
   const [profile,document]=await tx.getAll(ref,iconRef);if(!profile.exists)fail('missing-user');
   const raw=profile.data();if(raw.isBlocked!==false)fail('profile-review-required');
   if(!Number.isSafeInteger(raw.stars)||raw.stars<0||!Array.isArray(raw.unlockedIcons)||raw.unlockedIcons.some(x=>typeof x!=='string'))fail('economy-review-required');
   if(raw.unlockedIcons.includes(input.iconId))return {stars:raw.stars,unlockedIcons:raw.unlockedIcons,redeemed:false};
   const icon=document.exists?document.data():builtinIcon(input.iconId);if(!icon||icon.visible===false||icon.archived===true)fail('unavailable-icon');
   if(!Number.isSafeInteger(icon.cost)||icon.cost<0)fail('invalid-cost');
   if(input.expectedCost!==undefined&&input.expectedCost!==icon.cost)fail('price-changed');
   if(raw.stars<icon.cost)fail('not-enough-stars');
   const result={stars:raw.stars-icon.cost,unlockedIcons:[...raw.unlockedIcons,input.iconId],redeemed:true};
   tx.set(ref,{...raw,stars:result.stars,unlockedIcons:result.unlockedIcons,updatedAt:clock()});return result;
  });
 }};
}

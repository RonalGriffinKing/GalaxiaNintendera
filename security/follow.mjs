import {safePublicLabel} from './public-profile.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code})};
const count=value=>{if(value===undefined)return 0;if(!Number.isSafeInteger(value)||value<0)fail('profile-review-required');return value};
export function createFollowService({db,auth,clock=Date.now}){
 return {async execute(token,input){
  if(!input||Object.getPrototypeOf(input)!==Object.prototype||Object.keys(input).some(k=>!['uid','following'].includes(k))||typeof input.uid!=='string'||!/^[-a-zA-Z0-9_]{1,128}$/.test(input.uid)||typeof input.following!=='boolean')fail('invalid-follow');
  let user,target;try{const claims=await auth.verifyIdToken(token,true);user=await auth.getUser(claims.uid);target=await auth.getUser(input.uid);if(user.uid!==claims.uid||user.disabled||!user.emailVerified||target.disabled||!target.emailVerified)fail('authentication-denied');}catch{fail('authentication-denied');}if(user.uid===input.uid)fail('invalid-follow');
  const own=db.doc('users/'+user.uid),other=db.doc('users/'+input.uid),following=db.doc('users/'+user.uid+'/following/'+input.uid),follower=db.doc('users/'+input.uid+'/followers/'+user.uid),notice=db.doc('users/'+input.uid+'/notifications/follow_'+user.uid);
  return db.runTransaction(async tx=>{const [a,b,oldFollowing,oldFollower,oldNotice]=await tx.getAll(own,other,following,follower,notice);if(!a.exists||!b.exists||a.data().isBlocked!==false||b.data().isBlocked!==false)fail('profile-review-required');
   const deltaOwn=Number(input.following)-Number(oldFollowing.exists),deltaOther=Number(input.following)-Number(oldFollower.exists),ownCount=count(a.data().followingCount)+deltaOwn,otherCount=count(b.data().followersCount)+deltaOther;if(ownCount<0||otherCount<0)fail('profile-review-required');
   if(input.following){tx.set(following,{userId:input.uid,name:safePublicLabel(b.data().name,120)||'Usuario de Galaxia',followedAt:oldFollowing.data()?.followedAt??clock()});tx.set(follower,{userId:user.uid,name:safePublicLabel(a.data().name,120)||'Usuario de Galaxia',followedAt:oldFollower.data()?.followedAt??clock()});}else{tx.delete(following);tx.delete(follower);}
   if(deltaOwn)tx.set(own,{...a.data(),followingCount:ownCount,updatedAt:clock()});if(deltaOther)tx.set(other,{...b.data(),followersCount:otherCount,updatedAt:clock()});
   if(input.following&&deltaOther>0&&clock()-(oldNotice.data()?.createdAt??-60000)>=60000){const actorName=safePublicLabel(a.data().name,120)||'Usuario de Galaxia';tx.set(notice,{type:'new-follower',title:'Nuevo seguidor',message:actorName+' empezo a seguirte.',actorId:user.uid,actorName,targetId:user.uid,targetType:'profile',read:false,createdAt:clock()});}
   return {following:input.following,followersCount:otherCount,followingCount:ownCount};
  });
 }};
}

import { doc, runTransaction } from 'firebase/firestore'
import { auth, db } from '@/firebase'
export async function changeCommunityMembership(community, join, profile={}) {
  const user=auth.currentUser
  if(!user || !community?.id)throw Error('authentication-required')
  return runTransaction(db,async tx=>{
    const communityRef=doc(db,'communities',community.id)
    const memberRef=doc(db,'communities',community.id,'members',user.uid)
    const userRef=doc(db,'users',user.uid,'communities',community.id)
    const saved=await tx.get(communityRef),member=await tx.get(memberRef)
    if(!saved.exists() || community.id==='galaxia-oficial' || saved.data().lockedMembership)throw Error('locked-community')
    const now=Date.now()
    if(join){
      tx.set(memberRef,{userId:user.uid,name:profile.name||user.displayName||'Usuario',imageUrl:profile.imageUrl||user.photoURL||'',joinedAt:now})
      tx.set(userRef,{communityId:community.id,name:saved.data().name||'',description:saved.data().description||'',bannerUrl:saved.data().bannerUrl||'',iconUrl:saved.data().iconUrl||'',role:'Miembro',joinedAt:now,updatedAt:now})
    }else{tx.delete(memberRef);tx.delete(userRef)}
    if(join!==member.exists())tx.update(communityRef,{membersCount:Math.max(0,Number(saved.data().membersCount||0)+(join?1:-1)),updatedAt:now})
  })
}

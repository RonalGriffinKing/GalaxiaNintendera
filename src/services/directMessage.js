import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase'
export async function sendDirectMessage(other, {body='',gif=null,name='Usuario',otherName='Usuario'}={}) {
  const user=auth.currentUser
  if(!user || !other || other===user.uid)throw Error('invalid-participants')
  const chatId=[user.uid,other].sort().join('_'),parent=doc(db,'directChats',chatId)
  const message=doc(collection(db,'directChats',chatId,'messages'))
    const batch=writeBatch(db)
    const timestamp=serverTimestamp()
    batch.set(message,{body,gif,authorId:user.uid,authorName:name,author:name,createdAt:timestamp,readBy:{[user.uid]:true},seenAt:{[user.uid]:timestamp}})
    batch.set(parent,{participants:[user.uid,other].sort(),participantNames:{[user.uid]:name,[other]:otherName},lastMessage:body||'GIF',lastMessagePreview:body||'GIF',lastMessageId:message.id,lastMessageAuthorId:user.uid,updatedAt:timestamp,lastReadBy:{[user.uid]:message.id},deletedFor:{[user.uid]:false,[other]:false}},{merge:true})
    await batch.commit()
  return message.id
}
export async function sendLiveChatMessage(live, {body,name='Usuario',imageUrl=''}={}) {
  const user=auth.currentUser
  if(!user)throw Error('authentication-required')
  const parent=doc(db,'liveChats',live),message=doc(collection(db,'liveChats',live,'messages'))
    const batch=writeBatch(db)
    const timestamp=serverTimestamp()
    batch.set(message,{body,authorId:user.uid,author:name,authorImage:imageUrl,createdAt:timestamp})
    batch.set(parent,{lastMessageId:message.id,lastMessagePreview:body,lastMessageAuthorId:user.uid,updatedAt:timestamp},{merge:true})
    return batch.commit()
}

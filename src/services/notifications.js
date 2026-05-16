import {
  collection,
  doc,
  getDocs,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/firebase'

const now = () => Date.now()

export const createUserNotification = async (userId, payload) => {
  if (!userId) return

  const notificationRef = doc(collection(db, 'users', userId, 'notifications'))
  const batch = writeBatch(db)

  batch.set(notificationRef, {
    ...payload,
    read: false,
    createdAt: now()
  })

  await batch.commit()
}

export const notifyThreadLike = async ({ thread, actor }) => {
  if (!thread?.authorId || !actor?.uid || thread.authorId === actor.uid) return

  await createUserNotification(thread.authorId, {
    type: 'thread-like',
    title: 'Nuevo like en tu hilo',
    message: `${actor.name} le dio like a "${thread.title || 'tu hilo'}".`,
    actorId: actor.uid,
    actorName: actor.name,
    targetId: thread.id,
    targetType: 'thread'
  })
}

export const notifyThreadReply = async ({ thread, actor, comment }) => {
  if (!thread?.authorId || !actor?.uid || thread.authorId === actor.uid) return

  await createUserNotification(thread.authorId, {
    type: 'thread-reply',
    title: 'Nueva respuesta en tu hilo',
    message: `${actor.name} respondio: "${comment.body}".`,
    actorId: actor.uid,
    actorName: actor.name,
    targetId: thread.id,
    targetType: 'thread'
  })
}

export const notifyNewFollower = async ({ targetUserId, actor }) => {
  if (!targetUserId || !actor?.uid || targetUserId === actor.uid) return

  await createUserNotification(targetUserId, {
    type: 'new-follower',
    title: 'Nuevo seguidor',
    message: `${actor.name} empezo a seguirte.`,
    actorId: actor.uid,
    actorName: actor.name,
    targetId: actor.uid,
    targetType: 'profile'
  })
}

export const notifyNewPost = async (post) => {
  if (!post?.id) return { notified: 0, queuedEmails: 0 }
  if (post.placement === 'hero' || post.isMainEntry) return { notified: 0, queuedEmails: 0 }

  const usersSnap = await getDocs(collection(db, 'users'))
  const batches = []
  let batch = writeBatch(db)
  let operations = 0
  let notified = 0
  let queuedEmails = 0

  const commitIfNeeded = () => {
    if (operations < 450) return
    batches.push(batch.commit())
    batch = writeBatch(db)
    operations = 0
  }

  usersSnap.docs.forEach((userDoc) => {
    const user = userDoc.data()
    const notificationRef = doc(collection(db, 'users', userDoc.id, 'notifications'))

    batch.set(notificationRef, {
      type: 'new-post',
      title: 'Nuevo post publicado',
      message: post.title || 'Hay una nueva publicacion en la Galaxia.',
      targetId: post.id,
      targetType: 'post',
      read: false,
      createdAt: now()
    })
    operations += 1
    notified += 1
    commitIfNeeded()

    if (user.email && user.emailOptIn !== false) {
      const mailRef = doc(collection(db, 'mailQueue'))

      batch.set(mailRef, {
        to: user.email,
        userId: userDoc.id,
        type: 'new-post',
        status: 'pending',
        postId: post.id,
        postTitle: post.title || 'Nuevo post',
        postUrl: `/post/${post.id}`,
        createdAt: now()
      })
      operations += 1
      queuedEmails += 1
      commitIfNeeded()
    }
  })

  if (operations > 0) {
    batches.push(batch.commit())
  }

  await Promise.all(batches)
  return { notified, queuedEmails }
}

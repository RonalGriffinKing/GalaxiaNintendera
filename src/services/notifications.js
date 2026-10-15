import {profileRequest} from './profiles'
// Notifications are derived from committed interactions by the server, never arbitrary client recipients.
export const notifyThreadLike=async({thread})=>profileRequest('notify-interaction',{type:'thread-like',threadId:thread.id})
export const notifyThreadReply=async({thread,comment})=>profileRequest('notify-interaction',{type:'thread-reply',threadId:thread.id,commentId:comment.id})

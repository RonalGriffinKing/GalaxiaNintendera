import identities from '../../security/authorized-identities.json' with {type:'json'}
export function authorizedRole(uid, blocked = false) {
  if (identities.adminUids.includes(uid)) return 'admin'
  if (!uid || blocked) return 'user'
  return identities.publisherUids.includes(uid) ? 'publisher' : 'user'
}
export const isAuthorizedAdmin = uid => Boolean(uid && identities.adminUids.includes(uid))

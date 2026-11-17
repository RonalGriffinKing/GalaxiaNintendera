const allowedActions = new Set(['grant-publisher', 'revoke-publisher'])

export function createRoleManagementService(db, primaryAdminUid, now = Date.now) {
  return async (actorUid, body) => {
    if (!primaryAdminUid || actorUid !== primaryAdminUid) throw new Error('forbidden')
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some(key => !['action','targetUid'].includes(key))
      || !allowedActions.has(body.action) || typeof body.targetUid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(body.targetUid)) throw new Error('invalid-request')
    if (body.targetUid === primaryAdminUid) throw new Error('invalid-target')
    const actorRef = db.doc(`users/${actorUid}`)
    const targetRef = db.doc(`users/${body.targetUid}`)
    const auditRef = db.collection('roleAudit').doc()
    return db.runTransaction(async tx => {
      const [actor, target] = await Promise.all([tx.get(actorRef), tx.get(targetRef)])
      if (!actor.exists || actor.data().role !== 'admin' || actor.data().isBlocked === true || !target.exists) throw new Error('forbidden')
      const previousRole = target.data().role || 'user'
      const nextRole = body.action === 'grant-publisher' ? 'publisher' : 'user'
      if (body.action === 'grant-publisher' && (target.data().isBlocked === true || previousRole !== 'user')) throw new Error('invalid-transition')
      if (body.action === 'revoke-publisher' && previousRole !== 'publisher') throw new Error('invalid-transition')
      tx.update(targetRef, { role: nextRole, updatedAt: now() })
      tx.create(auditRef, { actorUid, targetUid: body.targetUid, action: body.action, previousRole, nextRole, createdAt: now() })
      return { changed: true, role: nextRole }
    })
  }
}

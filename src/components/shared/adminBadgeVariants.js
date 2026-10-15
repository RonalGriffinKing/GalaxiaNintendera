export const badgeVariants = ['success', 'warning', 'danger', 'info', 'neutral', 'pending', 'brand']
const posts = new Map([['draft', 'neutral'], ['pending', 'pending'], ['approved', 'success'], ['rejected', 'danger']])
const roles = new Map([['admin', 'brand'], ['publisher', 'success'], ['user', 'info']])
export const postBadgeVariant = status => posts.get(status) || 'neutral'
export const roleBadgeVariant = role => roles.get(role) || 'neutral'

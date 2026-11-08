// Friendly community URLs are derived from public names, without changing IDs in Firestore.
export function communitySlug(value = '') {
 return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 140)
}
export function communityPath(community, directory = []) {
 if (!community?.id) return '/comunidades'
 const base = communitySlug(community.name) || communitySlug(community.id)
 const duplicates = directory.filter(item => communitySlug(item.name) === base)
 const slug = duplicates.length > 1 ? `${base}-${communitySlug(community.id)}` : base
 return `/comunidad/${slug}`
}
export function resolveCommunityRoute(directory, { slug, id } = {}) {
 if (id) return directory.find(item => item.id === id) || null
 if (!slug) return directory.find(item => item.isOfficial || item.id === 'galaxia-oficial') || directory[0] || null
 const exact = directory.filter(item => communityPath(item, directory) === `/comunidad/${slug}`)
 return exact.length === 1 ? exact[0] : null
}

// Old bookmarks enter the same management workspace as current navigation.
export function managementDestination(panel = 'posts', query = {}) {
 const { section, ...rest } = query
 const view = panel === 'posts' && ['pages', 'themes'].includes(section) ? section : panel
 if (view === 'posts' && ['post', 'post-json', 'hero'].includes(rest.create)) {
  const { create, view: ignoredView, ...editorQuery } = rest
  return { name: 'post-create', query: { ...editorQuery, ...(create === 'post-json' ? { json: '1' } : create === 'hero' ? { mode: 'hero' } : {}) } }
 }
 return { path: '/admin/dashboard', query: { ...rest, view } }
}

const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
export function renamedCategoryFields(post, oldName, newName) {
 const matches = value => key(value) === key(oldName)
 const patch = {}
 if (matches(post.category)) patch.category = newName
 if (Array.isArray(post.categories) && post.categories.some(matches)) {
  const seen = new Set()
  patch.categories = post.categories.map(value => matches(value) ? newName : value).filter(value => {
   const normalized = key(value)
   if (seen.has(normalized)) return false
   seen.add(normalized)
   return true
  })
 }
 return patch
}

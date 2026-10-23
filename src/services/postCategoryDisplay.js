export function compactPostCategory(post={}) {
 const title=String(post.title||'').trim().toLocaleLowerCase()
 const values=[...(Array.isArray(post.categories)?post.categories:[]),post.category]
 return values.find(value=>typeof value==='string'&&value.trim()&&value.trim().length<=48&&value.trim().toLocaleLowerCase()!==title)?.trim()||'Noticias'
}

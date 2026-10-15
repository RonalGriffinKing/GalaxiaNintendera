// DTO adaptation preserves the minimal interface consumed by existing Vue pages.
// These are NOT Firebase DocumentSnapshot instances; cursor values are explicit public DTO data.
export function createEditorialQueries(reader){
 const wrap=row=>row?{id:row.id,exists:()=>true,data:()=>row.data,editorialCursor:row.cursor}:{id:'',exists:()=>false,data:()=>undefined};
 const page=async({after,...options}={})=>{const result=await reader.read('page',{...options,...(after?{after:after.editorialCursor}: {})});return {docs:result.rows.map(wrap)};};
 return {page,article:async value=>wrap(await reader.read('article',{value})),search:()=>page({size:100}),related:category=>page({category,size:4}),categories:async()=>{const data=await reader.read('categories',{});return {exists:()=>data!==null,data:()=>data};}};
}

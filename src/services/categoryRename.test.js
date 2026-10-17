import { expect, it } from 'vitest'
import { renamedCategoryFields } from './categoryRename'
it('renames primary and secondary categories without changing unrelated fields', () => {
 expect(renamedCategoryFields({category:'Zelda',categories:['Noticias','Zelda']},'Zelda','Hyrule')).toEqual({category:'Hyrule',categories:['Noticias','Hyrule']})
 expect(renamedCategoryFields({category:'Noticias',categories:['Noticias']},'Zelda','Hyrule')).toEqual({})
})
it('handles accents, legacy primary-only posts and duplicate labels', () => {
 expect(renamedCategoryFields({category:'Análisis'},'Analisis','Reseñas')).toEqual({category:'Reseñas'})
 expect(renamedCategoryFields({categories:['Zelda','Hyrule']},'Zelda','Hyrule')).toEqual({categories:['Hyrule']})
})

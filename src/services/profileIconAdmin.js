// Imported only by the Global Manager, never by the public profile.
import { progressRequest } from './progressClient'
export const saveCatalogIcon = (draft, creating = false) => progressRequest(creating ? 'create-icon' : 'update-icon', draft)
export const deleteCatalogIcon = iconId => progressRequest('delete-icon', { iconId })
export const saveProfileAchievements = items => progressRequest('save-achievements', { items })
export async function uploadCatalogImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 512 * 1024) throw new Error('Usa PNG, JPG, WEBP o GIF de hasta 512 KB.')
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })
  return progressRequest('upload-icon-image', { contentType: file.type, data })
}

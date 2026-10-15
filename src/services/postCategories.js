import { doc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import {editorialQueries,manageEditorial} from "@/services/editorial";

export const DEFAULT_POST_CATEGORIES = [
  'Nintendo Switch',
  'Super Mario',
  'Zelda',
  'Pokemon',
  'Rumores',
  'Analisis',
  'Guias'
]

const SETTINGS_REF = doc(db, 'siteSettings', 'postCategories')

export const normalizeCategory = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

export const uniqueCategories = (items = []) => {
  const seen = new Set()
  return items
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .filter(item => {
      const key = normalizeCategory(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const categoryIcon = (category) => {
  const value = normalizeCategory(category)
  if (value.includes('pokemon')) return 'fas fa-circle'
  if (value.includes('mario')) return 'fas fa-star'
  if (value.includes('zelda')) return 'fas fa-magic'
  if (value.includes('rumor')) return 'fas fa-question'
  if (value.includes('analisis')) return 'fas fa-star-half-stroke'
  if (value.includes('guia')) return 'fas fa-book-open'
  if (value.includes('nintendo')) return 'fas fa-gamepad'
  return 'fas fa-tag'
}

export const postCategoryLabels = (post = {}) => {
  const fromArray = Array.isArray(post.categories) ? post.categories : []
  return uniqueCategories([...fromArray, post.category || ''])
}

export const postMatchesCategory = (post = {}, wanted) => {
  const target = normalizeCategory(wanted)
  if (!target || target === 'todas') return true
  return postCategoryLabels(post).some(category => {
    const actual = normalizeCategory(category)
    if (actual === target) return true
    if (target.includes('mario') && actual.includes('mario')) return true
    if (target.includes('pokemon') && actual.includes('pokemon')) return true
    if (target.includes('guia') && actual.includes('guia')) return true
    if (target.includes('analisis') && actual.includes('analisis')) return true
    if (target.includes('rumor') && actual.includes('rumor')) return true
    if (target.includes('nintendo switch') && actual.includes('nintendo')) return true
    return false
  })
}

export const loadPostCategories = async () => {
  {const snap=await editorialQueries.categories();return snap.exists()?snap.data().items:DEFAULT_POST_CATEGORIES}
  
}

export const savePostCategories = async (items = []) => {
  const categories = uniqueCategories(items)
  {await manageEditorial(auth.currentUser,{action:'categories',requestId:crypto.randomUUID(),data:{items:categories}});return categories}
  
}

import { computed, ref, unref, watch } from 'vue'

const DEFAULT_PAGE_SIZE = 20

export const buildPageTokens = (currentPage, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages = new Set([1, totalPages])
  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page > 1 && page < totalPages) pages.add(page)
  }

  const ordered = [...pages].sort((a, b) => a - b)
  return ordered.flatMap((page, index) => {
    const previous = ordered[index - 1]
    if (index > 0 && page - previous > 1) return ['ellipsis', page]
    return [page]
  })
}

export const useListNavigation = (items, options = {}) => {
  const currentPage = ref(1)
  const pageSize = ref(Number(options.initialPageSize || DEFAULT_PAGE_SIZE))

  const allItems = computed(() => unref(items) || [])
  const totalItems = computed(() => allItems.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
  const startIndex = computed(() => (currentPage.value - 1) * pageSize.value)
  const endIndex = computed(() => Math.min(startIndex.value + pageSize.value, totalItems.value))
  const pageItems = computed(() => allItems.value.slice(startIndex.value, endIndex.value))
  const pageTokens = computed(() => buildPageTokens(currentPage.value, totalPages.value))

  const setPage = (page) => {
    currentPage.value = Math.min(Math.max(1, Number(page) || 1), totalPages.value)
  }

  const resetPage = () => {
    currentPage.value = 1
  }

  watch(pageSize, resetPage)
  watch(totalPages, (pages) => {
    if (currentPage.value > pages) currentPage.value = pages
  })

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    startItem: computed(() => totalItems.value ? startIndex.value + 1 : 0),
    endItem: endIndex,
    pageItems,
    pageTokens,
    setPage,
    resetPage
  }
}

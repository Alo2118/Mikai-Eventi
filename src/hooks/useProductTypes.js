import { useEffect, useMemo } from 'react'
import { useAdminStore } from './useAdmin'
import { TIPO_PRODOTTO_ICONS } from '../lib/icons'

// Default icon fallback for codici not in TIPO_PRODOTTO_ICONS
const DEFAULT_ICON = 'package'

/**
 * Hook that loads product types and provides label/color/icon maps.
 * Replaces hardcoded TIPO_PRODOTTO / TIPO_PRODOTTO_COLORE constants.
 */
export function useProductTypes() {
  const productTypes = useAdminStore(s => s.productTypes)
  const fetchProductTypes = useAdminStore(s => s.fetchProductTypes)

  useEffect(() => {
    if (productTypes.length === 0) fetchProductTypes()
  }, [])

  const maps = useMemo(() => {
    const labels = {}
    const colors = {}
    const icons = {}
    for (const pt of productTypes) {
      labels[pt.codice] = pt.nome
      colors[pt.codice] = pt.colore
      icons[pt.codice] = TIPO_PRODOTTO_ICONS[pt.codice] || null
    }
    return { labels, colors, icons }
  }, [productTypes])

  return {
    productTypes,
    labels: maps.labels,
    colors: maps.colors,
    icons: maps.icons,
  }
}

/**
 * Build label/color maps from productTypes array (for non-hook contexts).
 */
export function buildProductTypeMaps(productTypes) {
  const labels = {}
  const colors = {}
  for (const pt of productTypes) {
    labels[pt.codice] = pt.nome
    colors[pt.codice] = pt.colore
  }
  return { labels, colors }
}

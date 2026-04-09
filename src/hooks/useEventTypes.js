import { useEffect, useMemo } from 'react'
import { useAdminStore } from './useAdmin'
import { TIPO_EVENTO_ICONS, ICON_BY_NAME } from '../lib/icons'

/**
 * Hook that loads event types and provides label/color/icon maps.
 * Replaces hardcoded TIPO_EVENTO constants.
 */
export function useEventTypes() {
  const eventTypes = useAdminStore(s => s.eventTypes)
  const fetchEventTypes = useAdminStore(s => s.fetchEventTypes)

  useEffect(() => {
    if (eventTypes.length === 0) fetchEventTypes()
  }, [])

  const maps = useMemo(() => {
    const labels = {}
    const colors = {}
    const icons = {}
    const chartColors = {}
    const COLOR_TO_HEX = {
      mikai: '#3296dc', blue: '#3b82f6', purple: '#8b5cf6', yellow: '#f59e0b',
      emerald: '#10b981', red: '#ef4444', green: '#22c55e', orange: '#f97316',
      amber: '#f59e0b', gray: '#6b7280', pink: '#ec4899',
    }
    for (const et of eventTypes) {
      labels[et.codice] = et.nome
      colors[et.codice] = et.colore
      icons[et.codice] = ICON_BY_NAME[et.icona] || TIPO_EVENTO_ICONS[et.codice] || null
      chartColors[et.codice] = COLOR_TO_HEX[et.colore] || '#6b7280'
    }
    return { labels, colors, icons, chartColors }
  }, [eventTypes])

  return {
    eventTypes,
    labels: maps.labels,
    colors: maps.colors,
    icons: maps.icons,
    chartColors: maps.chartColors,
  }
}

/**
 * Build label/color maps from eventTypes array (for non-hook contexts).
 */
export function buildEventTypeMaps(eventTypes) {
  const labels = {}
  const colors = {}
  for (const et of eventTypes) {
    labels[et.codice] = et.nome
    colors[et.codice] = et.colore
  }
  return { labels, colors }
}

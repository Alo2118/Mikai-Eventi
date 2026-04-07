import { daysBetween, isOnOrBefore } from './date-utils'

/**
 * Pure function that computes material utilization metrics from raw data.
 * Extracted from useMaterials store for maintainability.
 */
export function computeMaterialMetrics(usageData, movementsData, fuoriData) {
  // Frequency by material_id (consistent key for all maps)
  const frequency = {}
  for (const u of usageData) {
    const key = u.material_id || u.product_id || 'unknown'
    frequency[key] = (frequency[key] || 0) + 1
  }

  // Group movements by material_id
  const usciteByMat = {}
  const rientriByMat = {}
  for (const m of movementsData) {
    if (!m.material_id || !m.data_movimento) continue
    if (m.tipo === 'uscita') {
      if (!usciteByMat[m.material_id]) usciteByMat[m.material_id] = []
      usciteByMat[m.material_id].push(m)
    } else if (m.tipo === 'rientro') {
      if (!rientriByMat[m.material_id]) rientriByMat[m.material_id] = []
      rientriByMat[m.material_id].push(m)
    }
  }

  // Per-material avgDaysOut and onTimeRate
  const avgDaysOut = {}
  const onTimeRateByMat = {}
  let totalOnTime = 0
  let totalWithDeadline = 0

  for (const matId of Object.keys(usciteByMat)) {
    const uscite = usciteByMat[matId] || []
    const rientri = rientriByMat[matId] || []
    const durations = []
    let matOnTime = 0
    let matWithDeadline = 0

    for (let i = 0; i < uscite.length; i++) {
      const uscita = uscite[i]
      const rientro = rientri[i]
      if (rientro?.data_movimento) {
        const days = Math.max(0, daysBetween(rientro.data_movimento, uscita.data_movimento))
        durations.push(days)
        if (uscita.data_rientro_prevista) {
          matWithDeadline++
          totalWithDeadline++
          if (isOnOrBefore(rientro.data_movimento, uscita.data_rientro_prevista)) {
            matOnTime++
            totalOnTime++
          }
        }
      }
    }

    if (durations.length > 0) {
      avgDaysOut[matId] = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    }
    if (matWithDeadline > 0) {
      onTimeRateByMat[matId] = Math.round((matOnTime / matWithDeadline) * 100)
    }
  }

  const onTimeRate = totalWithDeadline > 0
    ? Math.round((totalOnTime / totalWithDeadline) * 100)
    : null

  const topUsed = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }))

  return {
    frequency,
    avgDaysOut,
    onTimeRate,
    onTimeRateByMat,
    fuori: fuoriData,
    topUsed,
    totalUsages: usageData.length,
    totalMovements: movementsData.length,
  }
}

import { useMemo } from 'react'
import { Icon } from '../ui/Icon'
import { LOGISTICA_PERSONE_ICONS } from '../../lib/icons'
import { CARD_STYLE, BADGE_BASE, COLOR_BADGE } from '../../lib/constants'
import { formatCurrency } from '../../lib/format-utils'

// Riepilogo catering aggregato: conta le esigenze alimentari PER-EVENTO
// (es. "3 vegetariani, 1 celiaco"), le esigenze di accessibilità e il costo
// pasti totale. Serve a chi organizza il vitto per avere il quadro in un colpo.
export function CateringSummary({ people }) {
  const { alimentari, accessibilitaCount, costoTotale } = useMemo(() => {
    const gruppi = new Map()
    let accessibilitaCount = 0
    let costoTotale = 0
    for (const p of people) {
      const alim = (p.esigenze_alimentari || '').trim()
      if (alim) {
        const chiave = alim.toLowerCase()
        const esistente = gruppi.get(chiave)
        if (esistente) esistente.count += 1
        else gruppi.set(chiave, { label: alim, count: 1 })
      }
      if ((p.esigenze_accessibilita || '').trim()) accessibilitaCount += 1
      if (p.costo_pasti != null) costoTotale += Number(p.costo_pasti) || 0
    }
    const alimentari = [...gruppi.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'it'))
    return { alimentari, accessibilitaCount, costoTotale }
  }, [people])

  if (alimentari.length === 0 && accessibilitaCount === 0 && costoTotale === 0) return null

  return (
    <div className={CARD_STYLE + ' space-y-3'}>
      <div className="flex items-center gap-2">
        <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={18} className="text-gray-400" />
        <h3 className="font-semibold text-lg">Riepilogo catering</h3>
      </div>
      {alimentari.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alimentari.map(a => (
            <span key={a.label} className={BADGE_BASE + ' ' + COLOR_BADGE.orange}>
              {a.count} {a.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        {accessibilitaCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_accessibilita} size={16} className="text-blue-400" />
            {accessibilitaCount} {accessibilitaCount === 1 ? 'persona con esigenze di accessibilità' : 'persone con esigenze di accessibilità'}
          </span>
        )}
        {costoTotale > 0 && (
          <span className="inline-flex items-center gap-1.5 ml-auto font-medium text-gray-700">
            Costo pasti totale: {formatCurrency(costoTotale)}
          </span>
        )}
      </div>
    </div>
  )
}

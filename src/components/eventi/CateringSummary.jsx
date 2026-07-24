import { useMemo } from 'react'
import { Icon } from '../ui/Icon'
import { LOGISTICA_PERSONE_ICONS } from '../../lib/icons'
import { CARD_STYLE, BADGE_BASE, COLOR_BADGE } from '../../lib/constants'
import { formatCurrency } from '../../lib/format-utils'

// Riepilogo catering aggregato: conta le esigenze alimentari PER-EVENTO
// (es. "3 vegetariani, 1 celiaco"), le esigenze di accessibilità e il costo
// pasti totale. Serve a chi organizza il vitto per avere il quadro in un colpo.
export function CateringSummary({ people }) {
  const { alimentari, accessibilita, costoTotale } = useMemo(() => {
    const gruppiAlim = new Map()
    const gruppiAcc = new Map()
    let costoTotale = 0
    const conta = (mappa, testo) => {
      const chiave = testo.toLowerCase()
      const esistente = mappa.get(chiave)
      if (esistente) esistente.count += 1
      else mappa.set(chiave, { label: testo, count: 1 })
    }
    for (const p of people) {
      const alim = (p.esigenze_alimentari || '').trim()
      if (alim) conta(gruppiAlim, alim)
      const acc = (p.esigenze_accessibilita || '').trim()
      if (acc) conta(gruppiAcc, acc)
      if (p.costo_pasti != null) costoTotale += Number(p.costo_pasti) || 0
    }
    const perCount = (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'it')
    return {
      alimentari: [...gruppiAlim.values()].sort(perCount),
      accessibilita: [...gruppiAcc.values()].sort(perCount),
      costoTotale,
    }
  }, [people])

  if (alimentari.length === 0 && accessibilita.length === 0 && costoTotale === 0) return null

  return (
    <div className={CARD_STYLE + ' space-y-3'}>
      <div className="flex items-center gap-2">
        <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={18} className="text-gray-400" />
        <h3 className="font-semibold text-lg">Riepilogo catering</h3>
      </div>
      {alimentari.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alimentari.map(a => (
            <span key={a.label} className={BADGE_BASE + ' ' + COLOR_BADGE.red}>
              {a.count} {a.label}
            </span>
          ))}
        </div>
      )}
      {accessibilita.length > 0 && (
        <div className="flex items-start gap-1.5 text-sm text-gray-600">
          <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_accessibilita} size={16} className="text-blue-400 mt-0.5" />
          <span>Accessibilità: {accessibilita.map(a => `${a.count} ${a.label}`).join(', ')}</span>
        </div>
      )}
      {costoTotale > 0 && (
        <div className="text-sm font-medium text-gray-700">
          Costo pasti totale: {formatCurrency(costoTotale)}
        </div>
      )}
    </div>
  )
}

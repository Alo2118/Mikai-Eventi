import { CARD_STYLE, COSTO_CATEGORIA, COSTO_CATEGORIA_COLORE, COLOR_TEXT_600, COLOR_BG_400 } from '../../lib/constants'
import { COST_CATEGORY_ORDER } from '../../lib/cost-breakdown'
import { formatCurrency, formatPercentage } from '../../lib/format-utils'
import { computeScostamento } from '../../hooks/useConsuntivo'

/**
 * Budget bar (Previsto vs Totale costi effettivi) + ripartizione per categoria.
 * `breakdown` = { categorie, totale } da computeCostBreakdown.
 * Le categorie ospitalità/trasporti sono nascoste se il tipo evento non le prevede.
 */
export function CostiRiepilogo({ budgetPrevisto = 0, breakdown, hotelTracked = true, trasportiTracked = true }) {
  const totale = breakdown?.totale || 0
  const categorie = breakdown?.categorie || {}
  const maxBudget = Math.max(budgetPrevisto, totale, 1)
  const hasCosti = totale > 0

  const { scostamento, scostamentoPct, semaforo } = computeScostamento({
    budget: budgetPrevisto,
    approvato: totale,
    effettivo: totale,
    hasEffettivo: hasCosti,
  })

  const visibleRows = COST_CATEGORY_ORDER.filter(key => {
    if (key === 'ospitalita' && !hotelTracked) return false
    if (key === 'trasporti' && !trasportiTracked) return false
    return true
  })

  return (
    <div className={CARD_STYLE}>
      <h3 className="font-semibold text-lg">Budget effettivo</h3>

      {/* Barra Previsto vs Totale costi */}
      <div className="space-y-2 mt-2">
        <div className="flex justify-between text-sm">
          <span>Budget previsto</span>
          <span className="font-medium">{budgetPrevisto > 0 ? formatCurrency(budgetPrevisto) : '—'}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-mikai-400 rounded-full" style={{ width: `${Math.min((budgetPrevisto / maxBudget) * 100, 100)}%` }} />
        </div>
        <div className="flex justify-between text-sm">
          <span>Totale costi</span>
          <span className={`font-medium ${budgetPrevisto > 0 && totale > budgetPrevisto ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(totale)}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${budgetPrevisto > 0 && totale > budgetPrevisto ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${Math.min((totale / maxBudget) * 100, 100)}%` }} />
        </div>
      </div>

      {/* Ripartizione per categoria */}
      <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
        {visibleRows.map(key => (
          <div key={key} className="flex items-center justify-between py-1.5 text-sm">
            <span className="inline-flex items-center gap-2 text-gray-700">
              <span className={`w-2.5 h-2.5 rounded-full ${COLOR_BG_400[COSTO_CATEGORIA_COLORE[key]]}`} aria-hidden="true" />
              {COSTO_CATEGORIA[key]}
            </span>
            <span className={categorie[key] > 0 ? 'font-medium' : 'text-gray-400'}>{formatCurrency(categorie[key] || 0)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between py-2 mt-1 border-t border-gray-100 text-base font-semibold">
          <span>Totale</span>
          <span>{formatCurrency(totale)}</span>
        </div>
      </div>

      {/* Scostamento sul budget */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-sm font-medium text-gray-600">Scostamento sul budget</span>
        {!hasCosti ? (
          <span className="text-sm text-gray-400">Nessun costo registrato</span>
        ) : scostamento == null ? (
          <span className="text-sm text-gray-400">Budget previsto non impostato</span>
        ) : (
          <span className={`inline-flex items-center gap-2 text-base font-semibold ${COLOR_TEXT_600[semaforo]}`}>
            <span className={`w-3 h-3 rounded-full ${COLOR_BG_400[semaforo]}`} aria-hidden="true" />
            {scostamento >= 0 ? '+' : ''}{formatCurrency(scostamento)}
            {scostamentoPct != null && <span className="text-gray-400 font-normal">({scostamento >= 0 ? '+' : ''}{formatPercentage(scostamentoPct, 1)})</span>}
          </span>
        )}
      </div>
      {scostamento != null && hasCosti && (
        <p className="text-xs text-gray-400 mt-1">
          Confronto tra il totale dei costi (preventivi approvati, voci manuali, ospitalità e trasporti) e il budget previsto.
        </p>
      )}
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { TIPO_TOV, CARD_STYLE } from '../../lib/constants'
import { COMPLIANCE_ICONS, ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { formatCurrencyDecimals } from '../../lib/format-utils'

// Ponte ospitalità HCP → trasferimenti di valore.
// Mostra le bozze suggerite (hotel/trasporti a carico degli HCP dell'evento).
// L'utente crea una bozza precompilata nel form ToV: nessuna registrazione
// automatica (materia legale). `suggestions` arriva da suggestTovFromEvent.
export function TovSuggestions({ suggestions, loading }) {
  const navigate = useNavigate()

  if (loading) return <LoadingSkeleton lines={2} />
  if (!suggestions || suggestions.length === 0) return null

  const daRegistrare = suggestions.filter(s => !s.giaRegistrato)

  const buildDraftUrl = (s) => {
    const params = new URLSearchParams({
      hcp_id: s.hcp_id,
      evento_id: s.evento_id,
      tipo: s.tipo,
      importo: String(s.importo),
      data_trasferimento: s.data_trasferimento,
      descrizione: s.descrizione,
      giustificazione: s.giustificazione,
      periodo_riferimento: s.periodo_riferimento || '',
    })
    return `/compliance/tov/nuovo?${params.toString()}`
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">Trasferimenti suggeriti</h3>
      {daRegistrare.length > 0 && (
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3" role="alert">
          <Icon icon={FEEDBACK_ICONS.warning} size={18} className="text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-yellow-800">
            {daRegistrare.length === 1
              ? "C'è 1 voce di ospitalità/viaggio di un HCP non ancora registrata come trasferimento di valore."
              : `Ci sono ${daRegistrare.length} voci di ospitalità/viaggio di HCP non ancora registrate come trasferimenti di valore.`}
          </p>
        </div>
      )}
      <div className="space-y-3">
        {suggestions.map(s => (
          <div key={s.key} className={CARD_STYLE}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm truncate">{s.hcp_nome || 'HCP'}</span>
                  {s.giaRegistrato ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                      <Icon icon={COMPLIANCE_ICONS.verificato} size={13} /> Registrato
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5">Da registrare</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {TIPO_TOV[s.tipo]} — {formatCurrencyDecimals(s.importo)}{s.hcp_azienda ? ` — ${s.hcp_azienda}` : ''}
                </p>
                {!s.consenso_privacy && (
                  <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                    <Icon icon={FEEDBACK_ICONS.warning} size={13} className="shrink-0" />
                    Senza consenso privacy: pubblicabile solo in forma aggregata.
                  </p>
                )}
              </div>
              {!s.giaRegistrato && (
                <Button variant="secondary" onClick={() => navigate(buildDraftUrl(s))} className="flex-shrink-0">
                  <Icon icon={ACTION_ICONS.add} size={16} />
                  <span className="ml-1">Crea bozza</span>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { CARD_STYLE, BADGE_BASE, COLOR_BADGE } from '../../lib/constants'
import { ACTION_ICONS, MAGAZZINO_ICONS, FEEDBACK_ICONS, NAV_ICONS } from '../../lib/icons'
import { ProductThumb } from './ProductThumb'

function severityForDays(days) {
  if (days == null) return 'gray'
  if (days >= 60) return 'red'
  if (days >= 30) return 'yellow'
  return 'green'
}

function KitRow({ material }) {
  const giorni = material.giorni_fuori
  const severity = severityForDays(giorni)
  const giorniLabel = giorni == null ? 'fuori' : giorni === 0 ? 'oggi' : `${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`
  const senzaEvento = !material.evento_collegato
  const dotColor = severity === 'red' ? 'bg-red-500' : severity === 'yellow' ? 'bg-yellow-400' : 'bg-gray-300'

  return (
    <div className="flex items-center gap-3 py-2">
      <ProductThumb product={material} size="xs" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">
          {material.product?.nome || material.nome}
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} aria-hidden="true" />
          <span>da {giorniLabel}</span>
          {material.evento_collegato ? (
            <span className="text-gray-400">· evento {material.evento_collegato.titolo}</span>
          ) : (
            <span className="text-orange-600 font-medium">· senza evento collegato</span>
          )}
          {material.codice_inventario && <span className="text-gray-300">· {material.codice_inventario}</span>}
        </div>
      </div>
    </div>
  )
}

export function AgenteKitCard({ agente, kit_count, giorni_medi, giorni_max, materials, onSollecita, soliciting }) {
  const [expanded, setExpanded] = useState(false)
  const severity = severityForDays(giorni_max)
  const senzaEventoCount = materials.filter(m => !m.evento_collegato).length
  const badgeColor = COLOR_BADGE[severity === 'gray' ? 'gray' : severity] || COLOR_BADGE.gray

  return (
    <div className={CARD_STYLE + ' space-y-3'}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-full bg-mikai-100 text-mikai-700 flex items-center justify-center font-semibold shrink-0">
          {agente?.nome?.[0] || '?'}{agente?.cognome?.[0] || ''}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 truncate">
            {agente?.cognome} {agente?.nome}
          </div>
          <div className="text-sm text-gray-500">
            {agente?.zona && <span>{agente.zona}</span>}
            {agente?.ruolo && <span className="text-gray-400"> · {agente.ruolo}</span>}
          </div>
        </div>
        <span className={`${BADGE_BASE} ${badgeColor}`}>
          {kit_count} {kit_count === 1 ? 'kit' : 'kit'}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
        {giorni_max != null && (
          <span className="inline-flex items-center gap-1">
            <Icon icon={MAGAZZINO_ICONS.imminente} size={14} className="text-gray-400" />
            <span>Max <strong className={severity === 'red' ? 'text-red-600' : severity === 'yellow' ? 'text-yellow-700' : 'text-gray-700'}>{giorni_max}</strong> {giorni_max === 1 ? 'giorno' : 'giorni'}</span>
          </span>
        )}
        {giorni_medi != null && (
          <span className="text-gray-400">media {giorni_medi} {giorni_medi === 1 ? 'giorno' : 'giorni'}</span>
        )}
        {senzaEventoCount > 0 && (
          <span className="inline-flex items-center gap-1 text-orange-600 font-medium">
            <Icon icon={FEEDBACK_ICONS.warning} size={14} />
            {senzaEventoCount} senza evento
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left text-sm font-medium text-mikai-600 hover:text-mikai-700 min-h-[48px] flex items-center gap-1"
        aria-expanded={expanded}
      >
        <Icon icon={expanded ? ACTION_ICONS.chevronUp : ACTION_ICONS.chevronDown} size={16} />
        {expanded ? 'Nascondi dettaglio' : `Mostra ${kit_count} ${kit_count === 1 ? 'kit' : 'kit'}`}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 -mx-4 px-4 -mb-1 pt-1 divide-y divide-gray-100">
          {materials.map(m => <KitRow key={m.id} material={m} />)}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => onSollecita(agente, kit_count, giorni_max)} loading={soliciting} disabled={soliciting}>
          <Icon icon={NAV_ICONS.notifiche} size={16} className="mr-1" />
          Sollecita rientro
        </Button>
        {agente?.id && (
          <Link
            to={`/admin/utenti/${agente.id}`}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 min-h-[48px] inline-flex items-center px-2"
          >
            Profilo agente
          </Link>
        )}
      </div>
    </div>
  )
}

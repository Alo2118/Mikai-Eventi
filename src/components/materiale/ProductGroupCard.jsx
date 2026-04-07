import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { POSIZIONE_MATERIALE, POSIZIONE_ORDER, POSIZIONE_BG, CARD_STYLE } from '../../lib/constants'
import { POSIZIONE_ICONS, TIPO_PRODOTTO_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { toDriveImageUrl } from '../../lib/format-utils'

export function ProductGroupCard({ group }) {
  const [expanded, setExpanded] = useState(false)
  const imgUrl = toDriveImageUrl(group.foto_url)

  return (
    <div className={CARD_STYLE + ' space-y-3'}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 text-left min-h-[48px]"
        aria-expanded={expanded}
      >
        {/* Product image */}
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={group.nome}
              className="w-full h-full object-contain"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <Icon icon={TIPO_PRODOTTO_ICONS[group.tipo] || MATERIALE_ICONS.package} size={20} className="text-gray-400" />
          )}
        </div>

        {/* Name + brand */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{group.nome}</p>
          {group.brand && (
            <p className="text-sm text-gray-500">{group.brand}</p>
          )}
        </div>

        {/* Total count + expand arrow */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-gray-500 font-medium">
            {group.items.length} {group.items.length === 1 ? 'esemplare' : 'esemplari'}
          </span>
          <Icon
            name={expanded ? 'chevronUp' : 'chevronDown'}
            size={18}
            className="text-gray-400"
          />
        </div>
      </button>

      {/* Position breakdown pills */}
      <div className="flex flex-wrap gap-2">
        {POSIZIONE_ORDER.map(pos => {
          const count = group.positionCounts[pos]
          if (!count) return null
          return (
            <span
              key={pos}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${POSIZIONE_BG[pos]}`}
            >
              <Icon icon={POSIZIONE_ICONS[pos]} size={12} />
              {count} {POSIZIONE_MATERIALE[pos]}
            </span>
          )
        })}
      </div>

      {/* Expanded specimens list */}
      {expanded && (
        <div className="border-l-2 border-gray-200 pl-4 space-y-2 pt-1">
          {group.items.map(m => (
            <Link
              key={m.id}
              to={`/materiale/${m.id}`}
              className="flex items-center justify-between gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors min-h-[48px]"
            >
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-800 truncate block">{m.nome}</span>
                {m.codice_inventario && (
                  <span className="text-xs text-gray-400">{m.codice_inventario}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${POSIZIONE_BG[m.posizione_attuale] || 'bg-gray-100 text-gray-600'}`}>
                  <Icon icon={POSIZIONE_ICONS[m.posizione_attuale]} size={11} />
                  {POSIZIONE_MATERIALE[m.posizione_attuale] || m.posizione_attuale}
                </span>
                {m.posizione_attuale === 'in_magazzino' && m.magazzino?.nome && (
                  <span className="text-xs text-gray-400 hidden md:inline">({m.magazzino.nome})</span>
                )}
                {m.posizione_attuale === 'magazzino_agente' && m.agente && (
                  <span className="text-xs text-gray-400 hidden md:inline">({m.agente.cognome} {m.agente.nome})</span>
                )}
                {m.posizione_attuale === 'presso_evento' && m.posizione_dettaglio && (
                  <span className="text-xs text-gray-400 hidden md:inline truncate max-w-[120px]">({m.posizione_dettaglio})</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

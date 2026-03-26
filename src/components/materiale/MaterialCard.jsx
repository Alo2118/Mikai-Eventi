import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE, CARD_HOVER_STYLE } from '../../lib/constants'

export function MaterialCard({ material, linkTo }) {
  const Wrapper = linkTo ? Link : 'div'
  const wrapperProps = linkTo ? { to: linkTo } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={'block ' + CARD_HOVER_STYLE}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">{material.nome}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {material.codice_inventario && `${material.codice_inventario} \u00B7 `}
            {TIPO_MATERIALE[material.tipo]}
          </p>
          {material.product && (
            <p className="text-sm text-gray-500 mt-0.5">
              {material.product.brand?.nome && `${material.product.brand.nome} \u00B7 `}
              {material.product.nome}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <StatusBadge
            stato={material.posizione_attuale}
            labels={POSIZIONE_MATERIALE}
            colors={POSIZIONE_MATERIALE_COLORE}
          />
          {material.posizione_attuale === 'in_magazzino' && material.magazzino?.nome && (
            <span className="text-xs text-gray-500">({material.magazzino.nome})</span>
          )}
          {material.posizione_attuale === 'magazzino_agente' && material.agente && (
            <span className="text-xs text-gray-500">({material.agente.cognome} {material.agente.nome})</span>
          )}
        </div>
      </div>
      {material.note && (
        <p className="mt-2 text-sm text-gray-400 truncate">{material.note}</p>
      )}
    </Wrapper>
  )
}

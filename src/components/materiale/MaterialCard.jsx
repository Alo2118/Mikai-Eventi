import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE } from '../../lib/constants'

export function MaterialCard({ material, linkTo }) {
  const Wrapper = linkTo ? Link : 'div'
  const wrapperProps = linkTo ? { to: linkTo } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
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
        <StatusBadge
          stato={material.posizione_attuale}
          labels={POSIZIONE_MATERIALE}
          colors={POSIZIONE_MATERIALE_COLORE}
        />
      </div>
      {material.note && (
        <p className="mt-2 text-sm text-gray-400 truncate">{material.note}</p>
      )}
    </Wrapper>
  )
}

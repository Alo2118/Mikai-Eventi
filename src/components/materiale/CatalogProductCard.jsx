import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { KitContentsList } from './KitContentsList'

export function CatalogProductCard({ product, cartQuantity = 0, onAdd, onUpdateQuantity }) {
  const [expanded, setExpanded] = useState(false)
  const [contents, setContents] = useState([])
  const fetchKitContents = useMaterialsStore(s => s.fetchKitContents)

  useEffect(() => {
    if (expanded && contents.length === 0) {
      fetchKitContents(product.id).then(({ data }) => setContents(data))
    }
  }, [expanded])

  const sections = product.body_sections?.map(bs => bs.body_section?.nome).filter(Boolean)
  const inCart = cartQuantity > 0

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${
      inCart ? 'border-mikai-300 ring-1 ring-mikai-200' :
      'border-gray-200 hover:shadow-md'
    }`}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Product image */}
          <div
            className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            {product.foto_url ? (
              <img src={product.foto_url} alt={product.nome} className="w-full h-full object-cover" />
            ) : (
              <Icon icon={MATERIALE_ICONS.package} size={22} className="text-gray-300" />
            )}
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            <h4 className="text-base font-semibold text-gray-900 truncate">{product.nome}</h4>
            <p className="text-sm text-gray-500 truncate">{product.brand?.nome}</p>
          </div>

          {/* +/- controls — always visible */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {inCart && (
              <button
                onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center text-lg font-bold text-gray-600 hover:text-red-600 transition-colors"
                aria-label="Diminuisci quantità"
              >
                −
              </button>
            )}
            {inCart && (
              <span className="w-8 text-center text-base font-bold text-mikai-700">{cartQuantity}</span>
            )}
            <button
              onClick={() => inCart ? onUpdateQuantity(product.id, cartQuantity + 1) : onAdd(product)}
              className="w-10 h-10 rounded-lg bg-mikai-100 hover:bg-mikai-200 flex items-center justify-center text-lg font-bold text-mikai-600 transition-colors"
              aria-label={inCart ? 'Aumenta quantità' : 'Aggiungi al carrello'}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {sections?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {sections.map((s) => (
                <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          )}
          {product.descrizione && (
            <p className="text-sm text-gray-600 mb-2">{product.descrizione}</p>
          )}
          <KitContentsList contents={contents} />
        </div>
      )}
    </div>
  )
}

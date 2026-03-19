import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS } from '../../lib/icons'

export function CatalogProductCard({ product, cartQuantity = 0, onAdd, onUpdateQuantity, onShowDetails }) {
  const sections = product.body_sections?.map(bs => bs.body_section?.nome).filter(Boolean)
  const inCart = cartQuantity > 0

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${
      inCart ? 'border-mikai-300 ring-1 ring-mikai-200' : 'border-gray-200 hover:shadow-md'
    }`}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Product image */}
          <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {product.foto_url ? (
              <img src={product.foto_url} alt={product.nome} className="w-full h-full object-cover" />
            ) : (
              <Icon icon={MATERIALE_ICONS.package} size={22} className="text-gray-300" />
            )}
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-gray-900 truncate">{product.nome}</h4>
            <p className="text-sm text-gray-500 truncate">{product.brand?.nome}</p>
            {sections?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {sections.slice(0, 3).map(s => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{s}</span>
                ))}
                {sections.length > 3 && (
                  <span className="text-xs text-gray-400">+{sections.length - 3}</span>
                )}
              </div>
            )}
            {product.quantita_disponibile != null && (
              <p className={`text-xs font-medium mt-0.5 ${
                product.soglia_minima != null && product.quantita_disponibile <= product.soglia_minima
                  ? 'text-red-600'
                  : 'text-gray-400'
              }`}>
                {product.soglia_minima != null && product.quantita_disponibile <= product.soglia_minima
                  ? `Scorte basse: ${product.quantita_disponibile}`
                  : `Disp: ${product.quantita_disponibile}`
                }
              </p>
            )}
          </div>

          {/* Actions column */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Dettagli button */}
            <button
              onClick={() => onShowDetails(product)}
              className="text-sm text-mikai-600 hover:text-mikai-700 font-medium min-h-[48px] px-2"
              aria-label={`Dettagli ${product.nome}`}
            >
              Dettagli
            </button>

            {/* Cart controls */}
            <div className="flex items-center gap-1">
              {inCart && (
                <button
                  onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
                  className="w-12 h-12 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center text-lg font-bold text-gray-600 hover:text-red-600 transition-colors"
                  aria-label="Diminuisci quantita"
                >
                  −
                </button>
              )}
              {inCart && (
                <span className="w-8 text-center text-base font-bold text-mikai-700">{cartQuantity}</span>
              )}
              <button
                onClick={() => inCart ? onUpdateQuantity(product.id, cartQuantity + 1) : onAdd(product)}
                className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold transition-colors ${
                  inCart
                    ? 'bg-mikai-100 hover:bg-mikai-200 text-mikai-600'
                    : 'bg-mikai-500 hover:bg-mikai-600 text-white'
                }`}
                aria-label={inCart ? 'Aumenta quantita' : 'Aggiungi al carrello'}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* In-cart badge */}
        {inCart && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-mikai-600 font-medium">
            <Icon icon={ACTION_ICONS.check} size={14} />
            Nel carrello
          </div>
        )}
      </div>
    </div>
  )
}

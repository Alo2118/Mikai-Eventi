import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'

export function CatalogProductCard({ product, cartQuantity = 0, onAdd, onUpdateQuantity, onShowDetails, hideBrand }) {
  const inCart = cartQuantity > 0
  const brandLogo = product.brand?.logo_url
  const brandName = product.brand?.nome

  return (
    <div
      className={`w-full rounded-lg flex items-center transition-all ${
        inCart
          ? 'bg-mikai-500 text-white shadow-md'
          : 'bg-white border border-gray-200'
      }`}
    >
      {/* Tappable product info */}
      <button
        type="button"
        onClick={() => onShowDetails(product)}
        className="flex-1 min-w-0 text-left px-3 py-2 flex items-center gap-2"
      >
        {!hideBrand && (
          brandLogo
            ? <img src={brandLogo} alt={brandName} className={`h-5 w-auto object-contain shrink-0 ${inCart ? 'brightness-0 invert opacity-70' : 'opacity-50'}`} />
            : brandName
              ? <span className={`text-xs font-medium shrink-0 ${inCart ? 'text-white/60' : 'text-gray-400'}`}>{brandName}</span>
              : null
        )}
        <p className={`text-sm font-medium line-clamp-1 leading-snug ${inCart ? 'text-white' : 'text-gray-900'}`}>
          {product.nome}
        </p>
      </button>

      {/* Cart action */}
      <div className="flex items-center shrink-0 pr-1">
        {inCart && (
          <button
            type="button"
            onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 text-base font-bold"
            aria-label="Diminuisci quantità"
          >
            −
          </button>
        )}
        <button
          type="button"
          onClick={() => inCart ? onUpdateQuantity(product.id, cartQuantity + 1) : onAdd(product)}
          className={`h-10 rounded-lg flex items-center justify-center font-bold transition-colors ${
            inCart
              ? 'bg-white/20 text-white px-3 min-w-[40px] text-sm tabular-nums hover:bg-white/30'
              : 'bg-mikai-500 text-white w-10 active:bg-mikai-600'
          }`}
          aria-label={inCart ? `${cartQuantity}, aggiungi ancora` : 'Aggiungi'}
        >
          {inCart ? cartQuantity : <Icon icon={ACTION_ICONS.add} size={18} />}
        </button>
      </div>
    </div>
  )
}

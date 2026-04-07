import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS, TIPO_PRODOTTO_ICONS, FEEDBACK_ICONS, ACTION_ICONS } from '../../lib/icons'
import { CARD_HOVER_STYLE } from '../../lib/constants'
import { toDriveImageUrl } from '../../lib/format-utils'

export function StockProductCard({ product, tipoLabels }) {
  const imgUrl = toDriveImageUrl(product.foto_url)
  const sottoSoglia = product.soglia_minima != null && product.quantita_disponibile <= product.soglia_minima
  const tipo = tipoLabels[product.tipo] || product.tipo

  return (
    <Link
      to="/admin/prodotti"
      className={CARD_HOVER_STYLE + ' flex gap-4 items-start group block'}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={product.nome}
          className="w-16 h-16 rounded-lg object-contain bg-gray-50 shrink-0"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <Icon icon={TIPO_PRODOTTO_ICONS[product.tipo] || MATERIALE_ICONS.package} size={28} className="text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900 truncate">{product.nome}</p>
            {product.brand && (
              <p className="text-sm text-gray-500">{product.brand.nome}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-2xl font-bold tabular-nums ${sottoSoglia ? 'text-red-600' : 'text-gray-900'}`}>
              {product.quantita_disponibile ?? '—'}
            </span>
            <span className="text-xs text-gray-400">disponibili</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {tipo && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{tipo}</span>
          )}
          {product.soglia_minima != null && (
            <span className="text-xs text-gray-400">Soglia: {product.soglia_minima}</span>
          )}
          {sottoSoglia && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
              <Icon icon={FEEDBACK_ICONS.warning} size={12} />
              Sotto soglia!
            </span>
          )}
          <span className="hidden md:inline-flex items-center gap-1 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
            Gestisci
            <Icon icon={ACTION_ICONS.manage} size={12} />
          </span>
        </div>
      </div>
    </Link>
  )
}

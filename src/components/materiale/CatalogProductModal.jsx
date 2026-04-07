import { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { ACTION_ICONS, MATERIALE_ICONS, POSIZIONE_ICONS } from '../../lib/icons'
import { POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE } from '../../lib/constants'
import { useCatalogStore } from '../../hooks/useCatalog'
import { toDriveImageUrl } from '../../lib/format-utils'

function PositionBadge({ posizione }) {
  const label = POSIZIONE_MATERIALE[posizione] ?? posizione
  const color = POSIZIONE_MATERIALE_COLORE[posizione] ?? 'gray'
  const iconMap = {
    green: 'text-green-700 bg-green-50 border-green-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    yellow: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    mikai: 'text-mikai-700 bg-mikai-50 border-mikai-200',
    red: 'text-red-700 bg-red-50 border-red-200',
    gray: 'text-gray-700 bg-gray-50 border-gray-200',
  }
  const iconComp = POSIZIONE_ICONS[posizione]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${iconMap[color]}`}>
      {iconComp && <Icon icon={iconComp} size={12} />}
      {label}
    </span>
  )
}

function AvailabilityList({ items }) {
  if (items.length === 0) {
    return <EmptyState title="Nessun esemplare registrato" />
  }

  return (
    <ul className="space-y-2">
      {items.map((mat) => (
        <li
          key={mat.id}
          className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{mat.nome}</p>
            {mat.codice_inventario && (
              <p className="text-xs text-gray-500">{mat.codice_inventario}</p>
            )}
          </div>
          <div className="shrink-0">
            <PositionBadge posizione={mat.posizione_attuale} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function CatalogProductModal({ product, cartQuantity, onAdd, onUpdateQuantity, onClose }) {
  const [kitContents, setKitContents] = useState([])
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchKitContents = useCatalogStore(s => s.fetchKitContents)
  const fetchProductAvailability = useCatalogStore(s => s.fetchProductAvailability)

  useEffect(() => {
    if (!product) return

    setLoading(true)
    setKitContents([])
    setAvailability([])

    Promise.all([
      fetchKitContents(product.id),
      fetchProductAvailability(product.id),
    ])
      .then(([kitsResult, availResult]) => {
        setKitContents(kitsResult.data ?? [])
        setAvailability(availResult.data ?? [])
      })
      .catch(() => {
        setKitContents([])
        setAvailability([])
      })
      .finally(() => { setLoading(false) })
  }, [product?.id])

  if (!product) return null

  const bodySections = product.body_sections ?? []
  const inCart = cartQuantity > 0

  function handleAdd() {
    onAdd(product)
    onClose()
  }

  const footerContent = (
    inCart ? (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
            className="w-12 h-12 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-lg font-bold"
            aria-label="Diminuisci quantità"
          >
            −
          </button>
          <input
            type="number"
            min="0"
            value={cartQuantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (!isNaN(val)) onUpdateQuantity(product.id, val)
            }}
            className="w-16 h-12 text-center text-base font-bold text-mikai-700 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Quantità"
          />
          <button
            type="button"
            onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
            className="w-12 h-12 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-lg font-bold"
            aria-label="Aumenta quantità"
          >
            +
          </button>
        </div>
        <div className="flex-1 flex items-center gap-1.5 text-green-700 font-medium text-sm">
          <Icon icon={ACTION_ICONS.check} size={16} />
          Nel carrello
        </div>
      </div>
    ) : (
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleAdd}
      >
        <Icon icon={ACTION_ICONS.add} size={18} />
        Aggiungi al carrello
      </Button>
    )
  )

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title={product.nome}
      subtitle={product.brand?.logo_url
        ? <span className="inline-flex items-center gap-1.5"><img src={product.brand.logo_url} alt={product.brand.nome} className="h-4 w-auto object-contain" /> {product.brand.nome}</span>
        : product.brand?.nome
      }
      size="lg"
      footer={footerContent}
    >
      <div className="space-y-5">
        {/* Product image */}
        {product.foto_url && (
          <div className="flex justify-center mb-4">
            <img
              src={toDriveImageUrl(product.foto_url)}
              alt={product.nome}
              className="max-h-48 object-contain rounded-lg"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        )}

        {/* Badges: tipo + codice */}
        <div className="flex flex-wrap gap-2">
          {product.tipo && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mikai-50 border border-mikai-200 text-xs font-medium text-mikai-700">
              <Icon icon={MATERIALE_ICONS.package} size={12} />
              {product.tipo}
            </span>
          )}
          {product.codice && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-mono text-gray-600">
              {product.codice}
            </span>
          )}
        </div>

        {/* Body section chips */}
        {bodySections.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Distretti corporei
            </p>
            <div className="flex flex-wrap gap-1.5">
              {bodySections.map((bs, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-mikai-50 border border-mikai-100 text-xs text-mikai-700 font-medium"
                >
                  {bs.body_section?.nome ?? bs.nome ?? bs}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {product.descrizione && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Descrizione
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{product.descrizione}</p>
          </div>
        )}

        {/* Kit contents */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Contenuto del kit
          </p>
          {loading ? (
            <LoadingSkeleton lines={3} />
          ) : (
            <KitSection contents={kitContents} />
          )}
        </div>

        {/* Availability — stock for gadgets, physical units for demo kits */}
        <div>
          {product.tipo === 'gadget' ? (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Giacenza
              </p>
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-900">
                  {product.quantita_disponibile ?? 0} disponibili
                </p>
                {product.soglia_minima != null && product.quantita_disponibile != null &&
                 product.quantita_disponibile <= product.soglia_minima && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    Sotto la soglia minima ({product.soglia_minima})
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Disponibilita fisica
                {!loading && availability.length > 0 && (
                  <span className="ml-2 normal-case font-normal text-gray-400">
                    ({availability.length} {availability.length === 1 ? 'esemplare' : 'esemplari'})
                  </span>
                )}
              </p>
              {loading ? (
                <LoadingSkeleton lines={3} />
              ) : (
                <AvailabilityList items={availability} />
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

function KitSection({ contents }) {
  if (contents.length === 0) {
    return <EmptyState title="Nessun componente kit" />
  }

  return (
    <ul className="space-y-1">
      {contents.map((item, i) => (
        <li key={i} className="flex items-center gap-2 text-sm text-gray-700 py-1">
          <Icon icon={ACTION_ICONS.check} size={14} className="text-mikai-400 shrink-0" />
          <span>{item.piece_name}</span>
          {item.quantity && item.quantity > 1 && (
            <span className="text-xs text-gray-400 ml-auto">×{item.quantity}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

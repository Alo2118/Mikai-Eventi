import { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { ACTION_ICONS, MATERIALE_ICONS, POSIZIONE_ICONS } from '../../lib/icons'
import { POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE } from '../../lib/constants'
import { useMaterialsStore } from '../../hooks/useMaterials'
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
    return (
      <p className="text-sm text-gray-500 py-2">
        Nessun esemplare fisico registrato per questo prodotto.
      </p>
    )
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

export function CatalogProductModal({ product, cartQuantity, onAdd, onClose }) {
  const [kitContents, setKitContents] = useState([])
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchKitContents = useMaterialsStore(s => s.fetchKitContents)
  const fetchProductAvailability = useMaterialsStore(s => s.fetchProductAvailability)

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Dettagli prodotto: ${product.nome}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[85vh]">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl border-b border-gray-200 px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 leading-tight">{product.nome}</h2>
            {product.brand?.nome && (
              <p className="text-sm text-mikai-600 font-medium mt-0.5">{product.brand.nome}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi dettagli prodotto"
            className="shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <Icon icon={ACTION_ICONS.close} size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

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

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-200 px-4 py-3">
          {inCart ? (
            <div className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-green-50 border border-green-200 text-green-700 font-medium text-sm">
              <Icon icon={ACTION_ICONS.check} size={18} />
              Già nel carrello ({cartQuantity})
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
          )}
        </div>
      </div>
    </div>
  )
}

function KitSection({ contents }) {
  if (contents.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-2">
        Nessun componente kit registrato.
      </p>
    )
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

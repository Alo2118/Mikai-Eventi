import { useState, useMemo } from 'react'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ACTION_ICONS, CATALOGO_ICONS } from '../../lib/icons'
import { useProductTypes } from '../../hooks/useProductTypes'

const CART_GROUP_OPTIONS = [
  { key: 'none', label: 'Lista' },
  { key: 'brand', label: 'Brand' },
  { key: 'distretto', label: 'Distretto' },
  { key: 'tipologia', label: 'Tipologia' },
]

function CartGroupHeader({ title, count, logoUrl }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border-y border-gray-200">
      {logoUrl && <img src={logoUrl} alt="" aria-hidden="true" className="h-4 w-auto object-contain" />}
      <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</span>
      <span className="text-xs font-medium text-gray-400">{count}</span>
    </div>
  )
}

function CartItem({ item, onUpdateQuantity, onUpdateNote, showBrand }) {
  const { product, quantity, note } = item
  const hasNote = note != null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-50">
      {showBrand && product.brand?.logo_url && (
        <img src={product.brand.logo_url} alt={product.brand.nome} className="h-3.5 w-auto object-contain shrink-0 opacity-40" />
      )}
      <p className="text-sm text-gray-900 truncate flex-1 min-w-0">{product.nome}</p>
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={() => onUpdateQuantity(product.id, Math.max(0, quantity - 1))}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 text-sm font-bold"
          aria-label="Diminuisci"
        >
          −
        </button>
        <input
          type="number"
          min="0"
          value={quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10)
            if (!isNaN(val)) onUpdateQuantity(product.id, val)
          }}
          className="w-8 h-7 text-center font-semibold text-xs tabular-nums bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-mikai-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Quantità"
        />
        <button
          type="button"
          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-mikai-500 text-sm font-bold"
          aria-label="Aumenta"
        >
          +
        </button>
      </div>
      {hasNote ? (
        <input
          type="text"
          value={note}
          onChange={e => onUpdateNote(product.id, e.target.value)}
          placeholder="Nota..."
          className="w-20 px-1.5 py-0.5 text-[11px] border border-gray-200 rounded focus:ring-1 focus:ring-mikai-400 outline-none shrink-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => onUpdateNote(product.id, '')}
          className="text-[11px] text-gray-300 hover:text-mikai-500 transition-colors shrink-0"
          aria-label="Aggiungi nota"
        >
          nota
        </button>
      )}
    </div>
  )
}

export function CatalogCartFloating({
  cartItems,
  removedCount,
  totalItems,
  hasChanges,
  saving,
  onUpdateQuantity,
  onUpdateNote,
  onSave,
  onClear,
  open,
  onToggle,
}) {
  const [groupBy, setGroupBy] = useState('none')
  const { labels: tipoLabels } = useProductTypes()

  const brandCount = new Set(cartItems.map(i => i.product.brand?.nome).filter(Boolean)).size
  const showBrand = brandCount > 1

  const groupedCartItems = useMemo(() => {
    if (groupBy === 'none') return null
    const groups = new Map()
    const ensure = (key, meta = {}) => {
      if (!groups.has(key)) groups.set(key, { items: [], ...meta })
    }
    for (const item of cartItems) {
      const p = item.product
      if (groupBy === 'brand') {
        const key = p.brand?.nome || 'Altro'
        ensure(key, { logoUrl: p.brand?.logo_url })
        groups.get(key).items.push(item)
      } else if (groupBy === 'distretto') {
        const secs = (p.body_sections || [])
          .map(bs => bs?.body_section?.nome)
          .filter(Boolean)
        if (secs.length === 0) {
          ensure('Non assegnato', {})
          groups.get('Non assegnato').items.push(item)
        } else {
          for (const sec of secs) {
            ensure(sec, {})
            groups.get(sec).items.push(item)
          }
        }
      } else if (groupBy === 'tipologia') {
        const key = tipoLabels[p.tipo] || p.tipo || 'Altro'
        ensure(key, {})
        groups.get(key).items.push(item)
      }
    }
    return [...groups.entries()].sort((a, b) => {
      const aFallback = a[0] === 'Altro' || a[0] === 'Non assegnato'
      const bFallback = b[0] === 'Altro' || b[0] === 'Non assegnato'
      if (aFallback && !bFallback) return 1
      if (!aFallback && bFallback) return -1
      return a[0].localeCompare(b[0], 'it')
    })
  }, [cartItems, groupBy, tipoLabels])

  if (totalItems === 0 && removedCount === 0 && !open) return null

  const renderItems = (items, hideBrandInGroup = false) =>
    items.map(item => (
      <CartItem
        key={item.product.id}
        item={item}
        onUpdateQuantity={onUpdateQuantity}
        onUpdateNote={onUpdateNote}
        showBrand={!hideBrandInGroup && showBrand}
      />
    ))

  return (
    <>
      {/* Sticky summary bar */}
      {!open && totalItems > 0 && (
        <div className="sticky bottom-0 z-40 -mx-4 px-4 pb-2 pt-2 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent">
          <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between min-h-[48px] px-4 py-2.5 bg-mikai-500 text-white rounded-xl shadow-lg hover:bg-mikai-600 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2">
              <Icon icon={CATALOGO_ICONS.cart} size={18} />
              <span className="font-semibold text-sm">
                {totalItems} {totalItems === 1 ? 'prodotto' : 'prodotti'}
              </span>
            </div>
            <span className="text-sm font-medium">Vedi e salva</span>
          </button>
        </div>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onToggle} aria-hidden="true" />

          <div className="absolute bottom-0 left-0 right-0 md:bottom-auto md:top-0 md:left-auto md:right-0 md:w-96 md:h-full bg-white rounded-t-2xl md:rounded-none shadow-2xl flex flex-col max-h-[85vh] md:max-h-full">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 shrink-0">
              <Icon icon={CATALOGO_ICONS.cart} size={16} className="text-mikai-500" />
              <h2 className="font-semibold text-gray-900 text-sm flex-1">Carrello ({totalItems})</h2>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  aria-label="Svuota carrello"
                  onClick={onClear}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Icon icon={ACTION_ICONS.delete} size={14} />
                </button>
              )}
              <button
                type="button"
                aria-label="Chiudi"
                onClick={onToggle}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <Icon icon={ACTION_ICONS.close} size={14} />
              </button>
            </div>

            {/* Group selector */}
            {cartItems.length > 0 && (
              <div className="flex items-center gap-0.5 px-3 py-1 border-b border-gray-100 shrink-0 bg-gray-50">
                <Icon icon={CATALOGO_ICONS.group} size={11} className="text-gray-300 shrink-0 mr-0.5" />
                {CART_GROUP_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setGroupBy(opt.key)}
                    className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                      groupBy === opt.key
                        ? 'text-white bg-mikai-500 font-semibold'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Item list */}
            <div className="flex-1 overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="Carrello vuoto" description="Aggiungi prodotti dal catalogo" icon={CATALOGO_ICONS.cart} />
                </div>
              ) : groupedCartItems ? (
                groupedCartItems.map(([name, group]) => (
                  <div key={name}>
                    <CartGroupHeader title={name} count={group.items.length} logoUrl={group.logoUrl} />
                    {renderItems(group.items, groupBy === 'brand')}
                  </div>
                ))
              ) : (
                renderItems(cartItems)
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-3 py-2 border-t border-gray-200">
              {removedCount > 0 && (
                <p role="alert" className="text-xs text-red-600 font-medium flex items-center gap-1.5 mb-1.5">
                  <Icon icon={ACTION_ICONS.close} size={12} className="text-red-500" />
                  {removedCount} da rimuovere
                </p>
              )}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={saving}
                disabled={!hasChanges || saving}
                onClick={onSave}
              >
                <Icon icon={ACTION_ICONS.check} size={18} />
                Salva modifiche
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

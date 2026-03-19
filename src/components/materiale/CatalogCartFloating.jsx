import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { ACTION_ICONS, CATALOGO_ICONS } from '../../lib/icons'

function CartItem({ item, onUpdateQuantity, onUpdateNote }) {
  const { product, quantity, note } = item

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-base leading-snug">{product.nome}</p>
          {product.brand?.nome && (
            <p className="text-sm text-gray-500 mt-0.5">{product.brand.nome}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label="Diminuisci quantità"
            onClick={() => onUpdateQuantity(product.id, Math.max(0, quantity - 1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors font-medium text-lg"
          >
            −
          </button>
          <span className="w-8 text-center font-semibold text-base tabular-nums">{quantity}</span>
          <button
            type="button"
            aria-label="Aumenta quantità"
            onClick={() => onUpdateQuantity(product.id, quantity + 1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors font-medium text-lg"
          >
            +
          </button>
        </div>
      </div>
      <input
        type="text"
        value={note ?? ''}
        onChange={e => onUpdateNote(product.id, e.target.value)}
        placeholder="Nota (opzionale)"
        className="w-full min-h-[48px] px-3 py-2 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mikai-400 placeholder:text-gray-400"
      />
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
  if (totalItems === 0 && removedCount === 0 && !open) return null

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          type="button"
          aria-label={`Carrello — ${totalItems} prodotti`}
          onClick={onToggle}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-mikai-500 text-white shadow-lg hover:bg-mikai-600 active:scale-95 transition-all flex items-center justify-center"
        >
          <Icon icon={CATALOGO_ICONS.cart} size={24} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </button>
      )}

      {/* Drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onToggle}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="absolute bottom-0 left-0 right-0 md:bottom-auto md:top-0 md:left-auto md:right-0 md:w-96 md:h-full bg-gray-50 rounded-t-2xl md:rounded-none shadow-2xl flex flex-col max-h-[80vh] md:max-h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 bg-white rounded-t-2xl md:rounded-none shrink-0">
              <Icon icon={CATALOGO_ICONS.cart} size={20} className="text-mikai-500" />
              <h2 className="font-semibold text-gray-900 text-lg flex-1">Carrello</h2>
              {totalItems > 0 && (
                <span className="text-sm text-gray-500">{totalItems} {totalItems === 1 ? 'prodotto' : 'prodotti'}</span>
              )}
              <button
                type="button"
                aria-label="Chiudi carrello"
                onClick={onToggle}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Icon icon={ACTION_ICONS.close} size={20} />
              </button>
            </div>

            {/* Scrollable item list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Icon icon={CATALOGO_ICONS.cart} size={40} className="text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Nessun prodotto nel carrello</p>
                  <p className="text-gray-400 text-sm mt-1">Aggiungi prodotti dal catalogo</p>
                </div>
              ) : (
                cartItems.map(item => (
                  <CartItem
                    key={item.product.id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onUpdateNote={onUpdateNote}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-4 py-4 border-t border-gray-200 bg-white space-y-3">
              {removedCount > 0 && (
                <p role="alert" className="text-sm text-red-600 font-medium flex items-center gap-2">
                  <Icon icon={ACTION_ICONS.close} size={14} className="text-red-500" />
                  {removedCount} {removedCount === 1 ? 'prodotto verrà rimosso' : 'prodotti verranno rimossi'} (quantità a 0)
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

              {!hasChanges && cartItems.length > 0 && (
                <p className="text-center text-sm text-gray-400">Nessuna modifica da salvare</p>
              )}

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="w-full min-h-[48px] text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Svuota carrello
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE } from '../../lib/constants'

export function CatalogStepProducts({ brandName, sectionName, products, cart, onAdd, onBack }) {
  const cartIds = cart.map(c => c.id)

  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-3">
        <Icon icon={ACTION_ICONS.back} size={16} className="mr-1" />
        Indietro
      </Button>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{brandName} · {sectionName}</h3>
      <p className="text-base text-gray-500 mb-4">Seleziona i kit da aggiungere al carrello.</p>

      <div className="space-y-4">
        {products.map((product) => (
          <div key={product.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="text-base font-semibold text-gray-900">{product.nome}</h4>
              {product.descrizione && <p className="text-sm text-gray-500">{product.descrizione}</p>}
            </div>
            <div className="divide-y divide-gray-100">
              {product.materials.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">Nessun kit disponibile</p>
              ) : (
                product.materials.map((mat) => {
                  const inCart = cartIds.includes(mat.id)
                  return (
                    <div key={mat.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-base text-gray-900">{mat.nome}</span>
                        {mat.codice_inventario && (
                          <span className="text-sm text-gray-400 ml-2">{mat.codice_inventario}</span>
                        )}
                      </div>
                      <StatusBadge
                        stato={mat.posizione_attuale}
                        labels={POSIZIONE_MATERIALE}
                        colors={POSIZIONE_MATERIALE_COLORE}
                      />
                      {inCart ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 min-w-[100px] justify-end">
                          Nel carrello <Icon icon={ACTION_ICONS.check} size={14} />
                        </span>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => onAdd(mat)}>
                          <Icon icon={ACTION_ICONS.add} size={14} className="mr-1" />
                          Aggiungi
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

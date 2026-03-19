import { TIPO_BRAND } from '../../lib/constants'
import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS } from '../../lib/icons'

const brandTypeIcons = {
  produttore: MATERIALE_ICONS.produttore,
  distributore: MATERIALE_ICONS.distributore,
}

export function CatalogStepBrand({ brands, onSelect }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Scegli l'azienda</h3>
      <p className="text-base text-gray-500 mb-4">Seleziona il produttore o distributore.</p>
      <div className="space-y-3">
        {brands.map((b) => {
          const BrandIcon = brandTypeIcons[b.tipo] || MATERIALE_ICONS.produttore
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b)}
              className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-mikai-300 text-left min-h-[72px] transition-all"
              aria-label={`Seleziona ${b.nome}`}
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                <Icon icon={BrandIcon} size={24} />
              </div>
              <div>
                <span className="text-lg font-medium text-gray-900">{b.nome}</span>
                <p className="text-sm text-gray-500">{TIPO_BRAND[b.tipo]}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

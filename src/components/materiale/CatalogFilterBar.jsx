import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS } from '../../lib/icons'
import { TIPO_PRODOTTO } from '../../lib/constants'

const typeIcons = {
  demo_kit: MATERIALE_ICONS.package,
  strumentario: MATERIALE_ICONS.package_open,
  montaggio: MATERIALE_ICONS.manutenzione,
  pezzo_sfuso: MATERIALE_ICONS.gadget,
}

export function CatalogFilterBar({ brands, sections, selectedBrandId, selectedSectionId, selectedType, onBrandSelect, onSectionSelect, onTypeSelect }) {
  return (
    <div className="space-y-4">
      {brands.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Azienda</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => onBrandSelect(b.id === selectedBrandId ? null : b.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border-2 min-w-[80px] flex-shrink-0 transition-all ${
                  b.id === selectedBrandId ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label={`Filtra per ${b.nome}`}
                aria-pressed={b.id === selectedBrandId}
              >
                <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Icon icon={MATERIALE_ICONS.produttore} size={24} className="text-gray-400" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{b.nome}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {sections.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Distretto anatomico</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => onSectionSelect(s.id === selectedSectionId ? null : s.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border-2 min-w-[80px] flex-shrink-0 transition-all ${
                  s.id === selectedSectionId ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                aria-label={`Filtra per ${s.nome}`}
                aria-pressed={s.id === selectedSectionId}
              >
                <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                  {s.immagine_url ? (
                    <img src={s.immagine_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-lg font-bold text-gray-300">{s.nome.charAt(0)}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{s.nome}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Tipo</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Object.entries(TIPO_PRODOTTO).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onTypeSelect(key === selectedType ? null : key)}
              className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border-2 min-w-[80px] flex-shrink-0 transition-all ${
                key === selectedType ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label={`Filtra per ${label}`}
              aria-pressed={key === selectedType}
            >
              <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                <Icon icon={typeIcons[key] || MATERIALE_ICONS.package} size={24} className="text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

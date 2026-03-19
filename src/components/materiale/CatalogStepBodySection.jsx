import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'

export function CatalogStepBodySection({ brandName, sections, onSelect, onBack }) {
  return (
    <div>
      <Button variant="ghost" onClick={onBack} className="mb-3">
        <Icon icon={ACTION_ICONS.back} size={18} className="mr-1" /> Indietro
      </Button>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{brandName} — Scegli la sezione</h3>
      <p className="text-base text-gray-500 mb-4">Per quale parte del corpo serve il materiale?</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-gray-200 hover:border-mikai-300 min-h-[72px] transition-all"
            aria-label={`Seleziona sezione ${s.nome}`}
          >
            <span className="text-lg font-medium text-gray-900">{s.nome}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

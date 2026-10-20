import { Icon } from '../ui/Icon'
import { LOGISTICA_PERSONE_ICONS } from '../../lib/icons'
import { TITOLO_CONTATTO, STATO_ISCRIZIONE, STATO_ISCRIZIONE_COLORE, SELECT_STYLE, BADGE_BASE, COLOR_BADGE } from '../../lib/constants'

export function AttestatoPersonRow({ participant, selected, titolo, guessed, onToggle, onTitoloChange }) {
  const { contact } = participant
  const nome = `${contact.cognome} ${contact.nome}`

  return (
    <li className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl p-3 border-2 ${selected ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 bg-white'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className="flex items-center gap-3 flex-1 min-h-[48px] text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-mikai-400"
      >
        <span className={`flex items-center justify-center w-7 h-7 rounded-md border-2 shrink-0 ${selected ? 'bg-mikai-500 border-mikai-500 text-white' : 'border-gray-300 bg-white'}`}>
          {selected && <Icon icon={LOGISTICA_PERSONE_ICONS.selezionato} size={18} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-medium text-gray-900 truncate">{nome}</span>
          <span className={BADGE_BASE + ' ' + COLOR_BADGE[STATO_ISCRIZIONE_COLORE[participant.stato_iscrizione]]}>
            {STATO_ISCRIZIONE[participant.stato_iscrizione]}
          </span>
        </span>
      </button>
      <div className="sm:w-40">
        <select
          className={SELECT_STYLE}
          value={titolo}
          onChange={e => onTitoloChange(e.target.value)}
          aria-label={`Titolo di ${nome}`}
        >
          <option value="">Dott./Dott.ssa</option>
          {Object.entries(TITOLO_CONTATTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {guessed && <p className="text-sm text-mikai-700 mt-1">Scelto in base al nome</p>}
      </div>
    </li>
  )
}

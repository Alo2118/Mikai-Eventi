import { STATO_PRENOTAZIONE, STATO_PRENOTAZIONE_COLORE } from '../../lib/constants'

const CHIP_STYLES = {
  green: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  yellow: 'bg-amber-100 text-amber-700 border-amber-300',
  blue: 'bg-sky-100 text-sky-700 border-sky-200',
  gray: 'bg-gray-100 text-gray-400 border-gray-200',
}

const CHIP_LETTERS = {
  da_prenotare: 'D',
  prenotato: 'P',
  confermato: 'C',
  non_necessario: '—',
}

export function StatusDot({ stato, colors = STATO_PRENOTAZIONE_COLORE, labels = STATO_PRENOTAZIONE }) {
  const color = colors[stato] || 'gray'
  const letter = CHIP_LETTERS[stato] || '?'
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border flex-shrink-0 ${CHIP_STYLES[color] || CHIP_STYLES.gray}`}
      title={labels[stato] || stato}
    >
      {letter}
    </span>
  )
}

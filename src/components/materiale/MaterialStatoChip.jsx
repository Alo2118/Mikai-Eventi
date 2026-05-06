import { Icon } from '../ui/Icon'
import {
  STATO_MATERIALE_LISTA, STATO_MATERIALE_LISTA_COLORE,
  POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE,
  STATO_MOVIMENTO, STATO_RIENTRO,
  BADGE_BASE, COLOR_BADGE,
} from '../../lib/constants'
import { POSIZIONE_ICONS, MAGAZZINO_ICONS } from '../../lib/icons'

const REQUEST_ICONS = {
  richiesto: MAGAZZINO_ICONS.imminente,
  approvato: MAGAZZINO_ICONS.imballato,
  in_preparazione: MAGAZZINO_ICONS.picking,
  spedito: MAGAZZINO_ICONS.spedisci,
  rifiutato: MAGAZZINO_ICONS.scaduto,
}

const MOVEMENT_COLOR = {
  uscita: 'mikai',
  rientro: 'emerald',
  trasferimento: 'sky',
}

const MOVEMENT_ICONS = {
  uscita: MAGAZZINO_ICONS.spedisci,
  rientro: MAGAZZINO_ICONS.rientro,
  trasferimento: MAGAZZINO_ICONS.trasferimento,
}

const STATO_RIENTRO_COLOR = {
  integro: 'green',
  parziale: 'yellow',
  danneggiato: 'red',
}

/**
 * Chip di stato per qualsiasi vista del materiale.
 *
 * Modi:
 *  - type="request"  → event_materials.stato (richiesto/approvato/in_preparazione/spedito/rifiutato)
 *  - type="position" → materials.posizione_attuale (in_magazzino/presso_evento/...)
 *  - type="movement" → material_movements.tipo (uscita/rientro/trasferimento), opzionale sub=stato_rientro
 *  - type="rientro"  → STATO_RIENTRO (integro/parziale/danneggiato)
 */
export function MaterialStatoChip({ type, value, sub, withIcon = true, size = 'sm', className = '' }) {
  if (!value) return null

  let label, color, icon
  if (type === 'request') {
    label = STATO_MATERIALE_LISTA[value] || value
    color = STATO_MATERIALE_LISTA_COLORE[value] || 'gray'
    icon = REQUEST_ICONS[value]
  } else if (type === 'position') {
    label = POSIZIONE_MATERIALE[value] || value
    color = POSIZIONE_MATERIALE_COLORE[value] || 'gray'
    icon = POSIZIONE_ICONS[value]
  } else if (type === 'movement') {
    label = STATO_MOVIMENTO[value] || value
    color = MOVEMENT_COLOR[value] || 'gray'
    icon = MOVEMENT_ICONS[value]
    if (sub) {
      label = `${label} ${STATO_RIENTRO[sub] || sub}`.trim()
      if (STATO_RIENTRO_COLOR[sub]) color = STATO_RIENTRO_COLOR[sub]
    }
  } else if (type === 'rientro') {
    label = STATO_RIENTRO[value] || value
    color = STATO_RIENTRO_COLOR[value] || 'gray'
  } else {
    label = value
    color = 'gray'
  }

  const colorClass = COLOR_BADGE[color] || COLOR_BADGE.gray
  const iconSize = size === 'lg' ? 14 : 12

  return (
    <span className={`inline-flex items-center gap-1 ${BADGE_BASE} ${colorClass} ${className}`}>
      {withIcon && icon && <Icon icon={icon} size={iconSize} />}
      <span>{label}</span>
    </span>
  )
}

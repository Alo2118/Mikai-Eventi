import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { STATO_ATTIVITA, CATEGORIA_ATTIVITA, STATO_ATTIVITA_COLORE, CATEGORIA_ATTIVITA_COLORE } from '../../lib/constants'
import { ATTIVITA_STATO_ICONS, CATEGORIA_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'

const COLOR_CLASSES = {
  gray: 'text-gray-500 bg-gray-100',
  mikai: 'text-mikai-600 bg-mikai-50',
  green: 'text-green-700 bg-green-100',
  red: 'text-red-700 bg-red-100',
  blue: 'text-blue-700 bg-blue-100',
  purple: 'text-purple-700 bg-purple-100',
  emerald: 'text-emerald-700 bg-emerald-100',
  yellow: 'text-yellow-700 bg-yellow-100',
}

function CategoryBadge({ categoria }) {
  const label = CATEGORIA_ATTIVITA[categoria] || categoria
  const color = CATEGORIA_ATTIVITA_COLORE[categoria] || 'gray'
  const iconColor = COLOR_CLASSES[color] || COLOR_CLASSES.gray
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${iconColor}`}>
      <Icon icon={CATEGORIA_ICONS[categoria]} size={12} />
      {label}
    </span>
  )
}

function StatoBadge({ displayStato }) {
  const label = STATO_ATTIVITA[displayStato] || displayStato
  const colorKey = STATO_ATTIVITA_COLORE[displayStato] || 'gray'
  const classes = COLOR_CLASSES[colorKey] || COLOR_CLASSES.gray
  const iconComp = ATTIVITA_STATO_ICONS[displayStato] || ATTIVITA_STATO_ICONS.da_fare
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      <Icon icon={iconComp} size={12} />
      {label}
    </span>
  )
}

export function ActivityCard({ activity, onStart, onComplete, onAssign, currentUserId }) {
  const now = new Date()
  const deadline = activity.deadline ? new Date(activity.deadline) : null
  const isOverdue = ['da_fare', 'in_corso'].includes(activity.stato) && deadline && deadline < now
  const isBlocked = activity.dipendenza && activity.dipendenza.stato !== 'completata'

  let displayStato = activity.stato
  if (isBlocked) displayStato = 'bloccata'
  else if (isOverdue) displayStato = 'in_ritardo'

  const borderColor = isOverdue
    ? 'border-red-300'
    : isBlocked
    ? 'border-gray-200'
    : 'border-gray-200'

  const assigneeName = activity.assegnato
    ? `${activity.assegnato.nome} ${activity.assegnato.cognome}`
    : null

  const canStart = activity.stato === 'da_fare' && !isBlocked
  const canComplete = activity.stato === 'in_corso'
  const canAssign = !activity.assegnato_a

  return (
    <div className={`bg-white rounded-xl border ${borderColor} p-4 space-y-3`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-gray-900 leading-snug">
            {activity.descrizione}
          </p>
          {activity.obbligatoria && (
            <span className="inline-block mt-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              Obbligatoria
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activity.tipo_verifica === 'automatica' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-mikai-600 bg-mikai-50">
              <Icon icon={ATTIVITA_STATO_ICONS.auto_verificata} size={12} />
              Automatica
            </span>
          )}
          <StatoBadge displayStato={displayStato} />
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {activity.categoria && <CategoryBadge categoria={activity.categoria} />}
        {deadline && (
          <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
            Scadenza: {formatDate(activity.deadline)}
          </span>
        )}
        {assigneeName && (
          <span className="text-xs text-gray-500">
            Assegnata a: <span className="font-medium text-gray-700">{assigneeName}</span>
          </span>
        )}
      </div>

      {/* Blocked info */}
      {isBlocked && (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <Icon icon={ATTIVITA_STATO_ICONS.bloccata} size={14} className="text-gray-400 shrink-0" />
          <span>Bloccata da: {activity.dipendenza.descrizione}</span>
        </div>
      )}

      {/* Action buttons */}
      {(canAssign || canStart || canComplete) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {canAssign && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAssign && onAssign(activity.id, currentUserId)}
            >
              Assegna a me
            </Button>
          )}
          {canStart && !isBlocked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onStart && onStart(activity.id)}
            >
              Inizia
            </Button>
          )}
          {canComplete && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onComplete && onComplete(activity.id)}
            >
              Segna completata
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

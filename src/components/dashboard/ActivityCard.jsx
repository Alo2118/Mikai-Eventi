import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { CATEGORIA_ICONS, FEEDBACK_ICONS, ACTION_ICONS, NAV_ICONS } from '../../lib/icons'
import { PERMESSO_SHORT_LABELS, PERMESSO_BADGE_COLORE } from '../../lib/constants'
import { formatDate, todayISO } from '../../lib/date-utils'

const URGENCY = {
  overdue: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700', bg: 'bg-red-50/60' },
  today:   { border: 'border-l-yellow-400', badge: 'bg-yellow-100 text-yellow-700', bg: 'bg-yellow-50/60' },
  soon:    { border: 'border-l-mikai-400', badge: 'bg-mikai-50 text-mikai-700', bg: '' },
  normal:  { border: 'border-l-gray-300', badge: 'bg-gray-100 text-gray-600', bg: '' },
  none:    { border: 'border-l-gray-200', badge: '', bg: '' },
}

const PERM_COLORS = {
  purple: 'text-purple-700 bg-purple-100',
  blue: 'text-blue-700 bg-blue-100',
  mikai: 'text-mikai-600 bg-mikai-50',
  emerald: 'text-emerald-700 bg-emerald-100',
  yellow: 'text-yellow-700 bg-yellow-100',
  gray: 'text-gray-500 bg-gray-100',
}

function deadlineInfo(deadline) {
  if (!deadline) return { label: null, urgency: 'none' }
  const today = todayISO()
  const dl = deadline.slice(0, 10)
  if (dl < today) {
    const diff = Math.ceil((new Date(today) - new Date(dl)) / 86400000)
    if (diff === 1) return { label: 'Scaduta ieri', urgency: 'overdue' }
    return { label: `${diff}gg ritardo`, urgency: 'overdue' }
  }
  if (dl === today) return { label: 'Scade oggi', urgency: 'today' }
  const diff = Math.ceil((new Date(dl) - new Date(today)) / 86400000)
  if (diff === 1) return { label: 'Domani', urgency: 'soon' }
  if (diff <= 3) return { label: `Tra ${diff}gg`, urgency: 'soon' }
  if (diff <= 7) return { label: `Tra ${diff}gg`, urgency: 'normal' }
  return { label: formatDate(deadline), urgency: 'normal' }
}

export function ActivityCard({ act, onComplete, onAssign, completing }) {
  const dl = deadlineInfo(act.deadline)
  const u = URGENCY[dl.urgency]
  const permColor = PERM_COLORS[PERMESSO_BADGE_COLORE[act.permesso_responsabile] || 'gray'] || PERM_COLORS.gray

  return (
    <div className={`rounded-xl border border-gray-200 border-l-4 ${u.border} overflow-hidden hover:shadow-md transition-shadow ${u.bg || 'bg-white'}`}>
      <div className="flex items-stretch">
        {/* Content area — clickable link to event */}
        <Link to={`/eventi/${act.evento?.id}`} className="flex-1 min-w-0 p-3 sm:p-4 hover:bg-black/[0.03] transition-colors">
          {/* Title + event */}
          <div className="flex items-start gap-2.5">
            <Icon icon={CATEGORIA_ICONS[act.categoria] || FEEDBACK_ICONS.info} size={18} className="mt-0.5 shrink-0 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-900 leading-snug">{act.descrizione}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <span className="text-sm text-gray-500 truncate">{act.evento?.titolo}</span>
                {act.permesso_responsabile && (
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${permColor}`}>
                    {PERMESSO_SHORT_LABELS[act.permesso_responsabile] || act.permesso_responsabile}
                  </span>
                )}
              </div>
              {/* Assignee + deadline on same row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                {act.assegnato ? (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Icon icon={NAV_ICONS.profilo} size={12} />
                    {act.assegnato.nome} {act.assegnato.cognome}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                    <Icon icon={NAV_ICONS.profilo} size={12} />
                    Non assegnata
                  </span>
                )}
                {dl.label && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.badge}`}>
                    {dl.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Action buttons — right side, vertically centered */}
        <div className="shrink-0 flex flex-col justify-center gap-1.5 px-2 sm:px-3 border-l border-gray-100 bg-gray-50/60">
          <button
            onClick={() => onComplete(act.id)}
            disabled={completing === act.id}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium text-green-700 bg-white border border-green-200 hover:bg-green-50 rounded-lg transition-colors min-h-[40px] min-w-[40px] shadow-sm"
            aria-label={`Completa attività: ${act.descrizione}`}
            title="Completa"
          >
            <Icon icon={ACTION_ICONS.check} size={16} />
            <span className="hidden lg:inline">Completa</span>
          </button>
          {!act.assegnato && (
            <button
              onClick={() => onAssign(act.id)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium text-mikai-700 bg-white border border-mikai-200 hover:bg-mikai-50 rounded-lg transition-colors min-h-[40px] min-w-[40px] shadow-sm"
              aria-label={`Assegna a me: ${act.descrizione}`}
              title="Assegna a me"
            >
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="hidden lg:inline">Assegna</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

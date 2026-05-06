import { Icon } from '../ui/Icon'
import { GROUP_HEADING_STYLE, BADGE_BASE, COLOR_BADGE } from '../../lib/constants'
import { FEEDBACK_ICONS } from '../../lib/icons'

/**
 * Sezione generica della dashboard Magazzino Oggi.
 *
 * Props:
 *  - id            (per scroll target)
 *  - title
 *  - count
 *  - severity      'gray' | 'yellow' | 'red' | 'green' (per il badge count)
 *  - emptyTitle    titolo dello stato vuoto
 *  - emptyDescription
 *  - children      lista di card già renderizzate dal parent
 *  - actionLabel   opzionale: link/CTA secondaria nell'header (es. "Vai a stock")
 *  - onAction      callback per actionLabel
 */
export function MagazzinoSezioneList({
  id,
  title,
  count,
  severity = 'gray',
  emptyTitle = 'Tutto in ordine',
  emptyDescription,
  actionLabel,
  onAction,
  children,
}) {
  const showEmpty = count === 0
  const badgeColor = COLOR_BADGE[severity] || COLOR_BADGE.gray

  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
        <span className={`${BADGE_BASE} ${badgeColor}`}>{count}</span>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="ml-auto text-sm font-medium text-mikai-600 hover:text-mikai-700 min-h-[48px] md:min-h-0 px-2"
          >
            {actionLabel}
          </button>
        )}
      </div>

      {showEmpty ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
          <Icon icon={FEEDBACK_ICONS.success} size={28} className="text-green-500 mx-auto mb-2" />
          <p className="text-base font-medium text-gray-700">{emptyTitle}</p>
          {emptyDescription && (
            <p className="text-sm text-gray-500 mt-1">{emptyDescription}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {children}
        </div>
      )}
    </section>
  )
}

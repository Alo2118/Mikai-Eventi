import { Icon } from '../ui/Icon'
import { ActivityCard } from './ActivityCard'
import { CATEGORIA_ATTIVITA } from '../../lib/constants'
import { CATEGORIA_ICONS } from '../../lib/icons'

const KANBAN_COLUMNS = [
  { id: 'da_fare', label: 'Da fare', color: 'border-gray-300', headerBg: 'bg-gray-50', headerText: 'text-gray-700' },
  { id: 'in_corso', label: 'In corso', color: 'border-mikai-300', headerBg: 'bg-mikai-50', headerText: 'text-mikai-700' },
  { id: 'completata', label: 'Completate', color: 'border-green-300', headerBg: 'bg-green-50', headerText: 'text-green-700' },
]

function useActivityCardProps({
  canEdit, onEditActivity, onStart, onComplete, onRevert, onAssign, onDisable,
  onUploadDocument, onToggleDocumento, onPreviewDoc, onDocAction,
  canApproveDoc, docByActivity, currentUserId, eventStaff,
}) {
  return (activity, compact = false) => ({
    activity,
    compact,
    onStart,
    onComplete,
    onRevert,
    onAssign,
    onDisable,
    onEdit: canEdit ? onEditActivity : null,
    onUploadDocument,
    onToggleDocumento: canEdit ? onToggleDocumento : null,
    onPreviewDoc,
    onApproveDoc: (doc) => onDocAction('approve', doc),
    onRejectDoc: (doc) => onDocAction('reject', doc),
    onRequestRevisionDoc: (doc) => onDocAction('revision', doc),
    canApproveDoc,
    linkedDoc: docByActivity[activity.id] || null,
    currentUserId,
    eventStaff,
  })
}

export function PreparazioneKanbanView({ visible, cardPropsContext }) {
  const getCardProps = useActivityCardProps(cardPropsContext)

  const byStato = { da_fare: [], in_corso: [], completata: [] }
  for (const act of visible) {
    if (byStato[act.stato]) byStato[act.stato].push(act)
    else byStato.da_fare.push(act)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {KANBAN_COLUMNS.map(col => {
        const acts = byStato[col.id] || []
        return (
          <div key={col.id} className={`rounded-xl border-2 ${col.color} overflow-hidden`}>
            <div className={`${col.headerBg} px-3 py-2 flex items-center justify-between`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${col.headerText}`}>{col.label}</h3>
              <span className={`text-xs font-bold ${col.headerText}`}>{acts.length}</span>
            </div>
            <div className="p-1.5 space-y-1.5 min-h-[60px]">
              {acts.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">Nessuna</p>
              ) : (
                acts.map(activity => (
                  <ActivityCard key={activity.id} {...getCardProps(activity, true)} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PreparazioneListView({ grouped, cardPropsContext }) {
  const getCardProps = useActivityCardProps(cardPropsContext)

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([categoria, acts]) => (
        <div key={categoria} className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon icon={CATEGORIA_ICONS[categoria]} size={16} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              {CATEGORIA_ATTIVITA[categoria] || categoria}
            </h3>
            <span className="text-xs text-gray-400">
              ({acts.filter(a => a.stato === 'completata').length}/{acts.length})
            </span>
          </div>
          <div className="space-y-2">
            {acts.map(activity => (
              <ActivityCard key={activity.id} {...getCardProps(activity)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { useSubActivitiesStore } from '../../hooks/useSubActivities'
import { useProgramTemplatesStore } from '../../hooks/useProgramTemplates'
import { useCostsStore } from '../../hooks/useCosts'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { ACTION_ICONS } from '../../lib/icons'
import { formatDate, formatTime, toLocalDateTime, toISO } from '../../lib/date-utils'
import { INPUT_STYLE, SELECT_STYLE, TEXTAREA_STYLE, GROUP_HEADING_STYLE, CONFERMATO_BADGE, CARD_HOVER_STYLE } from '../../lib/constants'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'

const EMPTY_FORM = { tipo_id: '', data_ora: '', durata_minuti: '', luogo: '', fornitore: '', fornitore_id: null, note: '', confermata: false }

function ProgrammaModal({ open, form, setField, types, saving, onSave, onClose, onDelete, editing }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} size="md"
      title={editing ? 'Modifica attività' : 'Nuova attività'}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-3">
            <Button onClick={onSave} loading={saving} disabled={!form.tipo_id} title={!form.tipo_id ? 'Seleziona il tipo di attività' : ''}>{editing ? 'Salva' : 'Aggiungi'}</Button>
            <Button variant="secondary" onClick={onClose}>Annulla</Button>
          </div>
          {editing && onDelete && (
            <Button variant="danger" size="sm" onClick={onDelete}>Elimina</Button>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
          <select className={SELECT_STYLE} value={form.tipo_id} onChange={e => setField('tipo_id', e.target.value)}>
            <option value="">Seleziona...</option>
            {types.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data e ora</label>
            <input type="datetime-local" className={INPUT_STYLE} value={form.data_ora} onChange={e => setField('data_ora', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durata (minuti)</label>
            <input type="number" min="1" className={INPUT_STYLE} value={form.durata_minuti} onChange={e => setField('durata_minuti', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
            <input className={INPUT_STYLE} value={form.luogo} onChange={e => setField('luogo', e.target.value)} placeholder="es. Sala conferenze" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fornitore</label>
            <input className={INPUT_STYLE} value={form.fornitore} onChange={e => setField('fornitore', e.target.value)} placeholder="Nome fornitore" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea className={TEXTAREA_STYLE + ' min-h-[60px]'} value={form.note} onChange={e => setField('note', e.target.value)} rows={2} />
        </div>
        {editing && (
          <label className="flex items-center gap-2 cursor-pointer min-h-[48px]">
            <input type="checkbox" checked={form.confermata}
              onChange={e => setField('confermata', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-green-500 focus:ring-green-400" />
            <span className="text-sm text-gray-700">Confermata</span>
          </label>
        )}
      </div>
    </Modal>
  )
}

export function EventProgrammaTab({ event }) {
  const subActivities = useSubActivitiesStore(s => s.subActivities)
  const types = useSubActivitiesStore(s => s.types)
  const loading = useSubActivitiesStore(s => s.loading)
  const error = useSubActivitiesStore(s => s.error)
  const fetchEventSubActivities = useSubActivitiesStore(s => s.fetchEventSubActivities)
  const fetchTypes = useSubActivitiesStore(s => s.fetchTypes)
  const createSubActivity = useSubActivitiesStore(s => s.createSubActivity)
  const updateSubActivity = useSubActivitiesStore(s => s.updateSubActivity)
  const removeSubActivity = useSubActivitiesStore(s => s.removeSubActivity)

  const instantiateProgramTemplate = useProgramTemplatesStore(s => s.instantiateProgramTemplate)
  const fetchEventPreventivi = useCostsStore(s => s.fetchEventPreventivi)
  const addToast = useToastStore(s => s.add)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingSa, setEditingSa] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchEventSubActivities(event.id)
    fetchTypes()
  }, [event.id])

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const openCreate = () => {
    setEditingId(null)
    setEditingSa(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (sa) => {
    setEditingId(sa.id)
    setEditingSa(sa)
    setForm({
      tipo_id: sa.tipo_id || '',
      data_ora: toLocalDateTime(sa.data_ora),
      durata_minuti: sa.durata_minuti || '',
      luogo: sa.luogo || '',
      fornitore: sa.fornitore || '',
      fornitore_id: sa.fornitore_id || null,
      note: sa.note || '',
      confermata: !!sa.confermata,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setEditingSa(null)
    setForm(EMPTY_FORM)
    setShowDeleteConfirm(false)
  }

  const handleSave = async () => {
    if (!form.tipo_id) return
    setSaving(true)
    const payload = {
      tipo_id: form.tipo_id,
      data_ora: toISO(form.data_ora),
      durata_minuti: form.durata_minuti ? parseInt(form.durata_minuti) : null,
      luogo: form.luogo || null,
      fornitore: form.fornitore || null,
      fornitore_id: form.fornitore_id || null,
      note: form.note || null,
      confermata: form.confermata,
    }
    const result = editingId
      ? await updateSubActivity(editingId, payload)
      : await createSubActivity({ ...payload, event_id: event.id })
    setSaving(false)
    if (result.error) { addToast('Non è stato possibile salvare l\'attività. Riprova.', 'error'); return }
    addToast(editingId ? 'Attività aggiornata' : 'Attività aggiunta', 'success')
    closeModal()
  }

  const handleDelete = async () => {
    if (!editingId) return
    const { error } = await removeSubActivity(editingId)
    if (error) { addToast('Non è stato possibile rimuovere l\'attività. Riprova.', 'error'); return }
    fetchEventPreventivi(event.id)
    addToast('Attività rimossa', 'success')
    closeModal()
  }

  const toggleConfirm = async (sa) => {
    const { error } = await updateSubActivity(sa.id, { confermata: !sa.confermata })
    if (error) addToast('Non è stato possibile aggiornare l\'attività. Riprova.', 'error')
  }

  const handleApplyTemplate = async () => {
    setApplying(true)
    const { data, error } = await instantiateProgramTemplate(event.id, event.tipo_evento, event.modalita, event.data_inizio)
    setApplying(false)
    if (error) { addToast(error, 'warning'); return }
    addToast(`Programma creato da template (${data.length} voci)`, 'success')
    fetchEventSubActivities(event.id)
  }

  // Group by date
  const grouped = useMemo(() => {
    const groups = {}
    for (const sa of subActivities) {
      const dateKey = sa.data_ora ? sa.data_ora.slice(0, 10) : '_nodate'
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(sa)
    }
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === '_nodate') return 1
        if (b === '_nodate') return -1
        return a.localeCompare(b)
      })
      .map(([key, items]) => ({
        label: key === '_nodate' ? 'Senza data' : formatDate(key),
        items: items.sort((a, b) => (a.data_ora || '').localeCompare(b.data_ora || '')),
      }))
  }, [subActivities])

  if (error) return <div role="alert"><EmptyState title="Errore nel caricamento" description="Non siamo riusciti a caricare il programma dell'evento. Riprova." /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-lg">Programma</h3>
        <div className="flex items-center gap-2">
          {subActivities.length === 0 && (
            <Button variant="secondary" size="sm" onClick={handleApplyTemplate} loading={applying}>
              Applica template
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={openCreate}>
            <Icon icon={ACTION_ICONS.add} size={16} />
            <span className="ml-1">Aggiungi</span>
          </Button>
        </div>
      </div>

      {grouped.map(group => (
        <div key={group.label} className="space-y-1.5">
          <div className={GROUP_HEADING_STYLE}>{group.label} <span className="text-gray-400 font-normal">({group.items.length})</span></div>
          {group.items.map(sa => {
            const details = [sa.luogo, sa.fornitore].filter(Boolean)
            return (
              <button key={sa.id} type="button" onClick={() => openEdit(sa)}
                className={CARD_HOVER_STYLE + ' w-full flex items-center gap-3 text-left min-h-[48px] px-3 py-2'}>
                <div className="shrink-0 w-14 text-center">
                  {sa.data_ora ? (
                    <span className="text-sm font-semibold text-mikai-600">{formatTime(sa.data_ora)}</span>
                  ) : (
                    <span className="text-xs text-gray-300">--:--</span>
                  )}
                  {sa.durata_minuti && (
                    <p className="text-xs font-medium text-gray-500">{sa.durata_minuti}′</p>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-gray-900">{sa.tipo_ref?.nome || '—'}</span>
                  {details.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{details.join(' · ')}</p>
                  )}
                  {sa.note && <p className="text-xs text-gray-400 mt-0.5 truncate italic" title={sa.note}>{sa.note}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium shrink-0 ${CONFERMATO_BADGE[sa.confermata]}`}>
                  {sa.confermata ? 'Confermata' : 'Da confermare'}
                </span>
              </button>
            )
          })}
        </div>
      ))}

      {subActivities.length === 0 && !loading && (
        <EmptyState
          title="Nessuna attività in programma"
          action={
            <Button variant="secondary" size="sm" onClick={openCreate}>
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="ml-1">Aggiungi la prima attività</span>
            </Button>
          }
        />
      )}
      {loading && <LoadingSkeleton lines={3} />}

      <ProgrammaModal
        open={showModal} form={form} setField={setField} types={types}
        saving={saving} onSave={handleSave} onClose={closeModal}
        onDelete={editingId ? () => setShowDeleteConfirm(true) : null}
        editing={!!editingId}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Rimuovi attività"
        message={`Rimuovere "${editingSa?.tipo_ref?.nome}" dal programma?`}
        confirmLabel="Rimuovi"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

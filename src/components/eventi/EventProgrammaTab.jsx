import { useEffect, useState } from 'react'
import { useSubActivitiesStore } from '../../hooks/useSubActivities'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useCostsStore } from '../../hooks/useCosts'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { ACTION_ICONS } from '../../lib/icons'
import { formatDateTime } from '../../lib/date-utils'
import { INPUT_STYLE, SELECT_STYLE, CARD_STYLE, FORM_CONTAINER_STYLE } from '../../lib/constants'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'

const EMPTY_FORM = { tipo_id: '', data_ora: '', durata_minuti: '', luogo: '', fornitore: '', fornitore_id: null, note: '' }

export function EventProgrammaTab({ event }) {
  const subActivities = useSubActivitiesStore(s => s.subActivities)
  const types = useSubActivitiesStore(s => s.types)
  const loading = useSubActivitiesStore(s => s.loading)
  const fetchEventSubActivities = useSubActivitiesStore(s => s.fetchEventSubActivities)
  const fetchTypes = useSubActivitiesStore(s => s.fetchTypes)
  const createSubActivity = useSubActivitiesStore(s => s.createSubActivity)
  const updateSubActivity = useSubActivitiesStore(s => s.updateSubActivity)
  const removeSubActivity = useSubActivitiesStore(s => s.removeSubActivity)

  const instantiateProgramTemplate = useActivitiesStore(s => s.instantiateProgramTemplate)
  const fetchEventPreventivi = useCostsStore(s => s.fetchEventPreventivi)
  const addToast = useToastStore(s => s.add)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    fetchEventSubActivities(event.id)
    fetchTypes()
  }, [event.id])

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.tipo_id) return
    setSaving(true)
    const payload = {
      event_id: event.id,
      tipo_id: form.tipo_id,
      data_ora: form.data_ora || null,
      durata_minuti: form.durata_minuti ? parseInt(form.durata_minuti) : null,
      luogo: form.luogo || null,
      fornitore: form.fornitore || null,
      fornitore_id: form.fornitore_id || null,
      note: form.note || null,
    }
    const { error } = await createSubActivity(payload)
    setSaving(false)
    if (error) { addToast('Errore nel salvataggio', 'error'); return }
    addToast('Attività aggiunta', 'success')
    setShowForm(false)
    setForm(EMPTY_FORM)
  }

  const toggleConfirm = async (sa) => {
    const { error } = await updateSubActivity(sa.id, { confermata: !sa.confermata })
    if (error) addToast('Errore', 'error')
  }

  const handleApplyTemplate = async () => {
    setApplying(true)
    const { data, error } = await instantiateProgramTemplate(event.id, event.tipo_evento, event.modalita, event.data_inizio)
    setApplying(false)
    if (error) { addToast(error, 'warning'); return }
    addToast(`Programma creato da template (${data.length} voci)`, 'success')
    fetchEventSubActivities(event.id)
  }

  const handleDelete = async () => {
    const { error } = await removeSubActivity(deleting.id)
    setDeleting(null)
    if (error) { addToast('Errore', 'error'); return }
    // Refresh preventivi — CASCADE in DB deletes linked quotes
    fetchEventPreventivi(event.id)
    addToast('Attività rimossa', 'success')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-lg">Programma</h3>
        <div className="flex items-center gap-2">
          {subActivities.length === 0 && !showForm && (
            <Button variant="secondary" size="sm" onClick={handleApplyTemplate} loading={applying}>
              Applica template
            </Button>
          )}
          {!showForm && (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="ml-1">Aggiungi</span>
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
              <select className={SELECT_STYLE} value={form.tipo_id} onChange={e => setField('tipo_id', e.target.value)}>
                <option value="">Seleziona...</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data e ora</label>
              <input type="datetime-local" className={INPUT_STYLE} value={form.data_ora} onChange={e => setField('data_ora', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durata (minuti)</label>
              <input type="number" min="1" className={INPUT_STYLE} value={form.durata_minuti} onChange={e => setField('durata_minuti', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
              <input className={INPUT_STYLE} value={form.luogo} onChange={e => setField('luogo', e.target.value)} placeholder="es. Sala conferenze" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fornitore</label>
            <input className={INPUT_STYLE} value={form.fornitore} onChange={e => setField('fornitore', e.target.value)} placeholder="Nome fornitore" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea className={INPUT_STYLE + ' min-h-[80px]'} value={form.note} onChange={e => setField('note', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!form.tipo_id}>Aggiungi</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Annulla</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {subActivities.map(sa => (
          <div key={sa.id} className={CARD_STYLE + ' flex items-start justify-between gap-3'}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{sa.tipo_ref?.nome || '—'}</span>
                {sa.confermata && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Confermata</span>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                {sa.data_ora && <span>{formatDateTime(sa.data_ora)}</span>}
                {sa.durata_minuti && <span> · {sa.durata_minuti} min</span>}
                {sa.luogo && <span> · {sa.luogo}</span>}
              </div>
              {sa.fornitore && <p className="text-sm text-gray-500 mt-0.5">Fornitore: {sa.fornitore}</p>}
              {sa.note && <p className="text-sm text-gray-400 mt-1">{sa.note}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleConfirm(sa)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[48px] transition-colors ${sa.confermata ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
              >
                {sa.confermata ? 'Confermata' : 'Da confermare'}
              </button>
              <button
                onClick={() => setDeleting(sa)}
                className="text-red-400 hover:text-red-600 p-2 min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors"
                aria-label="Rimuovi attività"
              >
                <Icon icon={ACTION_ICONS.close} size={16} />
              </button>
            </div>
          </div>
        ))}
        {subActivities.length === 0 && !loading && (
          <EmptyState
            title="Nessuna attività in programma"
            action={!showForm ? (
              <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
                <Icon icon={ACTION_ICONS.add} size={16} />
                <span className="ml-1">Aggiungi la prima attività</span>
              </Button>
            ) : null}
          />
        )}
        {loading && <LoadingSkeleton lines={3} />}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Rimuovi attività"
        message={`Rimuovere "${deleting?.tipo_ref?.nome}" dal programma?`}
        confirmLabel="Rimuovi"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

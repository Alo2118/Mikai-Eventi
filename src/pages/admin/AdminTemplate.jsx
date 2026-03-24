import { useEffect, useState } from 'react'
import { useActivitiesStore } from '../../hooks/useActivities'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { FormField } from '../../components/ui/FormField'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useToastStore } from '../../components/ui/Toast'
import { ACTION_ICONS, CATEGORIA_ICONS } from '../../lib/icons'
import {
  TIPO_EVENTO, MODALITA_EVENTO,
  CATEGORIA_ATTIVITA, VERIFICATION_FUNCTIONS,
  INPUT_STYLE, SELECT_STYLE,
} from '../../lib/constants'

const PERMISSION_OPTIONS = {
  gestione_marketing: 'Marketing',
  gestione_spedizioni: 'Spedizioni',
  gestione_magazzino: 'Magazzino',
  gestione_organizzazione: 'Organizzazione',
  gestione_costi: 'Costi',
}

export function AdminTemplate() {
  const fetchTemplates = useActivitiesStore(s => s.fetchTemplates)
  const fetchTemplateItems = useActivitiesStore(s => s.fetchTemplateItems)
  const createTemplateItem = useActivitiesStore(s => s.createTemplateItem)
  const updateTemplateItem = useActivitiesStore(s => s.updateTemplateItem)
  const deleteTemplateItem = useActivitiesStore(s => s.deleteTemplateItem)
  const addToast = useToastStore(s => s.add)

  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    descrizione: '',
    categoria: 'organizzazione',
    permesso_responsabile: '',
    giorni_prima_evento: -7,
    obbligatorio: true,
    tipo_verifica: 'manuale',
    verifica_automatica: '',
    dipende_da: '',
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    const { data } = await fetchTemplates()
    setTemplates(data)
    setLoading(false)
  }

  async function loadItems(templateId) {
    setItemsLoading(true)
    const { data } = await fetchTemplateItems(templateId)
    setItems(data)
    setItemsLoading(false)
  }

  function handleSelectTemplate(t) {
    setSelectedTemplate(t)
    loadItems(t.id)
  }

  function openEdit(item) {
    setEditing(item || {})
    setForm(item?.id ? {
      descrizione: item.descrizione || '',
      categoria: item.categoria || 'organizzazione',
      permesso_responsabile: item.permesso_responsabile || '',
      giorni_prima_evento: item.giorni_prima_evento || -7,
      obbligatorio: item.obbligatorio ?? true,
      tipo_verifica: item.tipo_verifica || 'manuale',
      verifica_automatica: item.verifica_automatica || '',
      dipende_da: item.dipende_da || '',
    } : {
      descrizione: '',
      categoria: 'organizzazione',
      permesso_responsabile: '',
      giorni_prima_evento: -7,
      obbligatorio: true,
      tipo_verifica: 'manuale',
      verifica_automatica: '',
      dipende_da: '',
    })
  }

  async function handleSave() {
    if (!form.descrizione.trim()) return
    setSaving(true)

    const payload = {
      ...form,
      descrizione: form.descrizione.trim(),
      dipende_da: form.dipende_da || null,
      permesso_responsabile: form.permesso_responsabile || null,
      verifica_automatica: form.tipo_verifica === 'automatica' ? form.verifica_automatica : null,
    }

    const { error } = editing?.id
      ? await updateTemplateItem(editing.id, payload)
      : await createTemplateItem(selectedTemplate.id, payload)

    setSaving(false)
    if (error) {
      addToast(error.message || 'Errore nel salvataggio', 'error')
      return
    }
    addToast(editing?.id ? 'Attività aggiornata' : 'Attività creata', 'success')
    setEditing(null)
    loadItems(selectedTemplate.id)
  }

  async function handleDelete() {
    const { error } = await deleteTemplateItem(deleting.id)
    setDeleting(null)
    if (error) {
      addToast(error.message || 'Errore', 'error')
      return
    }
    addToast('Attività rimossa dal template', 'success')
    loadItems(selectedTemplate.id)
  }

  if (loading) return <LoadingSkeleton lines={6} />

  return (
    <div>
      <MobileHeader title="Template attività" subtitle="Gestisci i template checklist per evento" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Template attività' }]} />
      </div>
      <PageHeader title="Template attività" subtitle="Configura le checklist di preparazione per tipo evento" />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        {/* Template selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelectTemplate(t)}
              className={`text-left p-4 rounded-xl border transition-all min-h-[48px] ${
                selectedTemplate?.id === t.id
                  ? 'border-mikai-400 bg-mikai-50 ring-2 ring-mikai-200'
                  : 'border-gray-200 bg-white hover:shadow-md'
              }`}
            >
              <p className="text-base font-semibold text-gray-900">
                {TIPO_EVENTO[t.tipo_evento] || t.tipo_evento}
              </p>
              <p className="text-sm text-gray-500">
                {MODALITA_EVENTO[t.modalita] || t.modalita}
                {' · '}{t.items?.filter(i => i.tipo === 'checklist').length || 0} attività
              </p>
            </button>
          ))}
        </div>

        {/* Items list */}
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Checklist: {TIPO_EVENTO[selectedTemplate.tipo_evento]} — {MODALITA_EVENTO[selectedTemplate.modalita]}
              </h2>
              <Button onClick={() => openEdit(null)}>
                <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                Nuova attività
              </Button>
            </div>

            {itemsLoading ? (
              <LoadingSkeleton lines={4} />
            ) : items.length === 0 ? (
              <EmptyState title="Nessuna attività" description="Aggiungi la prima attività al template." />
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => openEdit(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon icon={CATEGORIA_ICONS[item.categoria]} size={16} className="text-gray-400 shrink-0" />
                          <p className="text-base font-medium text-gray-900">{item.descrizione}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                          <span>{CATEGORIA_ATTIVITA[item.categoria]}</span>
                          <span>·</span>
                          <span>{item.giorni_prima_evento}gg</span>
                          {item.obbligatorio && <span className="text-red-600 font-medium">Obbligatoria</span>}
                          {item.tipo_verifica === 'automatica' && (
                            <span className="text-mikai-600 font-medium">Auto</span>
                          )}
                          {item.dipende_da && (
                            <span className="text-gray-400">
                              Dipende da: {items.find(i => i.id === item.dipende_da)?.descrizione || '...'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleting(item) }}
                        className="text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center"
                        aria-label="Elimina"
                      >
                        <Icon icon={ACTION_ICONS.close} size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Modifica attività template' : 'Nuova attività template'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.descrizione.trim()}>
              {editing?.id ? 'Salva' : 'Crea'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Descrizione" required>
            <input
              className={INPUT_STYLE}
              value={form.descrizione}
              onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
              placeholder="es. Preparare locandina evento"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Categoria">
              <select
                className={SELECT_STYLE}
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              >
                {Object.entries(CATEGORIA_ATTIVITA).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Permesso responsabile">
              <select
                className={SELECT_STYLE}
                value={form.permesso_responsabile}
                onChange={e => setForm(f => ({ ...f, permesso_responsabile: e.target.value }))}
              >
                <option value="">Nessuno (chiunque)</option>
                {Object.entries(PERMISSION_OPTIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Giorni prima dell'evento">
              <input
                type="number"
                className={INPUT_STYLE}
                value={form.giorni_prima_evento}
                onChange={e => setForm(f => ({ ...f, giorni_prima_evento: parseInt(e.target.value) || -7 }))}
                max={0}
              />
            </FormField>

            <FormField label="Obbligatoria">
              <select
                className={SELECT_STYLE}
                value={form.obbligatorio ? 'si' : 'no'}
                onChange={e => setForm(f => ({ ...f, obbligatorio: e.target.value === 'si' }))}
              >
                <option value="si">Sì</option>
                <option value="no">No</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Tipo verifica">
              <select
                className={SELECT_STYLE}
                value={form.tipo_verifica}
                onChange={e => setForm(f => ({ ...f, tipo_verifica: e.target.value }))}
              >
                <option value="manuale">Manuale</option>
                <option value="automatica">Automatica</option>
              </select>
            </FormField>

            {form.tipo_verifica === 'automatica' && (
              <FormField label="Funzione di verifica">
                <select
                  className={SELECT_STYLE}
                  value={form.verifica_automatica}
                  onChange={e => setForm(f => ({ ...f, verifica_automatica: e.target.value }))}
                >
                  <option value="">Seleziona...</option>
                  {Object.entries(VERIFICATION_FUNCTIONS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </FormField>
            )}
          </div>

          <FormField label="Dipende da">
            <select
              className={SELECT_STYLE}
              value={form.dipende_da}
              onChange={e => setForm(f => ({ ...f, dipende_da: e.target.value }))}
            >
              <option value="">Nessuna dipendenza</option>
              {items
                .filter(i => i.id !== editing?.id)
                .map(i => (
                  <option key={i.id} value={i.id}>{i.descrizione}</option>
                ))}
            </select>
          </FormField>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleting}
        title="Elimina attività"
        message={`Eliminare "${deleting?.descrizione}" dal template? Le attività già create per eventi esistenti non saranno modificate.`}
        confirmLabel="Elimina"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useActivityTemplatesStore } from '../../hooks/useActivityTemplates'
import { useProgramTemplatesStore } from '../../hooks/useProgramTemplates'
import { useSubActivitiesStore } from '../../hooks/useSubActivities'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useToastStore } from '../../components/ui/Toast'
import { ACTION_ICONS, CATEGORIA_ICONS } from '../../lib/icons'
import {
  MODALITA_EVENTO,
  CATEGORIA_ATTIVITA,
  SELECT_STYLE, CARD_HOVER_STYLE,
} from '../../lib/constants'
import { useEventTypes } from '../../hooks/useEventTypes'
import { topologicalSort, getDepthLevel } from '../../lib/admin-template-utils'
import { AdminTemplateChecklistEditor } from '../../components/admin/AdminTemplateChecklistEditor'
import { AdminTemplateProgramEditor } from '../../components/admin/AdminTemplateProgramEditor'
import { AdminTemplateMaterialEditor } from '../../components/admin/AdminTemplateMaterialEditor'

export function AdminTemplate() {
  const fetchTemplates = useActivityTemplatesStore(s => s.fetchTemplates)
  const fetchTemplateItems = useActivityTemplatesStore(s => s.fetchTemplateItems)
  const createTemplateItem = useActivityTemplatesStore(s => s.createTemplateItem)
  const updateTemplateItem = useActivityTemplatesStore(s => s.updateTemplateItem)
  const deleteTemplateItem = useActivityTemplatesStore(s => s.deleteTemplateItem)
  const createTemplate = useActivityTemplatesStore(s => s.createTemplate)
  const deleteTemplate = useActivityTemplatesStore(s => s.deleteTemplate)
  const fetchProgramTemplateItems = useProgramTemplatesStore(s => s.fetchProgramTemplateItems)
  const createProgramTemplateItem = useProgramTemplatesStore(s => s.createProgramTemplateItem)
  const updateProgramTemplateItem = useProgramTemplatesStore(s => s.updateProgramTemplateItem)
  const deleteProgramTemplateItem = useProgramTemplatesStore(s => s.deleteProgramTemplateItem)
  const fetchTemplateMaterials = useActivityTemplatesStore(s => s.fetchTemplateMaterials)
  const createTemplateMaterial = useActivityTemplatesStore(s => s.createTemplateMaterial)
  const updateTemplateMaterial = useActivityTemplatesStore(s => s.updateTemplateMaterial)
  const deleteTemplateMaterial = useActivityTemplatesStore(s => s.deleteTemplateMaterial)
  const searchProducts = useActivityTemplatesStore(s => s.searchProducts)
  const saTypes = useSubActivitiesStore(s => s.types)
  const fetchSaTypes = useSubActivitiesStore(s => s.fetchTypes)
  const addToast = useToastStore(s => s.add)
  const { labels: tipoLabels, eventTypes: dynamicEventTypes } = useEventTypes()

  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [items, setItems] = useState([])
  const [programItems, setProgramItems] = useState([])
  const [materialItems, setMaterialItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState('checklist')

  const [editing, setEditing] = useState(null)
  const [editingProgram, setEditingProgram] = useState(null)
  const [editingMaterial, setEditingMaterial] = useState(null)

  const [deleting, setDeleting] = useState(null)
  const [deletingProgram, setDeletingProgram] = useState(null)
  const [deletingMaterial, setDeletingMaterial] = useState(null)
  const [deletingTemplate, setDeletingTemplate] = useState(null)

  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTipo, setNewTipo] = useState('')
  const [newModalita, setNewModalita] = useState('')

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    const [{ data }] = await Promise.all([fetchTemplates(), fetchSaTypes()])
    setTemplates(data)
    setLoading(false)
  }

  async function loadItems(templateId) {
    setItemsLoading(true)
    const [checkRes, progRes, matRes] = await Promise.all([
      fetchTemplateItems(templateId),
      fetchProgramTemplateItems(templateId),
      fetchTemplateMaterials(templateId),
    ])
    setItems(checkRes.data)
    setProgramItems(progRes.data)
    setMaterialItems(matRes.data)
    setItemsLoading(false)
  }

  function handleSelectTemplate(t) {
    setSelectedTemplate(t)
    setSection('checklist')
    loadItems(t.id)
  }

  async function handleCreateTemplate() {
    if (!newTipo || !newModalita) return
    const exists = templates.some(t => t.tipo_evento === newTipo && t.modalita === newModalita)
    if (exists) { addToast('Template già esistente per questa combinazione', 'warning'); return }
    setSaving(true)
    const { error } = await createTemplate(newTipo, newModalita)
    setSaving(false)
    if (error) { addToast(error.message || 'Errore', 'error'); return }
    addToast('Template creato', 'success')
    setShowNewTemplate(false)
    setNewTipo('')
    setNewModalita('')
    loadTemplates()
  }

  async function handleDeleteTemplate() {
    const { error } = await deleteTemplate(deletingTemplate.id)
    setDeletingTemplate(null)
    if (error) { addToast(error.message || 'Errore nella cancellazione', 'error'); return }
    addToast('Template eliminato', 'success')
    if (selectedTemplate?.id === deletingTemplate.id) {
      setSelectedTemplate(null)
      setItems([])
      setProgramItems([])
    }
    loadTemplates()
  }

  async function handleSaveChecklist(payload) {
    setSaving(true)
    const { error } = editing?.id
      ? await updateTemplateItem(editing.id, payload)
      : await createTemplateItem(selectedTemplate.id, payload)
    setSaving(false)
    if (error) { addToast(error.message || 'Errore nel salvataggio', 'error'); return }
    addToast(editing?.id ? 'Attività aggiornata' : 'Attività creata', 'success')
    setEditing(null)
    loadItems(selectedTemplate.id)
  }

  async function handleDeleteChecklist() {
    const { error } = await deleteTemplateItem(deleting.id)
    setDeleting(null)
    if (error) { addToast(error.message || 'Errore', 'error'); return }
    addToast('Attività rimossa dal template', 'success')
    loadItems(selectedTemplate.id)
  }

  async function handleSaveProgram(payload) {
    setSaving(true)
    const { error } = editingProgram?.id
      ? await updateProgramTemplateItem(editingProgram.id, payload)
      : await createProgramTemplateItem(selectedTemplate.id, payload)
    setSaving(false)
    if (error) { addToast(error?.message || 'Errore nel salvataggio', 'error'); return }
    addToast(editingProgram?.id ? 'Voce aggiornata' : 'Voce aggiunta', 'success')
    setEditingProgram(null)
    loadItems(selectedTemplate.id)
  }

  async function handleDeleteProgram() {
    const { error } = await deleteProgramTemplateItem(deletingProgram.id)
    setDeletingProgram(null)
    if (error) { addToast(error?.message || 'Errore', 'error'); return }
    addToast('Voce rimossa dal template', 'success')
    loadItems(selectedTemplate.id)
  }

  async function handleSaveMaterial(payload) {
    setSaving(true)
    const { error } = editingMaterial?.id
      ? await updateTemplateMaterial(editingMaterial.id, payload)
      : await createTemplateMaterial(selectedTemplate.id, payload)
    setSaving(false)
    if (error) { addToast(error?.message || 'Errore', 'error'); return }
    addToast(editingMaterial?.id ? 'Materiale aggiornato' : 'Materiale aggiunto', 'success')
    setEditingMaterial(null)
    loadItems(selectedTemplate.id)
  }

  async function handleDeleteMaterial() {
    const { error } = await deleteTemplateMaterial(deletingMaterial.id)
    setDeletingMaterial(null)
    if (error) { addToast(error?.message || 'Errore', 'error'); return }
    addToast('Materiale rimosso dal template', 'success')
    loadItems(selectedTemplate.id)
  }

  if (loading) return <LoadingSkeleton lines={6} />

  return (
    <div>
      <MobileHeader title="Template attività" subtitle="Gestisci i template checklist per evento" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Template attività' }]} />
      </div>
      <PageHeader title="Template attività" subtitle="Configura checklist e programma per tipo evento" />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Template</h3>
            <Button variant="secondary" size="sm" onClick={() => setShowNewTemplate(v => !v)}>
              <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
              Nuovo template
            </Button>
          </div>

          {showNewTemplate && (
            <div className={CARD_HOVER_STYLE + ' space-y-3'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo evento</label>
                  <select className={SELECT_STYLE} value={newTipo} onChange={e => setNewTipo(e.target.value)}>
                    <option value="">Seleziona...</option>
                    {dynamicEventTypes.map(et => <option key={et.codice} value={et.codice}>{et.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modalità</label>
                  <select className={SELECT_STYLE} value={newModalita} onChange={e => setNewModalita(e.target.value)}>
                    <option value="">Seleziona...</option>
                    {Object.entries(MODALITA_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleCreateTemplate} loading={saving} disabled={!newTipo || !newModalita}>Crea</Button>
                <Button variant="ghost" onClick={() => { setShowNewTemplate(false); setNewTipo(''); setNewModalita('') }}>Annulla</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map(t => (
              <div
                key={t.id}
                className={`relative text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedTemplate?.id === t.id
                    ? 'border-mikai-400 bg-mikai-50 ring-2 ring-mikai-200'
                    : 'border-gray-200 bg-white hover:shadow-md'
                }`}
                onClick={() => handleSelectTemplate(t)}
              >
                <p className="text-base font-semibold text-gray-900">
                  {tipoLabels[t.tipo_evento] || t.tipo_evento}
                </p>
                <p className="text-sm text-gray-500">
                  {MODALITA_EVENTO[t.modalita] || t.modalita}
                  {' · '}{t.items?.filter(i => i.tipo === 'checklist').length || 0} attività
                  {' · '}{t.items?.filter(i => i.tipo === 'sub_activity').length || 0} programma
                </p>
                <button
                  onClick={e => { e.stopPropagation(); setDeletingTemplate(t) }}
                  className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 transition-colors"
                  aria-label="Elimina template"
                >
                  <Icon icon={ACTION_ICONS.close} size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {selectedTemplate && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {[
                { id: 'checklist', label: `Checklist (${items.length})` },
                { id: 'programma', label: `Programma (${programItems.length})` },
                { id: 'materiale', label: `Materiale (${materialItems.length})` },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[48px] transition-colors ${
                    section === s.id ? 'bg-mikai-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {section === 'checklist' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Checklist: {tipoLabels[selectedTemplate.tipo_evento] || selectedTemplate.tipo_evento} — {MODALITA_EVENTO[selectedTemplate.modalita]}
                  </h2>
                  <Button onClick={() => setEditing({})}>
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
                    {topologicalSort(items).map(item => {
                      const depth = getDepthLevel(item, items)
                      return (
                        <div
                          key={item.id}
                          className={CARD_HOVER_STYLE + ' cursor-pointer'}
                          style={{ marginLeft: `${depth * 2}rem` }}
                          onClick={() => setEditing(item)}
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
                                <span>{item.giorni_prima_evento > 0 ? `+${item.giorni_prima_evento}gg` : `${item.giorni_prima_evento}gg`}</span>
                                {item.obbligatorio && <span className="text-red-600 font-medium">Obbligatoria</span>}
                                {item.post_evento && <span className="text-orange-600 font-medium">Post-evento</span>}
                                {item.tipo_verifica === 'automatica' && (
                                  <span className="text-mikai-600 font-medium">Auto</span>
                                )}
                                {item.dipende_da && (
                                  <span className="text-gray-400">
                                    <Icon icon={ACTION_ICONS.forward} size={12} className="inline mr-1" />
                                    Dopo: {items.find(i => i.id === item.dipende_da)?.descrizione || 'Dipendenza rimossa'}
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
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {section === 'programma' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Programma: {tipoLabels[selectedTemplate.tipo_evento] || selectedTemplate.tipo_evento} — {MODALITA_EVENTO[selectedTemplate.modalita]}
                  </h2>
                  <Button onClick={() => setEditingProgram({})}>
                    <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                    Nuova voce
                  </Button>
                </div>

                {itemsLoading ? (
                  <LoadingSkeleton lines={4} />
                ) : programItems.length === 0 ? (
                  <EmptyState title="Nessuna voce di programma" description="Aggiungi la prima voce al programma tipo." />
                ) : (
                  <div className="space-y-2">
                    {programItems.map(item => (
                      <div
                        key={item.id}
                        className={CARD_HOVER_STYLE + ' cursor-pointer'}
                        onClick={() => setEditingProgram(item)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-medium text-gray-900">
                              {item.tipo_ref?.nome || item.descrizione}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                              {item.giorno && <span>Giorno {item.giorno}</span>}
                              {item.orario && <span>{item.orario.substring(0, 5)}</span>}
                              {item.durata_minuti && <span>· {item.durata_minuti} min</span>}
                              {item.luogo && <span>· {item.luogo}</span>}
                              {item.fornitore && <span>· {item.fornitore}</span>}
                            </div>
                            {item.note && <p className="text-sm text-gray-400 mt-0.5">{item.note}</p>}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setDeletingProgram(item) }}
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

            {section === 'materiale' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Materiale: {tipoLabels[selectedTemplate.tipo_evento] || selectedTemplate.tipo_evento} — {MODALITA_EVENTO[selectedTemplate.modalita]}
                  </h2>
                  <Button onClick={() => setEditingMaterial({})}>
                    <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                    Aggiungi prodotto
                  </Button>
                </div>

                {itemsLoading ? (
                  <LoadingSkeleton lines={4} />
                ) : materialItems.length === 0 ? (
                  <EmptyState title="Nessun materiale" description="Aggiungi i prodotti standard per questo tipo evento." />
                ) : (
                  <div className="space-y-2">
                    {materialItems.map(item => (
                      <div
                        key={item.id}
                        className={CARD_HOVER_STYLE + ' cursor-pointer'}
                        onClick={() => setEditingMaterial(item)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-medium text-gray-900">
                              {item.product?.nome || 'Prodotto rimosso'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                              {item.product?.brand?.nome && <span>{item.product.brand.nome}</span>}
                              {item.product?.codice && <span>· {item.product.codice}</span>}
                              <span className="font-medium text-gray-700">× {item.quantita}</span>
                            </div>
                            {item.note && <p className="text-sm text-gray-400 mt-0.5">{item.note}</p>}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setDeletingMaterial(item) }}
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
        )}
      </div>

      <AdminTemplateChecklistEditor
        open={editing !== null}
        editing={editing}
        items={items}
        saving={saving}
        onSave={handleSaveChecklist}
        onClose={() => setEditing(null)}
      />

      <AdminTemplateProgramEditor
        open={editingProgram !== null}
        editing={editingProgram}
        saTypes={saTypes}
        programItemsCount={programItems.length}
        saving={saving}
        onSave={handleSaveProgram}
        onClose={() => setEditingProgram(null)}
      />

      <AdminTemplateMaterialEditor
        open={editingMaterial !== null}
        editing={editingMaterial}
        materialItemsCount={materialItems.length}
        saving={saving}
        onSave={handleSaveMaterial}
        onClose={() => setEditingMaterial(null)}
        searchProducts={searchProducts}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Elimina attività"
        message={`Eliminare "${deleting?.descrizione}" dal template? Le attività già create per eventi esistenti non saranno modificate.`}
        confirmLabel="Elimina"
        danger
        onConfirm={handleDeleteChecklist}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={!!deletingProgram}
        title="Elimina voce programma"
        message={`Eliminare "${deletingProgram?.tipo_ref?.nome || deletingProgram?.descrizione}" dal template?`}
        confirmLabel="Elimina"
        danger
        onConfirm={handleDeleteProgram}
        onCancel={() => setDeletingProgram(null)}
      />

      <ConfirmDialog
        open={!!deletingMaterial}
        title="Rimuovi materiale"
        message={`Rimuovere "${deletingMaterial?.product?.nome}" dal template?`}
        confirmLabel="Rimuovi"
        danger
        onConfirm={handleDeleteMaterial}
        onCancel={() => setDeletingMaterial(null)}
      />

      <ConfirmDialog
        open={!!deletingTemplate}
        title="Elimina template"
        message={`Eliminare il template "${tipoLabels[deletingTemplate?.tipo_evento] || deletingTemplate?.tipo_evento} — ${MODALITA_EVENTO[deletingTemplate?.modalita]}"? Tutte le voci (checklist e programma) saranno eliminate. Le attività già create per eventi esistenti non saranno modificate.`}
        confirmLabel="Elimina"
        danger
        onConfirm={handleDeleteTemplate}
        onCancel={() => setDeletingTemplate(null)}
      />
    </div>
  )
}

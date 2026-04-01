import { useEffect, useState } from 'react'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useSubActivitiesStore } from '../../hooks/useSubActivities'
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
import { ACTION_ICONS, CATEGORIA_ICONS, SOTTO_ATTIVITA_ICONS } from '../../lib/icons'
import {
  TIPO_EVENTO, MODALITA_EVENTO,
  CATEGORIA_ATTIVITA, VERIFICATION_FUNCTIONS,
  INPUT_STYLE, SELECT_STYLE, CARD_HOVER_STYLE,
} from '../../lib/constants'

function wouldCreateCycle(itemId, targetId, allItems) {
  if (!itemId || !targetId) return false
  const visited = new Set()
  let current = targetId
  while (current) {
    if (current === itemId) return true
    if (visited.has(current)) return false
    visited.add(current)
    const item = allItems.find(i => i.id === current)
    current = item?.dipende_da || null
  }
  return false
}

function topologicalSort(items) {
  const sorted = []
  const visited = new Set()
  const itemMap = new Map(items.map(i => [i.id, i]))
  function visit(item) {
    if (visited.has(item.id)) return
    visited.add(item.id)
    if (item.dipende_da && itemMap.has(item.dipende_da)) {
      visit(itemMap.get(item.dipende_da))
    }
    sorted.push(item)
  }
  items.forEach(i => visit(i))
  return sorted
}

function getDepthLevel(item, items, maxDepth = 3) {
  let depth = 0
  let current = item
  while (current.dipende_da && depth < maxDepth) {
    depth++
    current = items.find(i => i.id === current.dipende_da) || { dipende_da: null }
  }
  return depth
}

const PERMISSION_OPTIONS = {
  gestione_marketing: 'Marketing',
  gestione_spedizioni: 'Spedizioni',
  gestione_magazzino: 'Magazzino',
  gestione_organizzazione: 'Organizzazione',
  gestione_costi: 'Costi',
}

const PROGRAM_EMPTY_FORM = {
  tipo_sotto_attivita_id: '',
  descrizione: '',
  giorno: 1,
  orario: '',
  durata_minuti: '',
  luogo: '',
  fornitore: '',
  note: '',
}

export function AdminTemplate() {
  const fetchTemplates = useActivitiesStore(s => s.fetchTemplates)
  const fetchTemplateItems = useActivitiesStore(s => s.fetchTemplateItems)
  const createTemplateItem = useActivitiesStore(s => s.createTemplateItem)
  const updateTemplateItem = useActivitiesStore(s => s.updateTemplateItem)
  const deleteTemplateItem = useActivitiesStore(s => s.deleteTemplateItem)
  const createTemplate = useActivitiesStore(s => s.createTemplate)
  const deleteTemplate = useActivitiesStore(s => s.deleteTemplate)
  const fetchProgramTemplateItems = useActivitiesStore(s => s.fetchProgramTemplateItems)
  const createProgramTemplateItem = useActivitiesStore(s => s.createProgramTemplateItem)
  const updateProgramTemplateItem = useActivitiesStore(s => s.updateProgramTemplateItem)
  const deleteProgramTemplateItem = useActivitiesStore(s => s.deleteProgramTemplateItem)
  const fetchTemplateMaterials = useActivitiesStore(s => s.fetchTemplateMaterials)
  const createTemplateMaterial = useActivitiesStore(s => s.createTemplateMaterial)
  const updateTemplateMaterial = useActivitiesStore(s => s.updateTemplateMaterial)
  const deleteTemplateMaterial = useActivitiesStore(s => s.deleteTemplateMaterial)
  const searchProducts = useActivitiesStore(s => s.searchProducts)
  const saTypes = useSubActivitiesStore(s => s.types)
  const fetchSaTypes = useSubActivitiesStore(s => s.fetchTypes)
  const addToast = useToastStore(s => s.add)

  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [items, setItems] = useState([])
  const [programItems, setProgramItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTipo, setNewTipo] = useState('')
  const [newModalita, setNewModalita] = useState('')
  const [deletingTemplate, setDeletingTemplate] = useState(null)
  const [materialItems, setMaterialItems] = useState([])
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [deletingMaterial, setDeletingMaterial] = useState(null)
  const [materialForm, setMaterialForm] = useState({ product_id: '', quantita: 1, note: '' })
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [section, setSection] = useState('checklist') // 'checklist' | 'programma' | 'materiale'
  const [editingProgram, setEditingProgram] = useState(null)
  const [deletingProgram, setDeletingProgram] = useState(null)
  const [programForm, setProgramForm] = useState(PROGRAM_EMPTY_FORM)

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

  // ── Program template handlers ──

  function openEditProgram(item) {
    setEditingProgram(item || {})
    setProgramForm(item?.id ? {
      tipo_sotto_attivita_id: item.tipo_sotto_attivita_id || '',
      descrizione: item.descrizione || '',
      giorno: item.giorno ?? 1,
      orario: item.orario || '',
      durata_minuti: item.durata_minuti ?? '',
      luogo: item.luogo || '',
      fornitore: item.fornitore || '',
      note: item.note || '',
    } : { ...PROGRAM_EMPTY_FORM })
  }

  async function handleSaveProgram() {
    if (!programForm.tipo_sotto_attivita_id) return
    setSaving(true)
    const typeName = saTypes.find(t => t.id === programForm.tipo_sotto_attivita_id)?.nome || ''
    const payload = {
      tipo_sotto_attivita_id: programForm.tipo_sotto_attivita_id,
      descrizione: programForm.descrizione.trim() || typeName,
      giorno: programForm.giorno ? parseInt(programForm.giorno) : 1,
      orario: programForm.orario || null,
      durata_minuti: programForm.durata_minuti !== '' ? parseInt(programForm.durata_minuti) : null,
      luogo: programForm.luogo.trim() || null,
      fornitore: programForm.fornitore.trim() || null,
      note: programForm.note.trim() || null,
      ordine: editingProgram?.id ? editingProgram.ordine : programItems.length,
    }
    const { error } = editingProgram?.id
      ? await updateProgramTemplateItem(editingProgram.id, payload)
      : await createProgramTemplateItem(selectedTemplate.id, payload)
    setSaving(false)
    if (error) {
      addToast(error?.message || 'Errore nel salvataggio', 'error')
      return
    }
    addToast(editingProgram?.id ? 'Voce aggiornata' : 'Voce aggiunta', 'success')
    setEditingProgram(null)
    loadItems(selectedTemplate.id)
  }

  async function handleDeleteProgram() {
    const { error } = await deleteProgramTemplateItem(deletingProgram.id)
    setDeletingProgram(null)
    if (error) {
      addToast(error?.message || 'Errore', 'error')
      return
    }
    addToast('Voce rimossa dal template', 'success')
    loadItems(selectedTemplate.id)
  }

  // ── Material template handlers ──

  function openEditMaterial(item) {
    setEditingMaterial(item || {})
    setSelectedProduct(item?.product || null)
    setProductSearch(item?.product ? `${item.product.nome}${item.product.brand?.nome ? ` — ${item.product.brand.nome}` : ''}` : '')
    setProductResults([])
    setMaterialForm(item?.id ? {
      product_id: item.product_id || '',
      quantita: item.quantita ?? 1,
      note: item.note || '',
    } : { product_id: '', quantita: 1, note: '' })
  }

  async function handleSearchProduct(term) {
    setProductSearch(term)
    if (term.length < 2) { setProductResults([]); return }
    const { data } = await searchProducts(term)
    setProductResults(data)
  }

  function handleSelectProduct(p) {
    setSelectedProduct(p)
    setMaterialForm(f => ({ ...f, product_id: p.id }))
    setProductSearch(`${p.nome}${p.brand?.nome ? ` — ${p.brand.nome}` : ''}`)
    setProductResults([])
  }

  async function handleSaveMaterial() {
    if (!materialForm.product_id) return
    setSaving(true)
    const payload = {
      product_id: materialForm.product_id,
      quantita: parseInt(materialForm.quantita) || 1,
      note: materialForm.note.trim() || null,
      ordine: editingMaterial?.id ? editingMaterial.ordine : materialItems.length,
    }
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
        {/* Template selector */}
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
                    {Object.entries(TIPO_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                  {TIPO_EVENTO[t.tipo_evento] || t.tipo_evento}
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

        {/* Section toggle + items */}
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
                    {topologicalSort(items).map(item => {
                      const depth = getDepthLevel(item, items)
                      return (
                        <div
                          key={item.id}
                          className={CARD_HOVER_STYLE + ' cursor-pointer'}
                          style={{ marginLeft: `${depth * 2}rem` }}
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
                    Programma: {TIPO_EVENTO[selectedTemplate.tipo_evento]} — {MODALITA_EVENTO[selectedTemplate.modalita]}
                  </h2>
                  <Button onClick={() => openEditProgram(null)}>
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
                        onClick={() => openEditProgram(item)}
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
                    Materiale: {TIPO_EVENTO[selectedTemplate.tipo_evento]} — {MODALITA_EVENTO[selectedTemplate.modalita]}
                  </h2>
                  <Button onClick={() => openEditMaterial(null)}>
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
                        onClick={() => openEditMaterial(item)}
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

          <FormField label="Tipo verifica">
            <div className="flex gap-2">
              {[
                { value: 'manuale', label: 'Manuale', desc: 'Un responsabile segna il completamento' },
                { value: 'automatica', label: 'Automatica', desc: 'Il sistema verifica in base ai dati' },
                { value: 'documento', label: 'Documento', desc: 'Richiede un documento approvato' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tipo_verifica: opt.value }))}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 text-left min-h-[48px] transition-all ${
                    form.tipo_verifica === opt.value
                      ? 'border-mikai-400 bg-mikai-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-base">{opt.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
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
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              {form.verifica_automatica && VERIFICATION_FUNCTIONS[form.verifica_automatica] && (
                <p className="text-sm text-gray-500 mt-1">
                  {VERIFICATION_FUNCTIONS[form.verifica_automatica].desc}
                </p>
              )}
            </FormField>
          )}

          <FormField label="Dipende da" hint="L'attività non può iniziare finché la dipendenza non è completata">
            <select
              className={SELECT_STYLE}
              value={form.dipende_da}
              onChange={e => {
                const targetId = e.target.value
                if (targetId && wouldCreateCycle(editing?.id, targetId, items)) {
                  addToast('Dipendenza circolare non consentita', 'warning')
                  return
                }
                setForm(f => ({ ...f, dipende_da: targetId }))
              }}
            >
              <option value="">Nessuna dipendenza</option>
              {items
                .filter(i => i.id !== editing?.id)
                .map(i => {
                  const isCyclic = wouldCreateCycle(editing?.id, i.id, items)
                  return (
                    <option key={i.id} value={i.id} disabled={isCyclic}>
                      {i.descrizione} ({i.giorni_prima_evento}gg){isCyclic ? ' [circolare]' : ''}
                    </option>
                  )
                })}
            </select>
          </FormField>
        </div>
      </Modal>

      {/* Delete confirmation - checklist */}
      <ConfirmDialog
        open={!!deleting}
        title="Elimina attività"
        message={`Eliminare "${deleting?.descrizione}" dal template? Le attività già create per eventi esistenti non saranno modificate.`}
        confirmLabel="Elimina"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      {/* Program edit modal */}
      <Modal
        open={editingProgram !== null}
        onClose={() => setEditingProgram(null)}
        title={editingProgram?.id ? 'Modifica voce programma' : 'Nuova voce programma'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEditingProgram(null)}>Annulla</Button>
            <Button onClick={handleSaveProgram} loading={saving} disabled={!programForm.tipo_sotto_attivita_id}>
              {editingProgram?.id ? 'Salva' : 'Crea'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Tipo sotto-attività" required>
            <select
              className={SELECT_STYLE}
              value={programForm.tipo_sotto_attivita_id}
              onChange={e => setProgramForm(f => ({ ...f, tipo_sotto_attivita_id: e.target.value }))}
            >
              <option value="">Seleziona...</option>
              {saTypes.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </FormField>

          <FormField label="Descrizione" hint="Opzionale — se vuoto usa il nome del tipo">
            <input
              className={INPUT_STYLE}
              value={programForm.descrizione}
              onChange={e => setProgramForm(f => ({ ...f, descrizione: e.target.value }))}
              placeholder="es. Sessione pratica su femore"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Giorno" hint="1 = primo giorno evento">
              <input
                type="number"
                min="1"
                className={INPUT_STYLE}
                value={programForm.giorno}
                onChange={e => setProgramForm(f => ({ ...f, giorno: e.target.value }))}
              />
            </FormField>
            <FormField label="Orario">
              <input
                type="time"
                className={INPUT_STYLE}
                value={programForm.orario}
                onChange={e => setProgramForm(f => ({ ...f, orario: e.target.value }))}
              />
            </FormField>
            <FormField label="Durata (minuti)">
              <input
                type="number"
                min="1"
                className={INPUT_STYLE}
                value={programForm.durata_minuti}
                onChange={e => setProgramForm(f => ({ ...f, durata_minuti: e.target.value }))}
                placeholder="es. 60"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Luogo">
              <input
                className={INPUT_STYLE}
                value={programForm.luogo}
                onChange={e => setProgramForm(f => ({ ...f, luogo: e.target.value }))}
                placeholder="es. Sala operatoria"
              />
            </FormField>
            <FormField label="Fornitore">
              <input
                className={INPUT_STYLE}
                value={programForm.fornitore}
                onChange={e => setProgramForm(f => ({ ...f, fornitore: e.target.value }))}
                placeholder="es. Catering XYZ"
              />
            </FormField>
          </div>

          <FormField label="Note">
            <textarea
              className={INPUT_STYLE + ' min-h-[80px]'}
              value={programForm.note}
              onChange={e => setProgramForm(f => ({ ...f, note: e.target.value }))}
            />
          </FormField>
        </div>
      </Modal>

      {/* Delete confirmation - program */}
      <ConfirmDialog
        open={!!deletingProgram}
        title="Elimina voce programma"
        message={`Eliminare "${deletingProgram?.tipo_ref?.nome || deletingProgram?.descrizione}" dal template?`}
        confirmLabel="Elimina"
        danger
        onConfirm={handleDeleteProgram}
        onCancel={() => setDeletingProgram(null)}
      />

      {/* Material edit modal */}
      <Modal
        open={editingMaterial !== null}
        onClose={() => setEditingMaterial(null)}
        title={editingMaterial?.id ? 'Modifica materiale template' : 'Aggiungi materiale template'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEditingMaterial(null)}>Annulla</Button>
            <Button onClick={handleSaveMaterial} loading={saving} disabled={!materialForm.product_id}>
              {editingMaterial?.id ? 'Salva' : 'Aggiungi'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Prodotto" required>
            <div className="relative">
              <input
                className={INPUT_STYLE}
                value={productSearch}
                onChange={e => handleSearchProduct(e.target.value)}
                placeholder="Cerca prodotto per nome..."
              />
              {productResults.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {productResults.map(p => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="w-full px-4 py-3 text-left hover:bg-mikai-50 min-h-[48px] text-base"
                      >
                        <span className="font-medium">{p.nome}</span>
                        {p.brand?.nome && <span className="text-gray-500 ml-2">— {p.brand.nome}</span>}
                        {p.codice && <span className="text-gray-400 ml-2 text-sm">{p.codice}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Quantità">
              <input
                type="number"
                min="1"
                className={INPUT_STYLE}
                value={materialForm.quantita}
                onChange={e => setMaterialForm(f => ({ ...f, quantita: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Note">
            <input
              className={INPUT_STYLE}
              value={materialForm.note}
              onChange={e => setMaterialForm(f => ({ ...f, note: e.target.value }))}
              placeholder="es. Per ogni tavolo, con strumentario"
            />
          </FormField>
        </div>
      </Modal>

      {/* Delete confirmation - material */}
      <ConfirmDialog
        open={!!deletingMaterial}
        title="Rimuovi materiale"
        message={`Rimuovere "${deletingMaterial?.product?.nome}" dal template?`}
        confirmLabel="Rimuovi"
        danger
        onConfirm={handleDeleteMaterial}
        onCancel={() => setDeletingMaterial(null)}
      />

      {/* Delete confirmation - template */}
      <ConfirmDialog
        open={!!deletingTemplate}
        title="Elimina template"
        message={`Eliminare il template "${TIPO_EVENTO[deletingTemplate?.tipo_evento]} — ${MODALITA_EVENTO[deletingTemplate?.modalita]}"? Tutte le voci (checklist e programma) saranno eliminate. Le attività già create per eventi esistenti non saranno modificate.`}
        confirmLabel="Elimina"
        danger
        onConfirm={handleDeleteTemplate}
        onCancel={() => setDeletingTemplate(null)}
      />
    </div>
  )
}

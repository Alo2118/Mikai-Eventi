import { useState, useEffect, useCallback } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useToastStore } from '../../components/ui/Toast'
import { AdminTable } from '../../components/ui/AdminTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { Icon } from '../../components/ui/Icon'
import { ACTION_ICONS, ADMIN_ICONS, POSIZIONE_ICONS } from '../../lib/icons'
import {
  POSIZIONE_MATERIALE,
  POSIZIONE_MATERIALE_COLORE,
  INPUT_STYLE,
  CARD_STYLE,
  FORM_CONTAINER_STYLE,
  SUMMARY_BAR_STYLE,
} from '../../lib/constants'
import { useProductTypes } from '../../hooks/useProductTypes'
import { toDriveImageUrl } from '../../lib/format-utils'

const CHECK = 'w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400'

// Types that default to serialized (per-specimen) tracking
const SERIALIZED_TYPES = new Set(['demo_kit', 'strumentario', 'montaggio'])

function defaultSerializzato(tipo) {
  return SERIALIZED_TYPES.has(tipo)
}

const COLOR_TO_CLASSES = {
  green:  { bg: 'bg-green-100',  text: 'text-green-700'  },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  mikai:  { bg: 'bg-mikai-100',  text: 'text-mikai-700'  },
  red:    { bg: 'bg-red-100',    text: 'text-red-700'    },
}

function PositionPill({ posizione }) {
  const label = POSIZIONE_MATERIALE[posizione] || posizione
  const color = POSIZIONE_MATERIALE_COLORE[posizione] || 'green'
  const cls = COLOR_TO_CLASSES[color] || COLOR_TO_CLASSES.green
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium ${cls.bg} ${cls.text}`}>
      <Icon icon={POSIZIONE_ICONS[posizione]} size={12} />
      {label}
    </span>
  )
}

export function AdminProdotti() {
  const products = useAdminStore(s => s.products)
  const brands = useAdminStore(s => s.brands)
  const bodySections = useAdminStore(s => s.bodySections)
  const fetchProducts = useAdminStore(s => s.fetchProducts)
  const fetchBrands = useAdminStore(s => s.fetchBrands)
  const fetchBodySections = useAdminStore(s => s.fetchBodySections)
  const createProduct = useAdminStore(s => s.createProduct)
  const updateProduct = useAdminStore(s => s.updateProduct)
  const deleteProduct = useAdminStore(s => s.deleteProduct)
  const setProductBodySections = useAdminStore(s => s.setProductBodySections)
  const fetchKitContents = useAdminStore(s => s.fetchKitContents)
  const createKitContent = useAdminStore(s => s.createKitContent)
  const updateKitContent = useAdminStore(s => s.updateKitContent)
  const deleteKitContent = useAdminStore(s => s.deleteKitContent)
  const fetchProductSpecimens = useAdminStore(s => s.fetchProductSpecimens)
  const createSpecimen = useAdminStore(s => s.createSpecimen)
  const updateSpecimen = useAdminStore(s => s.updateSpecimen)
  const deleteSpecimen = useAdminStore(s => s.deleteSpecimen)
  const fetchProductStock = useAdminStore(s => s.fetchProductStock)
  const updateProductStock = useAdminStore(s => s.updateProductStock)
  const addToast = useToastStore(s => s.add)
  const { productTypes, labels: tipoLabels } = useProductTypes()

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [selectedSections, setSelectedSections] = useState([])
  const [kitContents, setKitContents] = useState([])
  const [newPiece, setNewPiece] = useState({ piece_name: '', piece_code: '', quantity: 1 })
  const [editingPiece, setEditingPiece] = useState(null)
  const [editingPieceData, setEditingPieceData] = useState({})

  // Specimens (serialized)
  const [specimens, setSpecimens] = useState([])
  const [newSpecimen, setNewSpecimen] = useState({ codice_inventario: '', posizione_attuale: 'in_magazzino', note: '' })
  const [editingSpecimen, setEditingSpecimen] = useState(null) // specimen id being edited inline
  const [editingSpecimenData, setEditingSpecimenData] = useState({})
  const [deletingSpecimen, setDeletingSpecimen] = useState(null)
  const [specimenSaving, setSpecimenSaving] = useState(false)

  // Stock (quantity)
  const [stock, setStock] = useState({ quantita_disponibile: 0, soglia_minima: 0 })
  const [stockSaving, setStockSaving] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchBrands()
    fetchBodySections()
  }, [fetchProducts, fetchBrands, fetchBodySections])

  const loadRelated = useCallback(async (product) => {
    const sectionIds = (product.body_sections || []).map(bs => bs.body_section?.id).filter(Boolean)
    setSelectedSections(sectionIds)
    if (product.id) {
      const { data: kc } = await fetchKitContents(product.id)
      setKitContents(kc || [])
      if (product.serializzato) {
        const { data: sp } = await fetchProductSpecimens(product.id)
        setSpecimens(sp || [])
        setStock({ quantita_disponibile: 0, soglia_minima: 0 })
      } else {
        setSpecimens([])
        const { data: st } = await fetchProductStock(product.id)
        setStock({ quantita_disponibile: st?.quantita_disponibile ?? 0, soglia_minima: st?.soglia_minima ?? 0 })
      }
    } else {
      setKitContents([])
      setSpecimens([])
      setStock({ quantita_disponibile: 0, soglia_minima: 0 })
    }
  }, [fetchKitContents, fetchProductSpecimens, fetchProductStock])

  const handleEdit = useCallback(async (row) => {
    const form = {
      ...row,
      brand_id: row.brand?.id || row.brand_id || '',
      serializzato: row.serializzato !== undefined ? row.serializzato : defaultSerializzato(row.tipo),
    }
    setEditing(form)
    setNewPiece({ piece_name: '', piece_code: '', quantity: 1 })
    setNewSpecimen({ codice_inventario: '', posizione_attuale: 'in_magazzino', note: '' })
    setEditingSpecimen(null)
    await loadRelated({ ...form, serializzato: form.serializzato })
  }, [loadRelated])

  const handleNew = () => {
    const tipo = 'demo_kit'
    setEditing({ nome: '', brand_id: '', tipo, codice: '', descrizione: '', foto_url: '', attivo: true, serializzato: defaultSerializzato(tipo) })
    setSelectedSections([])
    setKitContents([])
    setNewPiece({ piece_name: '', piece_code: '', quantity: 1 })
    setSpecimens([])
    setNewSpecimen({ codice_inventario: '', posizione_attuale: 'in_magazzino', note: '' })
    setEditingSpecimen(null)
    setStock({ quantita_disponibile: 0, soglia_minima: 0 })
  }

  const handleTipoChange = (tipo) => {
    setEditing(prev => ({ ...prev, tipo, serializzato: defaultSerializzato(tipo) }))
  }

  const handleSerializzatoChange = async (val) => {
    setEditing(prev => ({ ...prev, serializzato: val }))
    if (editing?.id) {
      if (val) {
        const { data: sp } = await fetchProductSpecimens(editing.id)
        setSpecimens(sp || [])
        setStock({ quantita_disponibile: 0, soglia_minima: 0 })
      } else {
        setSpecimens([])
        const { data: st } = await fetchProductStock(editing.id)
        setStock({ quantita_disponibile: st?.quantita_disponibile ?? 0, soglia_minima: st?.soglia_minima ?? 0 })
      }
    }
  }

  // Product save
  const handleSave = async () => {
    setSaving(true)
    const payload = {
      nome: editing.nome || '',
      brand_id: editing.brand_id || null,
      tipo: editing.tipo || 'demo_kit',
      codice: editing.codice || null,
      descrizione: editing.descrizione || null,
      foto_url: editing.foto_url || null,
      attivo: editing.attivo !== false,
      serializzato: editing.serializzato === true,
    }
    const isNew = !editing.id
    const res = isNew ? await createProduct(payload) : await updateProduct(editing.id, payload)
    if (res.error) { setSaving(false); addToast(res.error, 'error'); return }
    const productId = isNew ? res.data?.id : editing.id
    if (productId) {
      await setProductBodySections(productId, selectedSections)
    }
    setSaving(false)
    addToast(isNew ? 'Prodotto creato' : 'Prodotto aggiornato', 'success')
    if (isNew && productId) {
      setEditing(prev => ({ ...prev, id: productId }))
    }
  }

  const handleDelete = async () => {
    const { error } = await deleteProduct(deleting.id)
    if (error) { addToast(error, 'error') } else { addToast('Prodotto eliminato', 'success') }
    setDeleting(null)
  }

  // Kit pieces
  const handleAddPiece = async () => {
    if (!editing.id || !newPiece.piece_name.trim()) return
    const { error } = await createKitContent({
      product_id: editing.id,
      piece_name: newPiece.piece_name,
      piece_code: newPiece.piece_code || null,
      quantity: parseInt(newPiece.quantity) || 1,
    })
    if (error) { addToast(error, 'error'); return }
    const { data } = await fetchKitContents(editing.id)
    setKitContents(data || [])
    setNewPiece({ piece_name: '', piece_code: '', quantity: 1 })
  }

  const handleDeletePiece = async (pieceId) => {
    const { error } = await deleteKitContent(pieceId)
    if (error) { addToast(error, 'error'); return }
    const { data } = await fetchKitContents(editing.id)
    setKitContents(data || [])
  }

  const handleStartEditPiece = (kc) => {
    setEditingPiece(kc.id)
    setEditingPieceData({ piece_name: kc.piece_name, piece_code: kc.piece_code || '', quantity: kc.quantity })
  }

  const handleSavePiece = async () => {
    if (!editingPiece || !editingPieceData.piece_name?.trim()) return
    const { error } = await updateKitContent(editingPiece, {
      piece_name: editingPieceData.piece_name,
      piece_code: editingPieceData.piece_code || null,
      quantity: parseInt(editingPieceData.quantity) || 1,
    })
    if (error) { addToast(error, 'error'); return }
    const { data } = await fetchKitContents(editing.id)
    setKitContents(data || [])
    setEditingPiece(null)
  }

  const handleCancelEditPiece = () => {
    setEditingPiece(null)
    setEditingPieceData({})
  }

  // Auto-generate next inventory code from product code + progressive number
  const nextInventoryCode = useCallback(() => {
    const base = editing?.codice?.trim()
    if (!base) return ''
    const existing = specimens
      .map(sp => sp.codice_inventario || '')
      .filter(c => c.startsWith(base + '-'))
      .map(c => parseInt(c.slice(base.length + 1), 10))
      .filter(n => !isNaN(n))
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
    return `${base}-${String(next).padStart(3, '0')}`
  }, [editing?.codice, specimens])

  // Auto-fill codice_inventario when specimens load or after adding one
  useEffect(() => {
    const code = nextInventoryCode()
    if (code) setNewSpecimen(s => ({ ...s, codice_inventario: code }))
  }, [nextInventoryCode])

  // Specimens
  const handleAddSpecimen = async () => {
    if (!editing.id || !newSpecimen.codice_inventario.trim()) return
    setSpecimenSaving(true)
    const tipo = editing.tipo === 'pezzo_sfuso' ? 'altro' : (editing.tipo === 'gadget' ? 'altro' : editing.tipo)
    const { error } = await createSpecimen({
      product_id: editing.id,
      nome: editing.nome,
      tipo,
      codice_inventario: newSpecimen.codice_inventario,
      posizione_attuale: newSpecimen.posizione_attuale || 'in_magazzino',
      note: newSpecimen.note || null,
      attivo: true,
    })
    setSpecimenSaving(false)
    if (error) { addToast(error, 'error'); return }
    const { data } = await fetchProductSpecimens(editing.id)
    setSpecimens(data || [])
    setNewSpecimen({ codice_inventario: '', posizione_attuale: 'in_magazzino', note: '' })
  }

  const handleStartEditSpecimen = (sp) => {
    setEditingSpecimen(sp.id)
    setEditingSpecimenData({
      codice_inventario: sp.codice_inventario || '',
      posizione_attuale: sp.posizione_attuale || 'in_magazzino',
      note: sp.note || '',
    })
  }

  const handleSaveSpecimen = async () => {
    setSpecimenSaving(true)
    const { error } = await updateSpecimen(editingSpecimen, {
      codice_inventario: editingSpecimenData.codice_inventario || null,
      posizione_attuale: editingSpecimenData.posizione_attuale || 'in_magazzino',
      note: editingSpecimenData.note || null,
    })
    setSpecimenSaving(false)
    if (error) { addToast(error, 'error'); return }
    const { data } = await fetchProductSpecimens(editing.id)
    setSpecimens(data || [])
    setEditingSpecimen(null)
  }

  const handleDeleteSpecimen = async () => {
    const { error } = await deleteSpecimen(deletingSpecimen.id)
    if (error) { addToast(error, 'error') } else { addToast('Esemplare eliminato', 'success') }
    setDeletingSpecimen(null)
    if (editing?.id) {
      const { data } = await fetchProductSpecimens(editing.id)
      setSpecimens(data || [])
    }
  }

  // Stock
  const handleSaveStock = async () => {
    if (!editing?.id) return
    setStockSaving(true)
    const { error } = await updateProductStock(editing.id, stock.quantita_disponibile, stock.soglia_minima)
    setStockSaving(false)
    if (error) { addToast(error, 'error'); return }
    addToast('Stock aggiornato', 'success')
  }

  const toggleSection = (sectionId) => {
    setSelectedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    )
  }

  // Table columns — with inventory info
  const columns = [
    { key: 'nome', label: 'Nome', render: (r) => (
      <div className="flex items-center gap-3">
        {r.foto_url ? (
          <img
            src={toDriveImageUrl(r.foto_url)}
            alt={r.nome}
            className="w-8 h-8 object-cover rounded shrink-0"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
            <Icon icon={ADMIN_ICONS.prodotti} size={16} className="text-gray-400" />
          </div>
        )}
        <span>{r.nome}</span>
      </div>
    )},
    { key: 'brand_nome', label: 'Brand', render: (r) => r.brand?.nome || '-' },
    { key: 'tipo', label: 'Tipo', render: (r) => tipoLabels[r.tipo] || r.tipo },
    { key: 'inventario', label: 'Inventario', render: (r) => {
      const serializzato = r.serializzato !== undefined ? r.serializzato : defaultSerializzato(r.tipo)
      if (serializzato) {
        const count = r.materials_count ?? r.specimen_count ?? null
        return (
          <span className="text-sm text-gray-600">
            {count !== null ? `${count} esemplari` : '—'}
          </span>
        )
      }
      const qty = r.quantita_disponibile ?? null
      const soglia = r.soglia_minima ?? 0
      if (qty === null) return <span className="text-sm text-gray-400">—</span>
      const sottoSoglia = qty <= soglia
      return (
        <span className={`text-sm font-medium ${sottoSoglia ? 'text-red-600' : 'text-gray-700'}`}>
          {qty} pz{sottoSoglia && <span className="ml-1 text-red-500">⚠</span>}
        </span>
      )
    }},
    { key: 'attivo', label: 'Attivo', render: (r) => (
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${r.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {r.attivo ? 'Sì' : 'No'}
      </span>
    )},
  ]

  const stockUnderThreshold = stock.quantita_disponibile <= stock.soglia_minima && stock.quantita_disponibile !== null

  return (
    <div>
      <MobileHeader title="Prodotti & Kit" subtitle="Gestisci prodotti e kit del catalogo" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Prodotti & Kit' }]} />
      </div>
      <PageHeader title="Prodotti & Kit" subtitle="Gestisci prodotti e kit del catalogo" />

      <div className="px-4 md:px-8 pb-8">
        {editing ? (
          <div className="space-y-6 max-w-2xl">
            {/* ── Dati prodotto ── */}
            <div className={CARD_STYLE + ' md:p-6 space-y-4'}>
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Modifica prodotto' : 'Nuovo prodotto'}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                <input className={INPUT_STYLE} value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <select className={INPUT_STYLE} value={editing.brand_id || ''} onChange={e => setEditing({ ...editing, brand_id: e.target.value })}>
                    <option value="">-- Seleziona --</option>
                    {brands.filter(b => b.attivo).map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select className={INPUT_STYLE} value={editing.tipo || 'demo_kit'} onChange={e => handleTipoChange(e.target.value)}>
                    {productTypes.filter(pt => pt.attivo).map(pt => <option key={pt.codice} value={pt.codice}>{pt.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Modalità gestione */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modalità gestione</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => handleSerializzatoChange(true)}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors min-h-[48px] flex-1 ${editing.serializzato ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${editing.serializzato ? 'border-mikai-400 bg-mikai-400' : 'border-gray-300'}`}>
                      {editing.serializzato && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-base font-medium text-gray-900">Gestione a esemplari</div>
                      <div className="text-sm text-gray-500">Traccia ogni pezzo con codice e posizione</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSerializzatoChange(false)}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors min-h-[48px] flex-1 ${!editing.serializzato ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${!editing.serializzato ? 'border-mikai-400 bg-mikai-400' : 'border-gray-300'}`}>
                      {!editing.serializzato && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-base font-medium text-gray-900">Gestione a quantità</div>
                      <div className="text-sm text-gray-500">Traccia solo lo stock totale</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
                <input className={INPUT_STYLE} value={editing.codice || ''} onChange={e => setEditing({ ...editing, codice: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea className={`${INPUT_STYLE} min-h-[96px]`} value={editing.descrizione || ''} onChange={e => setEditing({ ...editing, descrizione: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link immagine (Google Drive o URL diretto)</label>
                <input
                  className={INPUT_STYLE}
                  value={editing.foto_url || ''}
                  onChange={e => setEditing({ ...editing, foto_url: e.target.value })}
                  placeholder="https://drive.google.com/file/d/..."
                />
                <p className="text-xs text-gray-500 mt-1">Incolla il link di condivisione di Google Drive</p>
                {editing.foto_url && (
                  <div className="mt-2 flex items-start gap-3">
                    <img
                      src={toDriveImageUrl(editing.foto_url)}
                      alt="Anteprima"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, foto_url: '' })}
                      className="text-sm text-red-500 hover:text-red-700 mt-1"
                    >
                      Rimuovi immagine
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className={CHECK} checked={editing.attivo !== false} onChange={e => setEditing({ ...editing, attivo: e.target.checked })} id="attivo" />
                <label htmlFor="attivo" className="text-base text-gray-700">Attivo</label>
              </div>
            </div>

            {/* ── Distretti anatomici ── */}
            <div className={CARD_STYLE + ' md:p-6'}>
              <h3 className="font-semibold text-lg text-gray-900 mb-3">Distretti anatomici</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {bodySections.filter(bs => bs.attivo).map(bs => (
                  <label key={bs.id} className="flex items-center gap-2 text-base text-gray-700 cursor-pointer">
                    <input type="checkbox" className={CHECK} checked={selectedSections.includes(bs.id)} onChange={() => toggleSection(bs.id)} />
                    {bs.nome}
                  </label>
                ))}
              </div>
            </div>

            {/* ── Contenuto kit — only for existing products ── */}
            {editing.id && (
              <div className={CARD_STYLE + ' md:p-6'}>
                <h3 className="font-semibold text-lg text-gray-900 mb-3">Contenuto kit</h3>
                {kitContents.length > 0 && (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-3 py-2 text-sm font-medium text-gray-500">Pezzo</th>
                          <th className="px-3 py-2 text-sm font-medium text-gray-500">Codice</th>
                          <th className="px-3 py-2 text-sm font-medium text-gray-500">Qtà</th>
                          <th className="px-3 py-2 w-12" />
                        </tr>
                      </thead>
                      <tbody>
                        {kitContents.map(kc => (
                          <tr key={kc.id} className="border-b border-gray-100">
                            {editingPiece === kc.id ? (
                              <>
                                <td className="px-3 py-1"><input className={INPUT_STYLE} value={editingPieceData.piece_name} onChange={e => setEditingPieceData(d => ({ ...d, piece_name: e.target.value }))} /></td>
                                <td className="px-3 py-1"><input className={INPUT_STYLE} value={editingPieceData.piece_code} onChange={e => setEditingPieceData(d => ({ ...d, piece_code: e.target.value }))} /></td>
                                <td className="px-3 py-1"><input type="number" min="1" className={INPUT_STYLE + ' w-20'} value={editingPieceData.quantity} onChange={e => setEditingPieceData(d => ({ ...d, quantity: e.target.value }))} /></td>
                                <td className="px-3 py-1">
                                  <div className="flex gap-1">
                                    <button onClick={handleSavePiece} className="text-green-600 hover:text-green-700 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Salva">
                                      <Icon icon={ACTION_ICONS.check} size={16} />
                                    </button>
                                    <button onClick={handleCancelEditPiece} className="text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Annulla">
                                      <Icon icon={ACTION_ICONS.close} size={16} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 text-base cursor-pointer hover:text-mikai-500" onClick={() => handleStartEditPiece(kc)}>{kc.piece_name}</td>
                                <td className="px-3 py-2 text-base text-gray-500 cursor-pointer hover:text-mikai-500" onClick={() => handleStartEditPiece(kc)}>{kc.piece_code || '-'}</td>
                                <td className="px-3 py-2 text-base cursor-pointer hover:text-mikai-500" onClick={() => handleStartEditPiece(kc)}>{kc.quantity}</td>
                                <td className="px-3 py-2">
                                  <button onClick={() => handleDeletePiece(kc.id)} className="text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Rimuovi pezzo">
                                    <Icon icon={ACTION_ICONS.close} size={16} />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Nome pezzo</label>
                    <input className={INPUT_STYLE} value={newPiece.piece_name} onChange={e => setNewPiece({ ...newPiece, piece_name: e.target.value })} placeholder="Nome pezzo" />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-sm text-gray-600 mb-1">Codice</label>
                    <input className={INPUT_STYLE} value={newPiece.piece_code} onChange={e => setNewPiece({ ...newPiece, piece_code: e.target.value })} placeholder="Codice" />
                  </div>
                  <div className="w-full md:w-24">
                    <label className="block text-sm text-gray-600 mb-1">Qtà</label>
                    <input type="number" min="1" className={INPUT_STYLE} value={newPiece.quantity} onChange={e => setNewPiece({ ...newPiece, quantity: e.target.value })} />
                  </div>
                  <Button size="sm" onClick={handleAddPiece} disabled={!newPiece.piece_name.trim()}>
                    <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />Aggiungi
                  </Button>
                </div>
              </div>
            )}

            {/* ── Esemplari (serialized) — only for existing products ── */}
            {editing.id && editing.serializzato && (
              <div className={CARD_STYLE + ' md:p-6'}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg text-gray-900">
                    Esemplari
                    {specimens.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">{specimens.length}</span>
                    )}
                  </h3>
                </div>

                {specimens.length > 0 && (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-3 py-2 text-sm font-medium text-gray-500">Cod. Inventario</th>
                          <th className="px-3 py-2 text-sm font-medium text-gray-500">Posizione</th>
                          <th className="px-3 py-2 text-sm font-medium text-gray-500 w-24">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {specimens.map(sp => (
                          <tr key={sp.id} className="border-b border-gray-100">
                            {editingSpecimen === sp.id ? (
                              <>
                                <td className="px-2 py-2">
                                  <input
                                    className={INPUT_STYLE + ' text-sm py-1.5 min-h-[40px]'}
                                    value={editingSpecimenData.codice_inventario}
                                    onChange={e => setEditingSpecimenData(d => ({ ...d, codice_inventario: e.target.value }))}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <select
                                    className={INPUT_STYLE + ' text-sm py-1.5 min-h-[40px]'}
                                    value={editingSpecimenData.posizione_attuale}
                                    onChange={e => setEditingSpecimenData(d => ({ ...d, posizione_attuale: e.target.value }))}
                                  >
                                    {Object.entries(POSIZIONE_MATERIALE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                  </select>
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex gap-1">
                                    <button
                                      onClick={handleSaveSpecimen}
                                      disabled={specimenSaving}
                                      className="text-mikai-500 hover:text-mikai-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
                                      aria-label="Salva esemplare"
                                    >
                                      <Icon icon={ACTION_ICONS.check} size={16} />
                                    </button>
                                    <button
                                      onClick={() => setEditingSpecimen(null)}
                                      className="text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center"
                                      aria-label="Annulla modifica"
                                    >
                                      <Icon icon={ACTION_ICONS.close} size={16} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-3 text-base font-mono">{sp.codice_inventario || '—'}</td>
                                <td className="px-3 py-3"><PositionPill posizione={sp.posizione_attuale} /></td>
                                <td className="px-3 py-3">
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleStartEditSpecimen(sp)}
                                      className="text-gray-400 hover:text-mikai-500 min-h-[48px] min-w-[48px] flex items-center justify-center"
                                      aria-label="Modifica esemplare"
                                    >
                                      <Icon icon={ACTION_ICONS.edit} size={16} />
                                    </button>
                                    <button
                                      onClick={() => setDeletingSpecimen(sp)}
                                      className="text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center"
                                      aria-label="Elimina esemplare"
                                    >
                                      <Icon icon={ACTION_ICONS.close} size={16} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add specimen form */}
                <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
                  <p className="text-sm font-medium text-gray-700">Aggiungi esemplare</p>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">Cod. inventario <span className="text-red-500">*</span></label>
                      <input
                        className={INPUT_STYLE}
                        value={newSpecimen.codice_inventario}
                        onChange={e => setNewSpecimen(s => ({ ...s, codice_inventario: e.target.value }))}
                        placeholder="Es. LCP35-004"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">Posizione</label>
                      <select
                        className={INPUT_STYLE}
                        value={newSpecimen.posizione_attuale}
                        onChange={e => setNewSpecimen(s => ({ ...s, posizione_attuale: e.target.value }))}
                      >
                        {Object.entries(POSIZIONE_MATERIALE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleAddSpecimen}
                      loading={specimenSaving}
                      disabled={!newSpecimen.codice_inventario.trim()}
                    >
                      <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />Aggiungi esemplare
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Stock (quantity) — only for existing products ── */}
            {editing.id && !editing.serializzato && (
              <div className={CARD_STYLE + ' md:p-6'}>
                <h3 className="font-semibold text-lg text-gray-900 mb-4">Stock</h3>
                {stockUnderThreshold && stock.quantita_disponibile !== null && (
                  <div className={SUMMARY_BAR_STYLE + ' mb-4 flex items-center gap-2 bg-red-50 border-red-200'}>
                    <Icon icon={ACTION_ICONS.check} size={16} className="text-red-500" />
                    <span className="text-sm font-medium text-red-700">Sotto soglia minima — riordinare al più presto</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantità disponibile (pz)</label>
                    <input
                      type="number"
                      min="0"
                      className={INPUT_STYLE}
                      value={stock.quantita_disponibile ?? ''}
                      onChange={e => setStock(s => ({ ...s, quantita_disponibile: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soglia minima alert (pz)</label>
                    <input
                      type="number"
                      min="0"
                      className={INPUT_STYLE}
                      value={stock.soglia_minima ?? ''}
                      onChange={e => setStock(s => ({ ...s, soglia_minima: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button size="sm" onClick={handleSaveStock} loading={stockSaving}>
                    Salva stock
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving} disabled={!editing.nome?.trim()}>Salva prodotto</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
            </div>
          </div>
        ) : (
          <AdminTable
            columns={columns}
            rows={products}
            searchField="nome"
            onAdd={handleNew}
            onEdit={handleEdit}
            onDelete={(row) => setDeleting(row)}
            addLabel="Nuovo prodotto"
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Elimina prodotto"
        message={`Sei sicuro di voler eliminare "${deleting?.nome}"?`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        danger
      />

      <ConfirmDialog
        open={!!deletingSpecimen}
        title="Elimina esemplare"
        message={`Sei sicuro di voler eliminare l'esemplare "${deletingSpecimen?.codice_inventario || ''}"?`}
        confirmLabel="Elimina"
        onConfirm={handleDeleteSpecimen}
        onCancel={() => setDeletingSpecimen(null)}
        danger
      />
    </div>
  )
}

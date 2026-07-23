import { useState, useEffect, useCallback, useMemo } from 'react'
import { useProductsStore } from '../../hooks/useProducts'
import { useBrandsStore } from '../../hooks/useBrands'
import { useBodySectionsStore } from '../../hooks/useBodySections'
import { useToastStore } from '../../components/ui/Toast'
import { AdminTable } from '../../components/ui/AdminTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { Icon } from '../../components/ui/Icon'
import { ADMIN_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { SELECT_STYLE, INPUT_STYLE, SUMMARY_BAR_STYLE, COLOR_BADGE } from '../../lib/constants'
import { useProductTypes } from '../../hooks/useProductTypes'
import { toDriveImageUrl } from '../../lib/format-utils'
import { AdminProdottiForm } from './AdminProdottiForm'
import { useAdminProdottiHandlers } from './useAdminProdottiHandlers'
import { Button } from '../../components/ui/Button'

export function AdminProdotti() {
  const products = useProductsStore(s => s.products)
  const brands = useBrandsStore(s => s.brands)
  const bodySections = useBodySectionsStore(s => s.bodySections)
  const fetchProducts = useProductsStore(s => s.fetchProducts)
  const fetchBrands = useBrandsStore(s => s.fetchBrands)
  const fetchBodySections = useBodySectionsStore(s => s.fetchBodySections)
  const createProduct = useProductsStore(s => s.createProduct)
  const updateProduct = useProductsStore(s => s.updateProduct)
  const deleteProduct = useProductsStore(s => s.deleteProduct)
  const bulkUpdateProducts = useProductsStore(s => s.bulkUpdateProducts)
  const setProductBodySections = useProductsStore(s => s.setProductBodySections)
  const addToast = useToastStore(s => s.add)
  const { productTypes, labels: tipoLabels } = useProductTypes()

  const h = useAdminProdottiHandlers()

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [selectedSections, setSelectedSections] = useState([])
  const [filterTipo, setFilterTipo] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterAttivo, setFilterAttivo] = useState('')
  const [filterFamiglia, setFilterFamiglia] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [bulkTipo, setBulkTipo] = useState('')
  const [bulkFamiglia, setBulkFamiglia] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchBrands()
    fetchBodySections()
  }, [fetchProducts, fetchBrands, fetchBodySections])

  // Auto-fill specimen codice_inventario
  useEffect(() => {
    const code = h.nextInventoryCode(editing?.codice)
    if (code) h.setNewSpecimen(s => ({ ...s, codice_inventario: code }))
  }, [h.nextInventoryCode, editing?.codice])

  const handleEdit = useCallback(async (row) => {
    const form = {
      ...row,
      brand_id: row.brand?.id || row.brand_id || '',
      serializzato: row.serializzato !== undefined ? row.serializzato : h.defaultSerializzato(row.tipo),
    }
    setEditing(form)
    const sectionIds = (row.body_sections || []).map(bs => bs.body_section?.id).filter(Boolean)
    setSelectedSections(sectionIds)
    h.resetEditState()
    await h.loadRelated({ ...form, serializzato: form.serializzato })
  }, [h.loadRelated])

  const handleNew = () => {
    const tipo = 'demo_kit'
    setEditing({ nome: '', brand_id: '', tipo, codice: '', descrizione: '', foto_url: '', attivo: true, serializzato: h.defaultSerializzato(tipo) })
    setSelectedSections([])
    h.resetAllState()
  }

  const handleTipoChange = (tipo) => {
    setEditing(prev => ({ ...prev, tipo, serializzato: h.defaultSerializzato(tipo) }))
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      nome: editing.nome || '', brand_id: editing.brand_id || null,
      tipo: editing.tipo || 'demo_kit', codice: editing.codice || null,
      famiglia: editing.famiglia?.trim() || null,
      descrizione: editing.descrizione || null, foto_url: editing.foto_url || null,
      attivo: editing.attivo !== false, serializzato: editing.serializzato === true,
    }
    const isNew = !editing.id
    if (!payload.serializzato) {
      payload.soglia_minima = h.stock.soglia_minima ?? 0
    }
    const res = isNew ? await createProduct(payload) : await updateProduct(editing.id, payload)
    if (res.error) { setSaving(false); console.warn('Errore salvataggio prodotto:', res.error); addToast('Non siamo riusciti a salvare il prodotto. Riprova.', 'error'); return }
    const productId = isNew ? res.data?.id : editing.id
    if (productId) {
      const sectRes = await setProductBodySections(productId, selectedSections)
      if (sectRes?.error) { console.warn('Errore salvataggio distretti:', sectRes.error); addToast('Prodotto salvato, ma non siamo riusciti ad aggiornare i distretti anatomici.', 'error') }
    }
    setSaving(false)
    addToast(isNew ? 'Prodotto creato' : 'Prodotto aggiornato', 'success')
    if (isNew && productId) setEditing(prev => ({ ...prev, id: productId }))
  }

  const handleDelete = async () => {
    const { error } = await deleteProduct(deleting.id)
    if (error) { console.warn('Errore eliminazione prodotto:', error); addToast('Non siamo riusciti a eliminare il prodotto. Riprova.', 'error') } else { addToast('Prodotto eliminato', 'success') }
    setDeleting(null)
  }

  const toggleSection = (sectionId) => {
    setSelectedSections(prev => prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId])
  }

  const filteredProducts = useMemo(() => products.filter(p => {
    if (filterTipo && p.tipo !== filterTipo) return false
    if (filterBrand && p.brand?.id !== filterBrand) return false
    if (filterAttivo === 'true' && !p.attivo) return false
    if (filterAttivo === 'false' && p.attivo !== false) return false
    if (filterFamiglia === '__none__' && p.famiglia) return false
    if (filterFamiglia && filterFamiglia !== '__none__' && p.famiglia !== filterFamiglia) return false
    return true
  }), [products, filterTipo, filterBrand, filterAttivo, filterFamiglia])

  const allFamilies = useMemo(
    () => [...new Set(products.map(p => p.famiglia).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [products]
  )

  const goToProduct = async (product) => {
    const form = {
      ...product,
      brand_id: product.brand?.id || product.brand_id || '',
      serializzato: product.serializzato !== undefined ? product.serializzato : h.defaultSerializzato(product.tipo),
    }
    setEditing(form)
    const sectionIds = (product.body_sections || []).map(bs => bs.body_section?.id).filter(Boolean)
    setSelectedSections(sectionIds)
    h.resetEditState()
    await h.loadRelated({ ...form, serializzato: form.serializzato })
  }

  const columns = [
    { key: 'codice', label: 'Codice', render: (r) => r.codice ? <span className="text-sm font-mono text-gray-500">{r.codice}</span> : <span className="text-sm text-gray-300">—</span> },
    { key: 'nome', label: 'Nome', render: (r) => (
      <div className="flex items-center gap-3">
        {r.foto_url ? (
          <img src={toDriveImageUrl(r.foto_url)} alt={r.nome} className="w-8 h-8 object-cover rounded shrink-0" onError={(e) => { e.target.style.display = 'none' }} />
        ) : (
          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
            <Icon icon={ADMIN_ICONS.prodotti} size={16} className="text-gray-400" />
          </div>
        )}
        <span>{r.nome}</span>
      </div>
    )},
    { key: 'brand_nome', label: 'Brand', render: (r) => r.brand?.nome || '-' },
    { key: 'famiglia', label: 'Famiglia', render: (r) => r.famiglia ? <span className="text-sm text-gray-600">{r.famiglia}</span> : <span className="text-sm text-gray-300">—</span> },
    { key: 'tipo', label: 'Tipo', render: (r) => tipoLabels[r.tipo] || r.tipo },
    { key: 'modalita', label: 'Modalità', render: (r) => {
      const ser = r.serializzato !== undefined ? r.serializzato : h.defaultSerializzato(r.tipo)
      return ser
        ? <span className={`px-2 py-1 rounded-full text-xs font-medium ${COLOR_BADGE.blue}`}>Esemplari</span>
        : <span className={`px-2 py-1 rounded-full text-xs font-medium ${COLOR_BADGE.amber}`}>Quantità</span>
    }},
    { key: 'inventario', label: 'Inventario', render: (r) => {
      const ser = r.serializzato !== undefined ? r.serializzato : h.defaultSerializzato(r.tipo)
      if (ser) {
        const count = r.materials_count ?? r.specimen_count ?? null
        return <span className="text-sm text-gray-600">{count !== null ? `${count} esemplari` : '—'}</span>
      }
      const qty = r.quantita_disponibile ?? null
      const soglia = r.soglia_minima ?? 0
      if (qty === null) return <span className="text-sm text-gray-400">—</span>
      const sottoSoglia = soglia > 0 && qty <= soglia
      return (
        <span className={`text-sm font-medium ${sottoSoglia ? 'text-red-600' : 'text-gray-700'}`}>
          {qty} pz{sottoSoglia && <Icon icon={FEEDBACK_ICONS.warning} size={14} className="ml-1 text-red-500 inline" />}
        </span>
      )
    }},
    { key: 'attivo', label: 'Attivo', render: (r) => (
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${r.attivo ? COLOR_BADGE.green : COLOR_BADGE.gray}`}>
        {r.attivo ? 'Sì' : 'No'}
      </span>
    )},
  ]

  const stockUnderThreshold = (h.stock.soglia_minima ?? 0) > 0 && h.stock.quantita_disponibile <= h.stock.soglia_minima

  const toggleSelect = (id) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const toggleSelectAll = (ids) => {
    const allSelected = ids.every(id => selected.has(id))
    setSelected(allSelected ? new Set() : new Set(ids))
  }

  const handleBulkTipo = async () => {
    if (!bulkTipo || selected.size === 0) return
    setBulkLoading(true)
    const { error } = await bulkUpdateProducts([...selected], { tipo: bulkTipo })
    setBulkLoading(false)
    if (error) { console.warn('Errore aggiornamento massivo tipo:', error); addToast('Non siamo riusciti ad aggiornare i prodotti. Riprova.', 'error') }
    else {
      addToast(`${selected.size} prodotti aggiornati a "${tipoLabels[bulkTipo] || bulkTipo}"`, 'success')
      setSelected(new Set())
      setBulkTipo('')
      fetchProducts()
    }
  }

  const handleBulkFamiglia = async (clear = false) => {
    if (selected.size === 0) return
    const value = clear ? null : bulkFamiglia.trim()
    if (!clear && !value) return
    setBulkLoading(true)
    const { error } = await bulkUpdateProducts([...selected], { famiglia: value })
    setBulkLoading(false)
    if (error) { console.warn('Errore aggiornamento massivo famiglia:', error); addToast('Non siamo riusciti ad aggiornare i prodotti. Riprova.', 'error') }
    else {
      addToast(
        clear
          ? `Famiglia rimossa da ${selected.size} prodotti`
          : `${selected.size} prodotti assegnati alla famiglia "${value}"`,
        'success'
      )
      setSelected(new Set())
      setBulkFamiglia('')
      fetchProducts()
    }
  }

  return (
    <div>
      <MobileHeader title="Prodotti & Kit" subtitle="Gestisci prodotti e kit del catalogo" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Prodotti & Kit' }]} />
      </div>
      <PageHeader mobileHidden title="Prodotti & Kit" subtitle={`${filteredProducts.length} prodotti${filteredProducts.length !== products.length ? ` di ${products.length}` : ''}`} />

      <div className="px-4 md:px-8 pb-8">
        {!editing && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select className={SELECT_STYLE + ' max-w-[180px]'} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
              <option value="">Tutti i tipi</option>
              {productTypes.filter(pt => pt.attivo).map(pt => <option key={pt.codice} value={pt.codice}>{pt.nome}</option>)}
            </select>
            <select className={SELECT_STYLE + ' max-w-[180px]'} value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
              <option value="">Tutti i brand</option>
              {brands.filter(b => b.attivo).map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
            <select className={SELECT_STYLE + ' max-w-[180px]'} value={filterAttivo} onChange={e => setFilterAttivo(e.target.value)}>
              <option value="">Tutti</option>
              <option value="true">Attivi</option>
              <option value="false">Non attivi</option>
            </select>
            <select className={SELECT_STYLE + ' max-w-[200px]'} value={filterFamiglia} onChange={e => setFilterFamiglia(e.target.value)}>
              <option value="">Tutte le famiglie</option>
              <option value="__none__">— Senza famiglia</option>
              {allFamilies.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            {(filterTipo || filterBrand || filterAttivo || filterFamiglia) && (
              <button onClick={() => { setFilterTipo(''); setFilterBrand(''); setFilterAttivo(''); setFilterFamiglia('') }}
                className="text-sm text-mikai-600 hover:text-mikai-800 min-h-[48px] px-2">
                Azzera filtri
              </button>
            )}
          </div>
        )}
        {/* Bulk action bar */}
        {!editing && selected.size > 0 && (
          <div className={SUMMARY_BAR_STYLE + ' flex items-center gap-3 flex-wrap mb-4'}>
            <span className="text-sm font-semibold text-mikai-700">{selected.size} selezionati</span>

            {/* Tipologia */}
            <select
              value={bulkTipo}
              onChange={e => setBulkTipo(e.target.value)}
              className={SELECT_STYLE + ' max-w-[200px]'}
            >
              <option value="">Cambia tipologia…</option>
              {productTypes.filter(pt => pt.attivo).map(pt => (
                <option key={pt.codice} value={pt.codice}>{pt.nome}</option>
              ))}
            </select>
            {bulkTipo && (
              <Button size="sm" onClick={handleBulkTipo} loading={bulkLoading}>
                Applica tipo
              </Button>
            )}

            {/* Famiglia */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={bulkFamiglia}
                onChange={e => setBulkFamiglia(e.target.value)}
                placeholder="Imposta famiglia…"
                className={INPUT_STYLE + ' max-w-[200px]'}
                list="bulk-famiglia-options"
                aria-label="Imposta famiglia per i prodotti selezionati"
              />
              <datalist id="bulk-famiglia-options">
                {allFamilies.map(f => <option key={f} value={f} />)}
              </datalist>
              {bulkFamiglia.trim() && (
                <Button size="sm" onClick={() => handleBulkFamiglia(false)} loading={bulkLoading}>
                  Applica famiglia
                </Button>
              )}
              <button
                onClick={() => handleBulkFamiglia(true)}
                disabled={bulkLoading}
                className="text-sm text-gray-500 hover:text-red-600 min-h-[48px] px-2"
                title="Rimuovi famiglia dai prodotti selezionati"
              >
                Svuota famiglia
              </button>
            </div>

            <button onClick={() => { setSelected(new Set()); setBulkTipo(''); setBulkFamiglia('') }} className="text-sm text-gray-500 hover:text-gray-700 min-h-[48px] px-2 ml-auto">
              Deseleziona
            </button>
          </div>
        )}

        {editing ? (
          <AdminProdottiForm
            editing={editing} setEditing={setEditing} saving={saving}
            brands={brands} bodySections={bodySections} productTypes={productTypes.filter(pt => pt.attivo)}
            selectedSections={selectedSections} toggleSection={toggleSection}
            handleTipoChange={handleTipoChange}
            handleSerializzatoChange={(val) => h.handleSerializzatoChange(val, editing, setEditing)}
            handleSave={handleSave} onCancel={() => setEditing(null)}
            filteredProducts={filteredProducts} goToProduct={goToProduct} allFamilies={allFamilies}
            kitContents={h.kitContents} newPiece={h.newPiece} setNewPiece={h.setNewPiece}
            editingPiece={h.editingPiece} editingPieceData={h.editingPieceData} setEditingPieceData={h.setEditingPieceData}
            handleAddPiece={() => h.handleAddPiece(editing.id)} handleDeletePiece={(id) => h.handleDeletePiece(id, editing.id)}
            handleStartEditPiece={h.handleStartEditPiece} handleSavePiece={() => h.handleSavePiece(editing.id)} handleCancelEditPiece={h.handleCancelEditPiece}
            specimens={h.specimens} newSpecimen={h.newSpecimen} setNewSpecimen={h.setNewSpecimen}
            editingSpecimen={h.editingSpecimen} editingSpecimenData={h.editingSpecimenData} setEditingSpecimenData={h.setEditingSpecimenData}
            deletingSpecimen={h.deletingSpecimen} setDeletingSpecimen={h.setDeletingSpecimen} specimenSaving={h.specimenSaving}
            handleAddSpecimen={() => h.handleAddSpecimen(editing.id, editing)} handleStartEditSpecimen={h.handleStartEditSpecimen}
            handleSaveSpecimen={() => h.handleSaveSpecimen(editing.id)} handleDeleteSpecimen={() => h.handleDeleteSpecimen(editing?.id)}
            stock={h.stock} setStock={h.setStock} stockUnderThreshold={stockUnderThreshold} committed={h.committed}
            stockLocations={h.stockLocations} stockHistory={h.stockHistory} historyHasMore={h.historyHasMore}
            stockBusy={h.stockBusy} loadingMoreHistory={h.loadingMoreHistory}
            onCaricaLotto={(qty, motivo, m, a) => h.handleCaricaLotto(editing?.id, qty, motivo, m, a)}
            onRettificaPosizione={(m, a, target, motivo) => h.handleRettificaPosizione(editing?.id, m, a, target, motivo)}
            onReverseAdjustment={(adjId) => h.handleReverseAdjustment(adjId, editing?.id)}
            onLoadMoreHistory={() => h.handleLoadMoreHistory(editing?.id)}
            magazzini={h.magazzini} agenti={h.agenti}
          />
        ) : (
          <AdminTable
            columns={columns}
            rows={filteredProducts}
            searchField="nome"
            onAdd={handleNew}
            onEdit={handleEdit}
            onDelete={(row) => setDeleting(row)}
            addLabel="Nuovo prodotto"
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
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
    </div>
  )
}

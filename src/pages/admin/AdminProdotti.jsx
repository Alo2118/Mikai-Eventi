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
import { ACTION_ICONS } from '../../lib/icons'
import { TIPO_PRODOTTO, INPUT_STYLE, CARD_STYLE } from '../../lib/constants'
const CHECK = 'w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400'

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
  const deleteKitContent = useAdminStore(s => s.deleteKitContent)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [selectedSections, setSelectedSections] = useState([])
  const [kitContents, setKitContents] = useState([])
  const [newPiece, setNewPiece] = useState({ piece_name: '', piece_code: '', quantity: 1 })

  useEffect(() => {
    fetchProducts()
    fetchBrands()
    fetchBodySections()
  }, [fetchProducts, fetchBrands, fetchBodySections])

  const loadRelated = useCallback(async (product) => {
    const sectionIds = (product.body_sections || []).map(bs => bs.body_section?.id).filter(Boolean)
    setSelectedSections(sectionIds)
    if (product.id) {
      const { data } = await fetchKitContents(product.id)
      setKitContents(data || [])
    } else {
      setKitContents([])
    }
  }, [fetchKitContents])

  const handleEdit = useCallback(async (row) => {
    const form = { ...row, brand_id: row.brand?.id || row.brand_id || '' }
    setEditing(form)
    await loadRelated(row)
  }, [loadRelated])

  const handleNew = () => {
    setEditing({ nome: '', brand_id: '', tipo: 'demo_kit', codice: '', descrizione: '', immagine_url: '', attivo: true })
    setSelectedSections([])
    setKitContents([])
    setNewPiece({ piece_name: '', piece_code: '', quantity: 1 })
  }

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'brand_nome', label: 'Brand', render: (r) => r.brand?.nome || '-' },
    { key: 'tipo', label: 'Tipo', render: (r) => TIPO_PRODOTTO[r.tipo] || r.tipo },
    { key: 'attivo', label: 'Attivo', render: (r) => (
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${r.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {r.attivo ? 'Si' : 'No'}
      </span>
    )},
  ]

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      nome: editing.nome || '',
      brand_id: editing.brand_id || null,
      tipo: editing.tipo || 'demo_kit',
      codice: editing.codice || null,
      descrizione: editing.descrizione || null,
      immagine_url: editing.immagine_url || null,
      attivo: editing.attivo !== false,
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
    setEditing(null)
  }

  const handleDelete = async () => {
    const { error } = await deleteProduct(deleting.id)
    if (error) { addToast(error, 'error') } else { addToast('Prodotto eliminato', 'success') }
    setDeleting(null)
  }

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

  const toggleSection = (sectionId) => {
    setSelectedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    )
  }

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
                  <select className={INPUT_STYLE} value={editing.tipo || 'demo_kit'} onChange={e => setEditing({ ...editing, tipo: e.target.value })}>
                    {Object.entries(TIPO_PRODOTTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">URL foto</label>
                <input className={INPUT_STYLE} value={editing.immagine_url || ''} onChange={e => setEditing({ ...editing, immagine_url: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className={CHECK} checked={editing.attivo !== false} onChange={e => setEditing({ ...editing, attivo: e.target.checked })} id="attivo" />
                <label htmlFor="attivo" className="text-base text-gray-700">Attivo</label>
              </div>
            </div>

            {/* Body sections */}
            <div className={CARD_STYLE + ' md:p-6'}>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Distretti anatomici</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {bodySections.filter(bs => bs.attivo).map(bs => (
                  <label key={bs.id} className="flex items-center gap-2 text-base text-gray-700 cursor-pointer">
                    <input type="checkbox" className={CHECK} checked={selectedSections.includes(bs.id)} onChange={() => toggleSection(bs.id)} />
                    {bs.nome}
                  </label>
                ))}
              </div>
            </div>

            {/* Kit contents — only for existing products */}
            {editing.id && (
              <div className={CARD_STYLE + ' md:p-6'}>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Contenuto kit</h3>
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
                            <td className="px-3 py-2 text-base">{kc.piece_name}</td>
                            <td className="px-3 py-2 text-base text-gray-500">{kc.piece_code || '-'}</td>
                            <td className="px-3 py-2 text-base">{kc.quantity}</td>
                            <td className="px-3 py-2">
                              <button onClick={() => handleDeletePiece(kc.id)} className="text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Rimuovi pezzo">
                                <Icon icon={ACTION_ICONS.close} size={16} />
                              </button>
                            </td>
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

            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving} disabled={!editing.nome?.trim()}>Salva</Button>
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
    </div>
  )
}

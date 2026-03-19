import { useState, useEffect } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useToastStore } from '../../components/ui/Toast'
import { AdminTable } from '../../components/ui/AdminTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { POSIZIONE_MATERIALE } from '../../lib/constants'

const INPUT = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
const CHECK = 'w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400'

export function AdminMateriali() {
  const specimens = useAdminStore(s => s.specimens)
  const products = useAdminStore(s => s.products)
  const fetchSpecimens = useAdminStore(s => s.fetchSpecimens)
  const fetchProducts = useAdminStore(s => s.fetchProducts)
  const createSpecimen = useAdminStore(s => s.createSpecimen)
  const updateSpecimen = useAdminStore(s => s.updateSpecimen)
  const deleteSpecimen = useAdminStore(s => s.deleteSpecimen)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchSpecimens()
    fetchProducts()
  }, [fetchSpecimens, fetchProducts])

  const columns = [
    { key: 'codice_inventario', label: 'Codice inventario', render: (r) => r.codice_inventario || r.nome || '-' },
    { key: 'product_nome', label: 'Prodotto', render: (r) => r.product?.nome || '-' },
    { key: 'posizione_attuale', label: 'Posizione', render: (r) => POSIZIONE_MATERIALE[r.posizione_attuale] || r.posizione_attuale || '-' },
    { key: 'attivo', label: 'Attivo', render: (r) => (
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${r.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {r.attivo ? 'Si' : 'No'}
      </span>
    )},
  ]

  const handleEdit = (row) => {
    setEditing({
      ...row,
      product_id: row.product?.id || row.product_id || '',
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      nome: editing.codice_inventario || editing.nome || '',
      codice_inventario: editing.codice_inventario || null,
      product_id: editing.product_id || null,
      posizione_attuale: editing.posizione_attuale || 'magazzino',
      note: editing.note || null,
      attivo: editing.attivo !== false,
    }
    const isNew = !editing.id
    const { error } = isNew
      ? await createSpecimen(payload)
      : await updateSpecimen(editing.id, payload)
    setSaving(false)
    if (error) { addToast(error, 'error'); return }
    addToast(isNew ? 'Materiale creato' : 'Materiale aggiornato', 'success')
    setEditing(null)
  }

  const handleDelete = async () => {
    const { error } = await deleteSpecimen(deleting.id)
    if (error) { addToast(error, 'error') } else { addToast('Materiale eliminato', 'success') }
    setDeleting(null)
  }

  return (
    <div>
      <MobileHeader title="Materiali" subtitle="Gestisci gli esemplari fisici in magazzino" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Materiali' }]} />
      </div>
      <PageHeader title="Materiali" subtitle="Gestisci gli esemplari fisici in magazzino" />

      <div className="px-4 md:px-8 pb-8">
        {editing ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 max-w-lg space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Modifica materiale' : 'Nuovo materiale'}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codice inventario <span className="text-red-500">*</span></label>
              <input className={INPUT} value={editing.codice_inventario || ''} onChange={e => setEditing({ ...editing, codice_inventario: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prodotto</label>
              <select className={INPUT} value={editing.product_id || ''} onChange={e => setEditing({ ...editing, product_id: e.target.value })}>
                <option value="">-- Seleziona --</option>
                {products.filter(p => p.attivo).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posizione</label>
              <select className={INPUT} value={editing.posizione_attuale || 'magazzino'} onChange={e => setEditing({ ...editing, posizione_attuale: e.target.value })}>
                {Object.entries(POSIZIONE_MATERIALE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea className={`${INPUT} min-h-[96px]`} value={editing.note || ''} onChange={e => setEditing({ ...editing, note: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" className={CHECK} checked={editing.attivo !== false} onChange={e => setEditing({ ...editing, attivo: e.target.checked })} id="attivo" />
              <label htmlFor="attivo" className="text-base text-gray-700">Attivo</label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} loading={saving} disabled={!editing.codice_inventario?.trim()}>Salva</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
            </div>
          </div>
        ) : (
          <AdminTable
            columns={columns}
            rows={specimens}
            searchField="codice_inventario"
            onAdd={() => setEditing({ codice_inventario: '', product_id: '', posizione_attuale: 'magazzino', note: '', attivo: true })}
            onEdit={handleEdit}
            onDelete={(row) => setDeleting(row)}
            addLabel="Nuovo materiale"
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Elimina materiale"
        message={`Sei sicuro di voler eliminare "${deleting?.codice_inventario || deleting?.nome}"?`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        danger
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useToastStore } from '../../components/ui/Toast'
import { AdminTable } from '../../components/ui/AdminTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'

const INPUT = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
const CHECK = 'w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400'

export function AdminGadget() {
  const gadgets = useAdminStore(s => s.gadgetsMaster)
  const loading = useAdminStore(s => s.gadgetsMasterLoading)
  const fetchGadgetsMaster = useAdminStore(s => s.fetchGadgetsMaster)
  const createGadgetMaster = useAdminStore(s => s.createGadgetMaster)
  const updateGadgetMaster = useAdminStore(s => s.updateGadgetMaster)
  const deleteGadgetMaster = useAdminStore(s => s.deleteGadgetMaster)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchGadgetsMaster() }, [fetchGadgetsMaster])

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'quantita_disponibile', label: 'Stock', render: (r) => {
      const low = r.soglia_minima && r.quantita_disponibile < r.soglia_minima
      return <span className={low ? 'font-semibold text-red-600' : ''}>{r.quantita_disponibile ?? 0}</span>
    }},
    { key: 'soglia_minima', label: 'Soglia minima', render: (r) => r.soglia_minima ?? '-' },
    { key: 'fornitore_abituale', label: 'Fornitore', render: (r) => r.fornitore_abituale || '-' },
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
      quantita_disponibile: parseInt(editing.quantita_disponibile) || 0,
      soglia_minima: parseInt(editing.soglia_minima) || 0,
      fornitore_abituale: editing.fornitore_abituale || null,
      attivo: editing.attivo !== false,
    }
    const isNew = !editing.id
    const { error } = isNew
      ? await createGadgetMaster(payload)
      : await updateGadgetMaster(editing.id, payload)
    setSaving(false)
    if (error) { addToast(error, 'error'); return }
    addToast(isNew ? 'Gadget creato' : 'Gadget aggiornato', 'success')
    setEditing(null)
  }

  const handleDelete = async () => {
    const { error } = await deleteGadgetMaster(deleting.id)
    if (error) { addToast(error, 'error') } else { addToast('Gadget eliminato', 'success') }
    setDeleting(null)
  }

  return (
    <div>
      <MobileHeader title="Gadget" subtitle="Gestisci il catalogo gadget" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Gadget' }]} />
      </div>
      <PageHeader title="Gadget" subtitle="Gestisci il catalogo gadget" />

      <div className="px-4 md:px-8 pb-8">
        {editing ? (
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 max-w-lg space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Modifica gadget' : 'Nuovo gadget'}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input className={INPUT} value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità disponibile</label>
                <input type="number" min="0" className={INPUT} value={editing.quantita_disponibile ?? ''} onChange={e => setEditing({ ...editing, quantita_disponibile: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soglia minima</label>
                <input type="number" min="0" className={INPUT} value={editing.soglia_minima ?? ''} onChange={e => setEditing({ ...editing, soglia_minima: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornitore abituale</label>
              <input className={INPUT} value={editing.fornitore_abituale || ''} onChange={e => setEditing({ ...editing, fornitore_abituale: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" className={CHECK} checked={editing.attivo !== false} onChange={e => setEditing({ ...editing, attivo: e.target.checked })} id="attivo" />
              <label htmlFor="attivo" className="text-base text-gray-700">Attivo</label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} loading={saving} disabled={!editing.nome?.trim()}>Salva</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
            </div>
          </div>
        ) : (
          <AdminTable
            columns={columns}
            rows={gadgets}
            searchField="nome"
            onAdd={() => setEditing({ nome: '', quantita_disponibile: 0, soglia_minima: 0, fornitore_abituale: '', attivo: true })}
            onEdit={(row) => setEditing({ ...row })}
            onDelete={(row) => setDeleting(row)}
            addLabel="Nuovo gadget"
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Elimina gadget"
        message={`Sei sicuro di voler eliminare "${deleting?.nome}"?`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        danger
      />
    </div>
  )
}

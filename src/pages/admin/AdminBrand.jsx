import { useState, useEffect } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useToastStore } from '../../components/ui/Toast'
import { AdminTable } from '../../components/ui/AdminTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { TIPO_BRAND, INPUT_STYLE, CARD_STYLE, ATTIVO_BADGE } from '../../lib/constants'
const CHECK = 'w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400'

export function AdminBrand() {
  const brands = useAdminStore(s => s.brands)
  const loading = useAdminStore(s => s.brandsLoading)
  const fetchBrands = useAdminStore(s => s.fetchBrands)
  const createBrand = useAdminStore(s => s.createBrand)
  const updateBrand = useAdminStore(s => s.updateBrand)
  const deleteBrand = useAdminStore(s => s.deleteBrand)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchBrands() }, [fetchBrands])

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo', render: (r) => TIPO_BRAND[r.tipo] || r.tipo },
    { key: 'attivo', label: 'Attivo', render: (r) => (
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${ATTIVO_BADGE[r.attivo]}`}>
        {r.attivo ? 'Si' : 'No'}
      </span>
    )},
  ]

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      nome: editing.nome || '',
      tipo: editing.tipo || 'produttore',
      logo_url: editing.logo_url || null,
      attivo: editing.attivo !== false,
    }
    const isNew = !editing.id
    const { error } = isNew
      ? await createBrand(payload)
      : await updateBrand(editing.id, payload)
    setSaving(false)
    if (error) { addToast(error, 'error'); return }
    addToast(isNew ? 'Brand creato' : 'Brand aggiornato', 'success')
    setEditing(null)
  }

  const handleDelete = async () => {
    const { error } = await deleteBrand(deleting.id)
    if (error) { addToast(error, 'error') } else { addToast('Brand eliminato', 'success') }
    setDeleting(null)
  }

  return (
    <div>
      <MobileHeader title="Brand" subtitle="Gestisci i brand del catalogo" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Brand' }]} />
      </div>
      <PageHeader mobileHidden title="Brand" subtitle="Gestisci i brand del catalogo" />

      <div className="px-4 md:px-8 pb-8">
        {editing ? (
          <div className={CARD_STYLE + ' md:p-6 max-w-lg space-y-4'}>
            <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Modifica brand' : 'Nuovo brand'}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input className={INPUT_STYLE} value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select className={INPUT_STYLE} value={editing.tipo || 'produttore'} onChange={e => setEditing({ ...editing, tipo: e.target.value })}>
                {Object.entries(TIPO_BRAND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Logo</label>
              <input className={INPUT_STYLE} value={editing.logo_url || ''} onChange={e => setEditing({ ...editing, logo_url: e.target.value })} />
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
            rows={brands}
            searchField="nome"
            onAdd={() => setEditing({ nome: '', tipo: 'produttore', attivo: true })}
            onEdit={(row) => setEditing({ ...row })}
            onDelete={(row) => setDeleting(row)}
            addLabel="Nuovo brand"
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Elimina brand"
        message={`Sei sicuro di voler eliminare "${deleting?.nome}"?`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        danger
      />
    </div>
  )
}

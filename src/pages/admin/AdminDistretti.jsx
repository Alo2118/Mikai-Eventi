import { useState, useEffect } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useToastStore } from '../../components/ui/Toast'
import { AdminTable } from '../../components/ui/AdminTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { INPUT_STYLE, CARD_STYLE } from '../../lib/constants'
const CHECK = 'w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400'

export function AdminDistretti() {
  const bodySections = useAdminStore(s => s.bodySections)
  const loading = useAdminStore(s => s.bodySectionsLoading)
  const fetchBodySections = useAdminStore(s => s.fetchBodySections)
  const createBodySection = useAdminStore(s => s.createBodySection)
  const updateBodySection = useAdminStore(s => s.updateBodySection)
  const deleteBodySection = useAdminStore(s => s.deleteBodySection)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchBodySections() }, [fetchBodySections])

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'ordine', label: 'Ordine' },
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
      ordine: parseInt(editing.ordine) || 0,
      immagine_url: editing.immagine_url || null,
      attivo: editing.attivo !== false,
    }
    const isNew = !editing.id
    const { error } = isNew
      ? await createBodySection(payload)
      : await updateBodySection(editing.id, payload)
    setSaving(false)
    if (error) { addToast(error, 'error'); return }
    addToast(isNew ? 'Distretto creato' : 'Distretto aggiornato', 'success')
    setEditing(null)
  }

  const handleDelete = async () => {
    const { error } = await deleteBodySection(deleting.id)
    if (error) { addToast(error, 'error') } else { addToast('Distretto eliminato', 'success') }
    setDeleting(null)
  }

  return (
    <div>
      <MobileHeader title="Distretti anatomici" subtitle="Gestisci i distretti anatomici" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Distretti anatomici' }]} />
      </div>
      <PageHeader title="Distretti anatomici" subtitle="Gestisci i distretti anatomici" />

      <div className="px-4 md:px-8 pb-8">
        {editing ? (
          <div className={CARD_STYLE + ' md:p-6 max-w-lg space-y-4'}>
            <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Modifica distretto' : 'Nuovo distretto'}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input className={INPUT_STYLE} value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
              <input type="number" className={INPUT_STYLE} value={editing.ordine ?? ''} onChange={e => setEditing({ ...editing, ordine: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Immagine</label>
              <input className={INPUT_STYLE} value={editing.immagine_url || ''} onChange={e => setEditing({ ...editing, immagine_url: e.target.value })} />
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
            rows={bodySections}
            searchField="nome"
            onAdd={() => setEditing({ nome: '', ordine: 0, attivo: true })}
            onEdit={(row) => setEditing({ ...row })}
            onDelete={(row) => setDeleting(row)}
            addLabel="Nuovo distretto"
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Elimina distretto"
        message={`Sei sicuro di voler eliminare "${deleting?.nome}"?`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        danger
      />
    </div>
  )
}

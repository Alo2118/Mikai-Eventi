import { useEffect, useState } from 'react'
import { useSubActivitiesStore } from '../../hooks/useSubActivities'
import { AdminTable } from '../../components/ui/AdminTable'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { PageHeader } from '../../components/ui/PageHeader'
import { useToastStore } from '../../components/ui/Toast'
import { INPUT_STYLE, CARD_STYLE } from '../../lib/constants'

export function AdminSottoAttivita() {
  const types = useSubActivitiesStore(s => s.types)
  const fetchTypes = useSubActivitiesStore(s => s.fetchTypes)
  const createType = useSubActivitiesStore(s => s.createType)
  const updateType = useSubActivitiesStore(s => s.updateType)
  const deleteType = useSubActivitiesStore(s => s.deleteType)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [nome, setNome] = useState('')

  useEffect(() => { fetchTypes() }, [fetchTypes])

  const handleSave = async () => {
    if (!nome.trim()) return
    setSaving(true)
    const { error } = editing?.id
      ? await updateType(editing.id, { nome: nome.trim() })
      : await createType(nome.trim())
    setSaving(false)
    if (error) { addToast('Non è stato possibile salvare il tipo. Riprova.', 'error'); return }
    addToast(editing?.id ? 'Tipo aggiornato' : 'Tipo creato', 'success')
    setEditing(null)
    setNome('')
  }

  const handleDelete = async () => {
    const { error } = await deleteType(deleting.id)
    setDeleting(null)
    if (error) { addToast('Non è stato possibile disattivare il tipo. Riprova.', 'error'); return }
    addToast('Tipo disattivato', 'success')
  }

  const columns = [
    { key: 'nome', label: 'Nome' },
  ]

  return (
    <div>
      <MobileHeader title="Tipi sotto-attività" subtitle="Gestisci i tipi di sotto-attività" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Tipi sotto-attività' }]} />
      </div>
      <PageHeader mobileHidden title="Tipi sotto-attività" subtitle="Gestisci i tipi di sotto-attività del programma evento" />

      <div className="px-4 md:px-8 pb-8">
        {editing !== null ? (
          <div className={CARD_STYLE + ' md:p-6 max-w-lg space-y-4'}>
            <h2 className="text-lg font-semibold text-gray-900">{editing?.id ? 'Modifica tipo' : 'Nuovo tipo sotto-attività'}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input
                className={INPUT_STYLE}
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="es. Pranzo, Coffee break..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} loading={saving} disabled={!nome.trim()}>
                {editing?.id ? 'Salva' : 'Crea'}
              </Button>
              <Button variant="secondary" onClick={() => { setEditing(null); setNome('') }}>Annulla</Button>
            </div>
          </div>
        ) : (
          <AdminTable
            columns={columns}
            rows={types}
            searchField="nome"
            onAdd={() => { setEditing({}); setNome('') }}
            onEdit={(row) => { setEditing(row); setNome(row.nome) }}
            onDelete={(row) => setDeleting(row)}
            addLabel="Nuovo tipo"
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Disattiva tipo"
        message={`Disattivare "${deleting?.nome}"? Le sotto-attività esistenti non saranno modificate.`}
        confirmLabel="Disattiva"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

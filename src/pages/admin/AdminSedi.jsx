import { useState, useEffect } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useToastStore } from '../../components/ui/Toast'
import { AdminTable } from '../../components/ui/AdminTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { Tabs } from '../../components/ui/Tabs'
import { INPUT_STYLE } from '../../lib/constants'

const TABS = [
  { id: 'sedi', label: 'Sedi' },
  { id: 'corrieri', label: 'Corrieri' },
]

export function AdminSedi() {
  const venues = useAdminStore(s => s.venues)
  const couriers = useAdminStore(s => s.couriers)
  const zones = useAdminStore(s => s.zones)
  const fetchVenues = useAdminStore(s => s.fetchVenues)
  const fetchCouriers = useAdminStore(s => s.fetchCouriers)
  const fetchZones = useAdminStore(s => s.fetchZones)
  const createVenue = useAdminStore(s => s.createVenue)
  const updateVenue = useAdminStore(s => s.updateVenue)
  const deleteVenue = useAdminStore(s => s.deleteVenue)
  const createCourier = useAdminStore(s => s.createCourier)
  const updateCourier = useAdminStore(s => s.updateCourier)
  const deleteCourier = useAdminStore(s => s.deleteCourier)
  const addToast = useToastStore(s => s.add)

  const [tab, setTab] = useState('sedi')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchVenues()
    fetchCouriers()
    fetchZones()
  }, [fetchVenues, fetchCouriers, fetchZones])

  // Reset form on tab change
  const handleTabChange = (newTab) => { setTab(newTab); setEditing(null) }

  // ═══ Sedi ═══
  const sediColumns = [
    { key: 'nome', label: 'Nome' },
    { key: 'citta', label: 'Città', render: (r) => r.citta || '-' },
    { key: 'provincia', label: 'Provincia', render: (r) => r.provincia || '-' },
    { key: 'zone_nome', label: 'Zona', render: (r) => r.zone?.nome || '-' },
  ]

  const handleSaveSede = async () => {
    setSaving(true)
    const payload = {
      nome: editing.nome || '',
      indirizzo: editing.indirizzo || null,
      cap: editing.cap || null,
      citta: editing.citta || null,
      provincia: editing.provincia || null,
      zone_id: editing.zone_id || null,
      courier_id: editing.courier_id || null,
      note_consegna: editing.note_consegna || null,
    }
    const isNew = !editing.id
    const { error } = isNew ? await createVenue(payload) : await updateVenue(editing.id, payload)
    setSaving(false)
    if (error) { addToast(error, 'error'); return }
    addToast(isNew ? 'Sede creata' : 'Sede aggiornata', 'success')
    setEditing(null)
  }

  // ═══ Corrieri ═══
  const corrieriColumns = [
    { key: 'nome', label: 'Nome' },
    { key: 'contatto', label: 'Contatto', render: (r) => r.contatto || '-' },
  ]

  const handleSaveCorriere = async () => {
    setSaving(true)
    const payload = {
      nome: editing.nome || '',
      contatto: editing.contatto || null,
    }
    const isNew = !editing.id
    const { error } = isNew ? await createCourier(payload) : await updateCourier(editing.id, payload)
    setSaving(false)
    if (error) { addToast(error, 'error'); return }
    addToast(isNew ? 'Corriere creato' : 'Corriere aggiornato', 'success')
    setEditing(null)
  }

  const handleDelete = async () => {
    const isSede = tab === 'sedi'
    const { error } = isSede
      ? await deleteVenue(deleting.id)
      : await deleteCourier(deleting.id)
    if (error) { addToast(error, 'error') } else { addToast(isSede ? 'Sede eliminata' : 'Corriere eliminato', 'success') }
    setDeleting(null)
  }

  const handleEditSede = (row) => {
    setEditing({ ...row, zone_id: row.zone?.id || row.zone_id || '', courier_id: row.courier_id || '' })
  }

  return (
    <div>
      <MobileHeader title="Sedi & Corrieri" subtitle="Gestisci la rubrica sedi e corrieri" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Sedi & Corrieri' }]} />
      </div>
      <PageHeader title="Sedi & Corrieri" subtitle="Gestisci la rubrica sedi e corrieri" />

      <div className="px-4 md:px-8 pb-8 space-y-4">
        <Tabs tabs={TABS} activeTab={tab} onChange={handleTabChange} />

        {tab === 'sedi' && (
          editing ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 max-w-lg space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Modifica sede' : 'Nuova sede'}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                <input className={INPUT_STYLE} value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                <input className={INPUT_STYLE} value={editing.indirizzo || ''} onChange={e => setEditing({ ...editing, indirizzo: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
                  <input className={INPUT_STYLE} value={editing.cap || ''} onChange={e => setEditing({ ...editing, cap: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
                  <input className={INPUT_STYLE} value={editing.citta || ''} onChange={e => setEditing({ ...editing, citta: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                  <input className={INPUT_STYLE} value={editing.provincia || ''} onChange={e => setEditing({ ...editing, provincia: e.target.value })} maxLength={2} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
                <select className={INPUT_STYLE} value={editing.zone_id || ''} onChange={e => setEditing({ ...editing, zone_id: e.target.value })}>
                  <option value="">-- Nessuna --</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Corriere</label>
                <select className={INPUT_STYLE} value={editing.courier_id || ''} onChange={e => setEditing({ ...editing, courier_id: e.target.value })}>
                  <option value="">-- Nessuno --</option>
                  {couriers.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note consegna</label>
                <textarea className={`${INPUT_STYLE} min-h-[96px]`} value={editing.note_consegna || ''} onChange={e => setEditing({ ...editing, note_consegna: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveSede} loading={saving} disabled={!editing.nome?.trim()}>Salva</Button>
                <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
              </div>
            </div>
          ) : (
            <AdminTable
              columns={sediColumns}
              rows={venues}
              searchField="nome"
              onAdd={() => setEditing({ nome: '', indirizzo: '', cap: '', citta: '', provincia: '', zone_id: '', courier_id: '', note_consegna: '' })}
              onEdit={handleEditSede}
              onDelete={(row) => setDeleting(row)}
              addLabel="Nuova sede"
            />
          )
        )}

        {tab === 'corrieri' && (
          editing ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 max-w-lg space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Modifica corriere' : 'Nuovo corriere'}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                <input className={INPUT_STYLE} value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contatto</label>
                <input className={INPUT_STYLE} value={editing.contatto || ''} onChange={e => setEditing({ ...editing, contatto: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveCorriere} loading={saving} disabled={!editing.nome?.trim()}>Salva</Button>
                <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
              </div>
            </div>
          ) : (
            <AdminTable
              columns={corrieriColumns}
              rows={couriers}
              searchField="nome"
              onAdd={() => setEditing({ nome: '', contatto: '' })}
              onEdit={(row) => setEditing({ ...row })}
              onDelete={(row) => setDeleting(row)}
              addLabel="Nuovo corriere"
            />
          )
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title={tab === 'sedi' ? 'Elimina sede' : 'Elimina corriere'}
        message={`Sei sicuro di voler eliminare "${deleting?.nome}"?`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        danger
      />
    </div>
  )
}

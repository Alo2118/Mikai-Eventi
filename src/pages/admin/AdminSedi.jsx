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
import { INPUT_STYLE, SELECT_STYLE, CARD_STYLE } from '../../lib/constants'

const TABS = [
  { id: 'sedi', label: 'Sedi' },
  { id: 'corrieri', label: 'Corrieri' },
  { id: 'magazzini', label: 'Magazzini' },
]

export function AdminSedi() {
  const venues = useAdminStore(s => s.venues)
  const couriers = useAdminStore(s => s.couriers)
  const zones = useAdminStore(s => s.zones)
  const magazzini = useAdminStore(s => s.magazzini)
  const fetchVenues = useAdminStore(s => s.fetchVenues)
  const fetchCouriers = useAdminStore(s => s.fetchCouriers)
  const fetchZones = useAdminStore(s => s.fetchZones)
  const fetchMagazzini = useAdminStore(s => s.fetchMagazzini)
  const createVenue = useAdminStore(s => s.createVenue)
  const updateVenue = useAdminStore(s => s.updateVenue)
  const deleteVenue = useAdminStore(s => s.deleteVenue)
  const createCourier = useAdminStore(s => s.createCourier)
  const updateCourier = useAdminStore(s => s.updateCourier)
  const deleteCourier = useAdminStore(s => s.deleteCourier)
  const createMagazzino = useAdminStore(s => s.createMagazzino)
  const updateMagazzino = useAdminStore(s => s.updateMagazzino)
  const deleteMagazzino = useAdminStore(s => s.deleteMagazzino)
  const addToast = useToastStore(s => s.add)

  const [tab, setTab] = useState('sedi')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchVenues()
    fetchCouriers()
    fetchZones()
    fetchMagazzini()
  }, [fetchVenues, fetchCouriers, fetchZones, fetchMagazzini])

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

  // ═══ Magazzini ═══
  const magazziniColumns = [
    { key: 'nome', label: 'Nome' },
    { key: 'indirizzo', label: 'Indirizzo', render: (r) => r.indirizzo || '-' },
    { key: 'attivo', label: 'Stato', render: (r) => r.attivo ? 'Attivo' : 'Disattivato' },
  ]

  const handleSaveMagazzino = async () => {
    setSaving(true)
    const payload = {
      nome: editing.nome || '',
      indirizzo: editing.indirizzo || null,
      attivo: editing.attivo ?? true,
    }
    const isNew = !editing.id
    const { error } = isNew ? await createMagazzino(payload) : await updateMagazzino(editing.id, payload)
    setSaving(false)
    if (error) { addToast(error, 'error'); return }
    addToast(isNew ? 'Magazzino creato' : 'Magazzino aggiornato', 'success')
    setEditing(null)
  }

  const handleDelete = async () => {
    let error
    if (tab === 'sedi') {
      ({ error } = await deleteVenue(deleting.id))
    } else if (tab === 'corrieri') {
      ({ error } = await deleteCourier(deleting.id))
    } else {
      ({ error } = await deleteMagazzino(deleting.id))
    }
    const labels = { sedi: 'Sede eliminata', corrieri: 'Corriere eliminato', magazzini: 'Magazzino eliminato' }
    if (error) { addToast(error, 'error') } else { addToast(labels[tab], 'success') }
    setDeleting(null)
  }

  const handleEditSede = (row) => {
    setEditing({ ...row, zone_id: row.zone?.id || row.zone_id || '', courier_id: row.courier_id || '' })
  }

  return (
    <div>
      <MobileHeader title="Sedi, Corrieri & Magazzini" subtitle="Gestisci sedi, corrieri e magazzini" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Sedi, Corrieri & Magazzini' }]} />
      </div>
      <PageHeader mobileHidden title="Sedi, Corrieri & Magazzini" subtitle="Gestisci sedi, corrieri e magazzini" />

      <div className="px-4 md:px-8 pb-8 space-y-4">
        <Tabs tabs={TABS} activeTab={tab} onChange={handleTabChange} />

        {tab === 'sedi' && (
          editing ? (
            <div className={CARD_STYLE + ' md:p-6 max-w-lg space-y-4'}>
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
            <div className={CARD_STYLE + ' md:p-6 max-w-lg space-y-4'}>
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

        {tab === 'magazzini' && (
          editing ? (
            <div className={CARD_STYLE + ' md:p-6 max-w-lg space-y-4'}>
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Modifica magazzino' : 'Nuovo magazzino'}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                <input className={INPUT_STYLE} value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                <input className={INPUT_STYLE} value={editing.indirizzo || ''} onChange={e => setEditing({ ...editing, indirizzo: e.target.value })} />
              </div>
              {editing.id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                  <select className={SELECT_STYLE} value={editing.attivo ? 'true' : 'false'} onChange={e => setEditing({ ...editing, attivo: e.target.value === 'true' })}>
                    <option value="true">Attivo</option>
                    <option value="false">Disattivato</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveMagazzino} loading={saving} disabled={!editing.nome?.trim()}>Salva</Button>
                <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
              </div>
            </div>
          ) : (
            <AdminTable
              columns={magazziniColumns}
              rows={magazzini}
              searchField="nome"
              onAdd={() => setEditing({ nome: '', indirizzo: '', attivo: true })}
              onEdit={(row) => setEditing({ ...row })}
              onDelete={(row) => setDeleting(row)}
              addLabel="Nuovo magazzino"
            />
          )
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title={{ sedi: 'Elimina sede', corrieri: 'Elimina corriere', magazzini: 'Elimina magazzino' }[tab]}
        message={`Sei sicuro di voler eliminare "${deleting?.nome}"?`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        danger
      />
    </div>
  )
}

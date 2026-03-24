import { useState, useEffect, useCallback } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useToastStore } from '../../components/ui/Toast'
import { AdminTable } from '../../components/ui/AdminTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { INPUT_STYLE } from '../../lib/constants'
const CHECK = 'w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400'

const PROVINCE = [
  'AG','AL','AN','AO','AP','AQ','AR','AT','AV','BA','BG','BI','BL','BN','BO','BR','BS','BT',
  'BZ','CA','CB','CE','CH','CL','CN','CO','CR','CS','CT','CZ','EN','FC','FE','FG','FI','FM',
  'FR','GE','GO','GR','IM','IS','KR','LC','LE','LI','LO','LT','LU','MB','MC','ME','MI','MN',
  'MO','MS','MT','NA','NO','NU','OR','PA','PC','PD','PE','PG','PI','PN','PO','PR','PT','PU',
  'PV','PZ','RA','RC','RE','RG','RI','RM','RN','RO','SA','SI','SO','SP','SR','SS','SU','SV',
  'TA','TE','TN','TO','TP','TR','TS','TV','UD','VA','VB','VC','VE','VI','VR','VT',
]

export function AdminZone() {
  const zones = useAdminStore(s => s.zones)
  const couriers = useAdminStore(s => s.couriers)
  const fetchZones = useAdminStore(s => s.fetchZones)
  const fetchCouriers = useAdminStore(s => s.fetchCouriers)
  const createZone = useAdminStore(s => s.createZone)
  const updateZone = useAdminStore(s => s.updateZone)
  const deleteZone = useAdminStore(s => s.deleteZone)
  const fetchZoneProvinces = useAdminStore(s => s.fetchZoneProvinces)
  const setZoneProvinces = useAdminStore(s => s.setZoneProvinces)
  const fetchZoneCouriers = useAdminStore(s => s.fetchZoneCouriers)
  const setZoneCourier = useAdminStore(s => s.setZoneCourier)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [selectedProvinces, setSelectedProvinces] = useState([])
  const [selectedCourier, setSelectedCourier] = useState('')
  const [provinceCounts, setProvinceCounts] = useState({})

  useEffect(() => {
    fetchZones()
    fetchCouriers()
  }, [fetchZones, fetchCouriers])

  // Load province counts for each zone
  useEffect(() => {
    const loadCounts = async () => {
      const counts = {}
      for (const zone of zones) {
        const { data } = await fetchZoneProvinces(zone.id)
        counts[zone.id] = data?.length || 0
      }
      setProvinceCounts(counts)
    }
    if (zones.length > 0) loadCounts()
  }, [zones, fetchZoneProvinces])

  const loadRelated = useCallback(async (zone) => {
    if (zone.id) {
      const { data: provData } = await fetchZoneProvinces(zone.id)
      setSelectedProvinces((provData || []).map(p => p.provincia))
      const { data: courierData } = await fetchZoneCouriers(zone.id)
      setSelectedCourier(courierData?.[0]?.courier_id || '')
    } else {
      setSelectedProvinces([])
      setSelectedCourier('')
    }
  }, [fetchZoneProvinces, fetchZoneCouriers])

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'province_count', label: 'Province', render: (r) => {
      const count = provinceCounts[r.id] || 0
      return `${count} ${count === 1 ? 'provincia' : 'province'}`
    }},
  ]

  const handleEdit = async (row) => {
    setEditing({ ...row })
    await loadRelated(row)
  }

  const handleNew = () => {
    setEditing({ nome: '' })
    setSelectedProvinces([])
    setSelectedCourier('')
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = { nome: editing.nome || '' }
    const isNew = !editing.id
    const res = isNew ? await createZone(payload) : await updateZone(editing.id, payload)
    if (res.error) { setSaving(false); addToast(res.error, 'error'); return }
    const zoneId = isNew ? res.data?.id : editing.id
    if (zoneId) {
      await setZoneProvinces(zoneId, selectedProvinces)
      await setZoneCourier(zoneId, selectedCourier || null)
    }
    setSaving(false)
    addToast(isNew ? 'Zona creata' : 'Zona aggiornata', 'success')
    setEditing(null)
    fetchZones()
  }

  const handleDelete = async () => {
    const { error } = await deleteZone(deleting.id)
    if (error) { addToast(error, 'error') } else { addToast('Zona eliminata', 'success') }
    setDeleting(null)
  }

  const toggleProvince = (prov) => {
    setSelectedProvinces(prev =>
      prev.includes(prov) ? prev.filter(p => p !== prov) : [...prev, prov]
    )
  }

  return (
    <div>
      <MobileHeader title="Zone" subtitle="Gestisci le zone geografiche" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Zone' }]} />
      </div>
      <PageHeader title="Zone" subtitle="Gestisci le zone geografiche" />

      <div className="px-4 md:px-8 pb-8">
        {editing ? (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Modifica zona' : 'Nuova zona'}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                <input className={INPUT_STYLE} value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Corriere predefinito</label>
                <select className={INPUT_STYLE} value={selectedCourier} onChange={e => setSelectedCourier(e.target.value)}>
                  <option value="">-- Nessuno --</option>
                  {couriers.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Province ({selectedProvinces.length} selezionate)</h3>
              <p className="text-sm text-gray-500 mb-3">Seleziona le province che fanno parte di questa zona</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {PROVINCE.map(prov => (
                  <label key={prov} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className={CHECK} checked={selectedProvinces.includes(prov)} onChange={() => toggleProvince(prov)} />
                    {prov}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving} disabled={!editing.nome?.trim()}>Salva</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
            </div>
          </div>
        ) : (
          <AdminTable
            columns={columns}
            rows={zones}
            searchField="nome"
            onAdd={handleNew}
            onEdit={handleEdit}
            onDelete={(row) => setDeleting(row)}
            addLabel="Nuova zona"
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Elimina zona"
        message={`Sei sicuro di voler eliminare "${deleting?.nome}"?`}
        confirmLabel="Elimina"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        danger
      />
    </div>
  )
}

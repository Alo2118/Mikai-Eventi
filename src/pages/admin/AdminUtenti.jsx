import { useState, useEffect, useCallback } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useToastStore } from '../../components/ui/Toast'
import { AdminTable } from '../../components/ui/AdminTable'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { RUOLI, PERMESSI, RUOLI_OPERATIVI } from '../../lib/constants'

const INPUT = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
const CHECK = 'w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400'

export function AdminUtenti() {
  const users = useAdminStore(s => s.users)
  const fetchUsers = useAdminStore(s => s.fetchUsers)
  const updateUser = useAdminStore(s => s.updateUser)
  const fetchUserPermissions = useAdminStore(s => s.fetchUserPermissions)
  const setUserPermissions = useAdminStore(s => s.setUserPermissions)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState([])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const columns = [
    { key: 'cognome', label: 'Cognome' },
    { key: 'nome', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'ruolo', label: 'Ruolo', render: (r) => RUOLI[r.ruolo] || r.ruolo || '-' },
    { key: 'attivo', label: 'Attivo', render: (r) => (
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${r.attivo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {r.attivo !== false ? 'Si' : 'No'}
      </span>
    )},
  ]

  const handleEdit = useCallback(async (row) => {
    setEditing({ ...row })
    const { data } = await fetchUserPermissions(row.id)
    setSelectedPermissions((data || []).map(p => p.permission))
  }, [fetchUserPermissions])

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ruolo: editing.ruolo || null,
      attivo: editing.attivo !== false,
      ruoli_operativi: editing.ruoli_operativi || [],
    }
    const { error } = await updateUser(editing.id, payload)
    if (error) { setSaving(false); addToast(error, 'error'); return }
    await setUserPermissions(editing.id, selectedPermissions)
    setSaving(false)
    addToast('Utente aggiornato', 'success')
    setEditing(null)
  }

  const togglePermission = (perm) => {
    setSelectedPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )
  }

  const toggleRuoloOperativo = (ruolo) => {
    const current = editing.ruoli_operativi || []
    const updated = current.includes(ruolo) ? current.filter(r => r !== ruolo) : [...current, ruolo]
    setEditing({ ...editing, ruoli_operativi: updated })
  }

  return (
    <div>
      <MobileHeader title="Utenti & Permessi" subtitle="Gestisci utenti e permessi" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Utenti & Permessi' }]} />
      </div>
      <PageHeader title="Utenti & Permessi" subtitle="Gestisci utenti e permessi" />

      <div className="px-4 md:px-8 pb-8">
        {editing ? (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Modifica utente</h2>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-base text-gray-700 font-medium">{editing.cognome} {editing.nome}</p>
                <p className="text-sm text-gray-500">{editing.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                <select className={INPUT} value={editing.ruolo || ''} onChange={e => setEditing({ ...editing, ruolo: e.target.value })}>
                  <option value="">-- Seleziona --</option>
                  {Object.entries(RUOLI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className={CHECK} checked={editing.attivo !== false} onChange={e => setEditing({ ...editing, attivo: e.target.checked })} id="attivo" />
                <label htmlFor="attivo" className="text-base text-gray-700">Attivo</label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Ruoli operativi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(RUOLI_OPERATIVI).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-2 text-base text-gray-700 cursor-pointer">
                    <input type="checkbox" className={CHECK} checked={(editing.ruoli_operativi || []).includes(k)} onChange={() => toggleRuoloOperativo(k)} />
                    {v}
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Permessi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(PERMESSI).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-2 text-base text-gray-700 cursor-pointer">
                    <input type="checkbox" className={CHECK} checked={selectedPermissions.includes(k)} onChange={() => togglePermission(k)} />
                    {v}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving}>Salva</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
            </div>
          </div>
        ) : (
          <AdminTable
            columns={columns}
            rows={users}
            searchField="cognome"
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  )
}

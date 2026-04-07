import { useState, useEffect, useCallback } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../../components/ui/Toast'
import { AdminTable } from '../../components/ui/AdminTable'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { Icon } from '../../components/ui/Icon'
import { ACTION_ICONS, ADMIN_ICONS } from '../../lib/icons'
import { RUOLI, PERMESSI, RUOLI_OPERATIVI, ROLE_PERMISSION_PRESETS, INPUT_STYLE, SELECT_STYLE, CARD_STYLE } from '../../lib/constants'

const CHECK = 'w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400'

function generatePassword(nome) {
  return (nome || 'utente').toLowerCase().replace(/\s+/g, '') + '@@@'
}

export function AdminUtenti() {
  const users = useAdminStore(s => s.users)
  const zones = useAdminStore(s => s.zones)
  const fetchUsers = useAdminStore(s => s.fetchUsers)
  const fetchZones = useAdminStore(s => s.fetchZones)
  const updateUser = useAdminStore(s => s.updateUser)
  const fetchUserPermissions = useAdminStore(s => s.fetchUserPermissions)
  const setUserPermissions = useAdminStore(s => s.setUserPermissions)
  const createUser = useAdminStore(s => s.createUser)
  const resetUserPassword = useAdminStore(s => s.resetUserPassword)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [createdPassword, setCreatedPassword] = useState(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetPassword, setResetPassword] = useState(null)
  const [newUser, setNewUser] = useState({ email: '', password: '', nome: '', cognome: '', ruolo: 'commerciale', zone_id: '' })

  useEffect(() => { fetchUsers(); fetchZones() }, [])

  // Auto-generate password from nome
  useEffect(() => {
    if (creating && newUser.nome) {
      setNewUser(u => ({ ...u, password: generatePassword(u.nome) }))
    }
  }, [creating, newUser.nome])

  // Auto-apply permission presets when role changes (creation mode)
  const handleNewRuoloChange = (ruolo) => {
    setNewUser(u => ({ ...u, ruolo }))
    setSelectedPermissions(ROLE_PERMISSION_PRESETS[ruolo] || [])
  }

  // Auto-apply permission presets when role changes (edit mode)
  const handleEditRuoloChange = (ruolo) => {
    setEditing(e => ({ ...e, ruolo }))
    setSelectedPermissions(ROLE_PERMISSION_PRESETS[ruolo] || [])
  }

  const columns = [
    { key: 'cognome', label: 'Cognome' },
    { key: 'nome', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'ruolo', label: 'Ruolo', render: (r) => RUOLI[r.ruolo] || r.ruolo || '-' },
    { key: 'attivo', label: 'Attivo', render: (r) => (
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${r.attivo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        {r.attivo !== false ? 'Sì' : 'No'}
      </span>
    )},
  ]

  const handleEdit = useCallback(async (row) => {
    setEditing({ ...row })
    const { data } = await fetchUserPermissions(row.id)
    setSelectedPermissions((data || []).map(p => p.permission))
  }, [fetchUserPermissions])

  const currentUserId = useAuthStore(s => s.user?.id)
  const reloadProfile = useAuthStore(s => s.loadProfile)

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ruolo: editing.ruolo || null,
      attivo: editing.attivo !== false,
      ruoli_operativi: editing.ruoli_operativi || [],
      zone_id: editing.zone_id || null,
    }
    const { error } = await updateUser(editing.id, payload)
    if (error) { setSaving(false); addToast(error, 'error'); return }
    const { error: permError } = await setUserPermissions(editing.id, selectedPermissions)
    if (permError) { setSaving(false); addToast(permError, 'error'); return }
    // Reload own profile+permissions if editing self
    if (editing.id === currentUserId) await reloadProfile(currentUserId)
    setSaving(false)
    addToast('Utente aggiornato', 'success')
    setEditing(null)
  }

  const handleCreate = async () => {
    if (!newUser.email || !newUser.password || !newUser.nome || !newUser.cognome) {
      addToast('Compila tutti i campi obbligatori', 'warning')
      return
    }
    if (newUser.password.length < 6) {
      addToast('La password deve essere almeno 6 caratteri', 'warning')
      return
    }
    setSaving(true)
    const { data, error } = await createUser(newUser)
    if (error) { setSaving(false); addToast(error, 'error'); return }

    // Auto-assign permissions based on role
    if (data?.id && selectedPermissions.length > 0) {
      await setUserPermissions(data.id, selectedPermissions)
    }

    // Auto-assign zone
    if (data?.id && newUser.zone_id) {
      await updateUser(data.id, { zone_id: newUser.zone_id })
    }

    setSaving(false)
    setCreatedPassword(newUser.password)
    addToast('Utente creato!', 'success')
    setCreating(false)
    setNewUser({ email: '', password: '', nome: '', cognome: '', ruolo: 'commerciale', zone_id: '' })
    setSelectedPermissions([])
  }

  const startCreating = () => {
    setCreating(true)
    setSelectedPermissions(ROLE_PERMISSION_PRESETS['commerciale'] || [])
    setNewUser({ email: '', password: '', nome: '', cognome: '', ruolo: 'commerciale', zone_id: '' })
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

  const handleResetPassword = async () => {
    if (!editing) return
    const tempPw = generatePassword(editing.nome)
    setSaving(true)
    const { error } = await resetUserPassword(editing.id, tempPw)
    setSaving(false)
    setShowResetConfirm(false)
    if (error) { addToast(error, 'error'); return }
    setResetPassword(tempPw)
    addToast('Password reimpostata', 'success')
  }

  const needsZone = (ruolo) => ['commerciale', 'area_manager'].includes(ruolo)

  // ── Permission checkboxes section (reused in create + edit) ──
  function PermissionSection() {
    return (
      <div className={CARD_STYLE + ' md:p-6'}>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Permessi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(PERMESSI).map(([k, v]) => (
            <label key={k} className="flex items-center gap-2 text-base text-gray-700 cursor-pointer min-h-[48px]">
              <input type="checkbox" className={CHECK} checked={selectedPermissions.includes(k)} onChange={() => togglePermission(k)} />
              {v}
            </label>
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-3">I permessi sono pre-compilati dal ruolo. Puoi modificarli manualmente.</p>
      </div>
    )
  }

  return (
    <div>
      <MobileHeader title="Utenti & Permessi" subtitle="Gestisci utenti e permessi" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Utenti & Permessi' }]} />
      </div>
      <PageHeader title="Utenti & Permessi" subtitle={`${users.length} utenti`} />

      <div className="px-4 md:px-8 pb-8">
        {createdPassword && (
          <div className={CARD_STYLE + ' bg-green-50 border-green-200 space-y-2 mb-4 max-w-2xl'}>
            <p className="text-sm font-medium text-green-800">Utente creato! Password temporanea:</p>
            <div className="flex items-center gap-3">
              <code className="text-base font-mono bg-white px-3 py-2 rounded border border-green-200 flex-1">{createdPassword}</code>
              <button onClick={() => { navigator.clipboard.writeText(createdPassword); addToast('Password copiata!', 'success') }}
                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg min-h-[48px]">
                Copia
              </button>
            </div>
            <p className="text-xs text-green-600">Comunicala all'utente, non sarà più visibile dopo la chiusura.</p>
            <button onClick={() => setCreatedPassword(null)} className="text-xs text-green-500 hover:text-green-700">Chiudi</button>
          </div>
        )}
        {creating ? (
          <div className="space-y-4 max-w-2xl">
            <div className={CARD_STYLE + ' md:p-6 space-y-4'}>
              <h2 className="text-lg font-semibold text-gray-900">Nuovo utente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                  <input className={INPUT_STYLE} value={newUser.nome} onChange={e => setNewUser(u => ({ ...u, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome <span className="text-red-500">*</span></label>
                  <input className={INPUT_STYLE} value={newUser.cognome} onChange={e => setNewUser(u => ({ ...u, cognome: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" className={INPUT_STYLE} value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} placeholder="nome.cognome@mikai.it" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password iniziale</label>
                <div className="flex gap-2">
                  <input type="text" className={INPUT_STYLE + ' font-mono'} value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} readOnly />
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(newUser.password); addToast('Password copiata', 'success') }} aria-label="Copia password">
                    <Icon icon={ACTION_ICONS.edit} size={16} />
                  </Button>
                </div>
                <p className="text-sm text-gray-400 mt-1">Generata automaticamente: nome + @@@</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                  <select className={SELECT_STYLE} value={newUser.ruolo} onChange={e => handleNewRuoloChange(e.target.value)}>
                    {Object.entries(RUOLI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {needsZone(newUser.ruolo) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
                    <select className={SELECT_STYLE} value={newUser.zone_id} onChange={e => setNewUser(u => ({ ...u, zone_id: e.target.value }))}>
                      <option value="">-- Nessuna --</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <PermissionSection />

            <div className="flex gap-3">
              <Button onClick={handleCreate} loading={saving}>Crea utente</Button>
              <Button variant="secondary" onClick={() => { setCreating(false); setSelectedPermissions([]) }}>Annulla</Button>
            </div>
          </div>
        ) : editing ? (
          <div className="space-y-4 max-w-2xl">
            <div className={CARD_STYLE + ' md:p-6 space-y-4'}>
              <h2 className="text-lg font-semibold text-gray-900">Modifica utente</h2>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-base text-gray-700 font-medium">{editing.cognome} {editing.nome}</p>
                <p className="text-sm text-gray-500">{editing.email}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                  <select className={SELECT_STYLE} value={editing.ruolo || ''} onChange={e => handleEditRuoloChange(e.target.value)}>
                    <option value="">-- Seleziona --</option>
                    {Object.entries(RUOLI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {needsZone(editing.ruolo) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
                    <select className={SELECT_STYLE} value={editing.zone_id || ''} onChange={e => setEditing({ ...editing, zone_id: e.target.value || null })}>
                      <option value="">-- Nessuna --</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className={CHECK} checked={editing.attivo !== false} onChange={e => setEditing({ ...editing, attivo: e.target.checked })} id="attivo" />
                <label htmlFor="attivo" className="text-base text-gray-700">Attivo</label>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900 min-h-[48px] px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  <Icon icon={ADMIN_ICONS.resetPassword} size={18} />
                  Reimposta password
                </button>
              </div>

              {resetPassword && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-green-800">Password reimpostata:</p>
                  <div className="flex items-center gap-3">
                    <code className="text-base font-mono bg-white px-3 py-2 rounded border border-green-200 flex-1">{resetPassword}</code>
                    <button onClick={() => { navigator.clipboard.writeText(resetPassword); addToast('Password copiata!', 'success') }}
                      className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg min-h-[48px]">
                      Copia
                    </button>
                  </div>
                  <p className="text-xs text-green-600">Comunicala all'utente.</p>
                </div>
              )}
            </div>

            <div className={CARD_STYLE + ' md:p-6'}>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Ruoli operativi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(RUOLI_OPERATIVI).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-2 text-base text-gray-700 cursor-pointer min-h-[48px]">
                    <input type="checkbox" className={CHECK} checked={(editing.ruoli_operativi || []).includes(k)} onChange={() => toggleRuoloOperativo(k)} />
                    {v}
                  </label>
                ))}
              </div>
            </div>

            <PermissionSection />

            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving}>Salva</Button>
              <Button variant="secondary" onClick={() => { setEditing(null); setResetPassword(null) }}>Annulla</Button>
            </div>
            <ConfirmDialog
              open={showResetConfirm}
              title="Reimposta password"
              message={`Reimpostare la password di ${editing?.nome} ${editing?.cognome} a "${generatePassword(editing?.nome)}"?`}
              confirmLabel="Reimposta"
              onConfirm={handleResetPassword}
              onCancel={() => setShowResetConfirm(false)}
            />
          </div>
        ) : (
          <AdminTable
            columns={columns}
            rows={users}
            searchField="cognome"
            onAdd={startCreating}
            onEdit={handleEdit}
            addLabel="Nuovo utente"
          />
        )}
      </div>
    </div>
  )
}

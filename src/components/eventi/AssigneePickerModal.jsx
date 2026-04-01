import { useState, useEffect, useMemo } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { Modal } from '../ui/Modal'
import { SearchInput } from '../ui/SearchInput'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { ACTION_ICONS } from '../../lib/icons'
import { PERMESSO_SHORT_LABELS } from '../../lib/constants'

const RUOLO_LABEL = {
  commerciale: 'Commerciale',
  area_manager: 'Area Manager',
  direzione: 'Direzione',
  ufficio: 'Ufficio',
  admin: 'Admin',
}

export function AssigneePickerModal({
  open,
  onClose,
  onAssign,
  currentUserId,
  permessoResponsabile,
  eventStaff,
  activityDescription,
}) {
  const users = useAdminStore(s => s.users)
  const fetchUsers = useAdminStore(s => s.fetchUsers)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open && (!users || users.length === 0)) {
      fetchUsers()
    }
    if (open) setSearch('')
  }, [open])

  const activeUsers = useMemo(() =>
    (users || []).filter(u => u.attivo !== false),
    [users]
  )

  // Build grouped+sorted user list: me → staff evento → permesso match → tutti
  const groupedUsers = useMemo(() => {
    const s = search.toLowerCase()
    const filtered = s
      ? activeUsers.filter(u =>
          `${u.nome} ${u.cognome}`.toLowerCase().includes(s) ||
          u.email?.toLowerCase().includes(s) ||
          (RUOLO_LABEL[u.ruolo] || '').toLowerCase().includes(s)
        )
      : activeUsers

    const staffIds = new Set((eventStaff || []).map(st => st.user_id))

    const me = filtered.find(u => u.id === currentUserId)
    const staff = filtered.filter(u => u.id !== currentUserId && staffIds.has(u.id))
    const others = filtered.filter(u => u.id !== currentUserId && !staffIds.has(u.id))

    const groups = []
    if (me) {
      groups.push({ label: 'Io', users: [me] })
    }
    if (staff.length > 0) {
      groups.push({ label: 'Staff evento', users: staff })
    }
    if (others.length > 0) {
      groups.push({ label: 'Tutti gli utenti', users: others })
    }
    return groups
  }, [activeUsers, search, currentUserId, eventStaff])

  function handleSelect(userId) {
    onAssign(userId)
    onClose()
  }

  const subtitle = permessoResponsabile
    ? `Responsabilità: ${PERMESSO_SHORT_LABELS[permessoResponsabile] || permessoResponsabile}`
    : undefined

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assegna attività"
      subtitle={subtitle}
      size="sm"
    >
      <div className="space-y-4">
        {activityDescription && (
          <p className="text-sm text-gray-500">{activityDescription}</p>
        )}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cerca persona..."
        />
        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {groupedUsers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nessun utente trovato</p>
          )}
          {groupedUsers.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-mikai-50 transition-colors text-left min-h-[48px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-mikai-100 text-mikai-600 flex items-center justify-center text-sm font-semibold shrink-0">
                      {(user.nome?.[0] || '').toUpperCase()}{(user.cognome?.[0] || '').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.cognome} {user.nome}
                        {user.id === currentUserId && (
                          <span className="text-mikai-500 ml-1">(io)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{RUOLO_LABEL[user.ruolo] || user.ruolo}</p>
                    </div>
                    <Icon icon={ACTION_ICONS.chevron_right} size={16} className="text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

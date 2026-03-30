import { useState, useEffect } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { FormField } from '../ui/FormField'
import { SELECT_STYLE } from '../../lib/constants'

const RUOLO_LABEL = {
  commerciale: 'Commerciale',
  area_manager: 'Area Manager',
  direzione: 'Direzione',
  ufficio: 'Ufficio',
  admin: 'Admin',
}

const ROLE_ORDER = ['commerciale', 'area_manager', 'direzione', 'ufficio', 'admin']

function groupUsersByRole(users) {
  const groups = {}
  for (const role of ROLE_ORDER) {
    groups[role] = []
  }
  for (const user of users) {
    const role = user.ruolo || 'ufficio'
    if (!groups[role]) groups[role] = []
    groups[role].push(user)
  }
  return groups
}

export function PromoterePicker({ value, onChange, currentUserId }) {
  const users = useAdminStore(s => s.users)
  const fetchUsers = useAdminStore(s => s.fetchUsers)

  useEffect(() => {
    if (!users || users.length === 0) {
      fetchUsers()
    }
  }, [])

  const activeUsers = (users || []).filter(u => u.attivo !== false)
  const grouped = groupUsersByRole(activeUsers)

  function handleChange(e) {
    const userId = e.target.value
    if (!userId) {
      onChange(null)
      return
    }
    const user = activeUsers.find(u => u.id === userId)
    if (user) onChange(user)
  }

  return (
    <FormField label="Promotore" required>
      <select
        className={SELECT_STYLE + ' min-h-[48px]'}
        value={value || ''}
        onChange={handleChange}
        aria-label="Seleziona promotore"
      >
        <option value="">Seleziona promotore...</option>
        {ROLE_ORDER.map(role => {
          const group = grouped[role]
          if (!group || group.length === 0) return null
          return (
            <optgroup key={role} label={RUOLO_LABEL[role] || role}>
              {group.map(user => (
                <option key={user.id} value={user.id}>
                  {user.cognome} {user.nome} ({RUOLO_LABEL[user.ruolo] || user.ruolo})
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
    </FormField>
  )
}

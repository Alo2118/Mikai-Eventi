import { useState, useEffect } from 'react'
import { useUsersStore } from '../../hooks/useUsers'
import { useContactsStore } from '../../hooks/useContacts'
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

export function PromoterePicker({ value, onChange, currentUserId, error, onBlur }) {
  const users = useUsersStore(s => s.users)
  const fetchUsers = useUsersStore(s => s.fetchUsers)
  const agents = useContactsStore(s => s.agents)
  const fetchAgents = useContactsStore(s => s.fetchAgents)

  useEffect(() => {
    if (!users || users.length === 0) fetchUsers()
    if (!agents || agents.length === 0) fetchAgents()
  }, [])

  const activeUsers = (users || []).filter(u => u.attivo !== false)
  const activeAgents = (agents || []).filter(a => a.attivo !== false)
  const grouped = groupUsersByRole(activeUsers)

  function handleChange(e) {
    const raw = e.target.value
    if (!raw) {
      onChange(null)
      return
    }
    // Value format: "user:UUID" or "contact:UUID"
    const [type, id] = raw.split(':')
    if (type === 'contact') {
      const agent = activeAgents.find(a => a.id === id)
      if (agent) onChange({ ...agent, _type: 'contact' })
    } else {
      const user = activeUsers.find(u => u.id === id)
      if (user) onChange({ ...user, _type: 'user' })
    }
  }

  // Determine current select value
  let selectValue = ''
  if (value) {
    if (typeof value === 'string') {
      // Legacy: just an ID — check if it's a user or contact
      const isAgent = activeAgents.some(a => a.id === value)
      selectValue = isAgent ? `contact:${value}` : `user:${value}`
    } else if (value._type === 'contact') {
      selectValue = `contact:${value.id}`
    } else {
      selectValue = `user:${value.id || value}`
    }
  }

  return (
    <FormField label="Promotore" required error={error}>
      <select
        className={SELECT_STYLE + ' min-h-[48px]'}
        value={selectValue}
        onChange={handleChange}
        onBlur={onBlur}
        aria-label="Seleziona promotore"
        aria-invalid={!!error}
      >
        <option value="">Seleziona promotore...</option>
        {ROLE_ORDER.map(role => {
          const group = grouped[role]
          if (!group || group.length === 0) return null
          return (
            <optgroup key={role} label={RUOLO_LABEL[role] || role}>
              {group.map(user => (
                <option key={user.id} value={`user:${user.id}`}>
                  {user.cognome} {user.nome} ({RUOLO_LABEL[user.ruolo] || user.ruolo})
                </option>
              ))}
            </optgroup>
          )
        })}
        {activeAgents.length > 0 && (
          <optgroup label="Agenti esterni">
            {activeAgents.map(agent => (
              <option key={agent.id} value={`contact:${agent.id}`}>
                {agent.cognome} {agent.nome}{agent.azienda ? ` (${agent.azienda})` : ''}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </FormField>
  )
}

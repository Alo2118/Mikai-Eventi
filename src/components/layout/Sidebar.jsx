import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { Icon } from '../ui/Icon'
import { NotificationBell } from '../ui/NotificationBell'
import { ChangePasswordModal } from '../ui/ChangePasswordModal'
import { NAV_ICONS, ADMIN_ICONS, ACTION_ICONS, COMPLIANCE_ICONS, PASSWORD_ICONS } from '../../lib/icons'

// Grouped navigation structure
const navGroups = [
  {
    id: 'principale',
    items: [
      { to: '/', label: 'Riepilogo', icon: NAV_ICONS.riepilogo, roles: ['admin', 'direzione', 'ufficio', 'commerciale', 'area_manager'] },
      { to: '/eventi', label: 'Eventi', icon: NAV_ICONS.eventi },
      { to: '/eventi/calendario', label: 'Calendario', icon: NAV_ICONS.calendario },
      { to: '/notifiche', label: 'Notifiche', icon: NAV_ICONS.notifiche },
    ],
  },
  {
    id: 'operativo',
    label: 'Operativo',
    items: [
      { to: '/materiale', label: 'Magazzino', icon: NAV_ICONS.materiale, permissions: ['gestione_magazzino', 'gestione_spedizioni'] },
      { to: '/logistica', label: 'Logistica', icon: NAV_ICONS.logistica, permissions: ['gestione_spedizioni', 'gestione_magazzino'] },
      { to: '/contatti', label: 'Contatti', icon: NAV_ICONS.contatti },
      { to: '/costi', label: 'Costi', icon: NAV_ICONS.costi, permissions: ['gestione_costi', 'approva_preventivi'] },
      { to: '/report/materiale', label: 'Report Materiale', icon: NAV_ICONS.report, permissions: ['gestione_magazzino', 'gestione_spedizioni'] },
      { to: '/compliance', label: 'Compliance', icon: COMPLIANCE_ICONS.compliance, permissions: ['compliance'] },
    ],
  },
  {
    id: 'catalogo',
    label: 'Catalogo',
    admin: true,
    items: [
      { to: '/admin/prodotti', label: 'Prodotti & Kit', icon: ADMIN_ICONS.prodotti },
      { to: '/admin/tipo-prodotto', label: 'Tipologie Prodotto', icon: ADMIN_ICONS.prodotti },
      { to: '/admin/brand', label: 'Brand', icon: ADMIN_ICONS.brand },
      { to: '/admin/distretti', label: 'Distretti', icon: ADMIN_ICONS.distretti },
    ],
  },
  {
    id: 'configurazione',
    label: 'Configurazione',
    admin: true,
    items: [
      { to: '/admin/tipo-evento', label: 'Tipologie Evento', icon: NAV_ICONS.eventi },
      { to: '/admin/sotto-attivita', label: 'Sotto-attività', icon: ADMIN_ICONS.sottoattivita },
      { to: '/admin/template', label: 'Template attività', icon: NAV_ICONS.checklist },
      { to: '/admin/sedi', label: 'Sedi & Corrieri', icon: ADMIN_ICONS.sedi },
      { to: '/admin/zone', label: 'Zone', icon: ADMIN_ICONS.zone },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    admin: true,
    items: [
      { to: '/admin/utenti', label: 'Utenti', icon: ADMIN_ICONS.utenti, permissions: ['gestione_utenti'] },
      { to: '/admin/audit', label: 'Audit Trail', icon: COMPLIANCE_ICONS.audit, permissions: ['gestione_utenti'] },
    ],
  },
]

function NavGroup({ group, canSee, collapsed, onToggle }) {
  const location = useLocation()
  const visibleItems = group.items.filter(canSee)
  if (visibleItems.length === 0) return null

  const isActive = visibleItems.some(item => location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to)))

  // No label = always expanded (main group)
  if (!group.label) {
    return (
      <div className="space-y-0.5">
        {visibleItems.map(item => <SidebarLink key={item.to} item={item} />)}
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
      >
        <span className={isActive && collapsed ? 'text-mikai-500' : ''}>{group.label}</span>
        <Icon
          icon={collapsed ? ACTION_ICONS.chevronDown : ACTION_ICONS.chevronUp}
          size={12}
          className="text-gray-300"
        />
      </button>
      {!collapsed && (
        <div className="space-y-0.5 mt-0.5">
          {visibleItems.map(item => <SidebarLink key={item.to} item={item} compact />)}
        </div>
      )}
    </div>
  )
}

function SidebarLink({ item, compact }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 ${compact ? 'px-4 py-2 text-sm' : 'px-4 py-2.5 text-base'} rounded-lg font-medium min-h-[44px] transition-colors ${
          isActive
            ? 'bg-mikai-50 text-mikai-700'
            : 'text-gray-700 hover:bg-gray-50'
        }`
      }
    >
      <Icon icon={item.icon} size={compact ? 18 : 20} />
      {item.label}
    </NavLink>
  )
}

export function Sidebar() {
  const profile = useAuthStore(s => s.profile)
  const signOut = useAuthStore(s => s.signOut)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())

  const canSee = (item) => {
    if (item.roles && !item.roles.includes(profile?.ruolo)) return false
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false
    return true
  }

  const showAdmin = hasPermission('gestione_catalogo')

  const toggleGroup = (id) => setCollapsedGroups(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-5 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-bold text-mikai-400">Mikai Eventi</h1>
        <NotificationBell />
      </div>
      <div className="px-3 pt-3">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors min-h-[48px]"
          aria-label="Ricerca globale"
        >
          <Icon icon={ACTION_ICONS.search} size={18} />
          <span className="flex-1 text-left">Cerca...</span>
          <kbd className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Ctrl+K</kbd>
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {navGroups
          .filter(g => !g.admin || showAdmin)
          .map(group => (
            <NavGroup
              key={group.id}
              group={group}
              canSee={canSee}
              collapsed={collapsedGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
            />
          ))}
      </nav>
      <div className="p-4 border-t border-gray-200 space-y-1">
        <p className="text-sm text-gray-500 mb-2">
          {profile?.nome} {profile?.cognome}
        </p>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 min-h-[48px] px-2 w-full"
        >
          <Icon icon={PASSWORD_ICONS.key} size={18} />
          Cambia password
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 min-h-[48px] px-2 w-full"
        >
          <Icon icon={NAV_ICONS.logout} size={18} />
          Esci
        </button>
      </div>
      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </aside>
  )
}

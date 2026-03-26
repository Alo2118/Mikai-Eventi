import { Link } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { Icon } from '../../components/ui/Icon'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { CARD_STYLE, CARD_HOVER_STYLE } from '../../lib/constants'
import { NAV_ICONS, ADMIN_ICONS, COMPLIANCE_ICONS, ACTION_ICONS } from '../../lib/icons'

const sections = [
  { to: '/eventi/nuovo', label: 'Nuovo evento', icon: NAV_ICONS.nuovo },
  { to: '/eventi/calendario', label: 'Calendario', icon: NAV_ICONS.calendario },
  { to: '/materiale', label: 'Magazzino', icon: NAV_ICONS.materiale, permissions: ['gestione_magazzino', 'gestione_spedizioni'] },
  { to: '/logistica', label: 'Logistica', icon: NAV_ICONS.logistica, permissions: ['gestione_spedizioni', 'gestione_magazzino'] },
  { to: '/costi', label: 'Costi', icon: NAV_ICONS.costi, permissions: ['gestione_costi', 'approva_preventivi'] },
  { to: '/report/materiale', label: 'Report Materiale', icon: NAV_ICONS.report, permissions: ['gestione_magazzino', 'gestione_spedizioni'] },
  { to: '/compliance', label: 'Compliance', icon: COMPLIANCE_ICONS.compliance, permissions: ['compliance'] },
]

const adminSections = [
  { to: '/admin/utenti', label: 'Utenti', icon: ADMIN_ICONS.utenti, permissions: ['gestione_utenti'] },
  { to: '/admin/brand', label: 'Brand', icon: ADMIN_ICONS.brand },
  { to: '/admin/prodotti', label: 'Prodotti & Kit', icon: ADMIN_ICONS.prodotti },
  { to: '/admin/materiali', label: 'Materiali', icon: ADMIN_ICONS.materiali },
  { to: '/admin/sedi', label: 'Sedi & Corrieri', icon: ADMIN_ICONS.sedi },
  { to: '/admin/template', label: 'Template attività', icon: NAV_ICONS.checklist },
]

export function AltroPage() {
  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const signOut = useAuthStore(s => s.signOut)
  const showAdmin = hasPermission('gestione_catalogo')

  const canSee = (item) => {
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false
    return true
  }

  const visibleSections = sections.filter(canSee)
  const visibleAdmin = showAdmin ? adminSections.filter(canSee) : []

  return (
    <div className="space-y-6 px-4 py-4">
      <MobileHeader title="Altro" />

      {profile && (
        <div className={CARD_STYLE}>
          <p className="font-semibold text-lg">{profile.nome} {profile.cognome}</p>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>
      )}

      <div className="space-y-2">
        {visibleSections.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={'flex items-center gap-3 ' + CARD_HOVER_STYLE + ' min-h-[48px]'}
          >
            <Icon icon={item.icon} size={20} className="text-gray-500" />
            <span className="font-medium text-base">{item.label}</span>
          </Link>
        ))}
      </div>

      {visibleAdmin.length > 0 && (
        <>
          <h3 className="font-semibold text-lg text-gray-600">Amministrazione</h3>
          <div className="space-y-2">
            {visibleAdmin.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={'flex items-center gap-3 ' + CARD_HOVER_STYLE + ' min-h-[48px]'}
              >
                <Icon icon={item.icon} size={20} className="text-gray-500" />
                <span className="font-medium text-base">{item.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <button
        onClick={signOut}
        className={'flex items-center gap-3 w-full ' + CARD_HOVER_STYLE + ' min-h-[48px] text-red-600'}
      >
        <Icon icon={ACTION_ICONS.close} size={20} />
        <span className="font-medium text-base">Esci</span>
      </button>
    </div>
  )
}

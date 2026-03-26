import { useEffect, useState, useCallback } from 'react'
import { useNotificationsStore } from '../../hooks/useNotifications'
import { PageHeader } from '../../components/ui/PageHeader'
import { NotificationCard } from '../../components/ui/NotificationCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { NotificationPreferences } from '../../components/notifiche/NotificationPreferences'
import { TIPO_NOTIFICA, SELECT_STYLE } from '../../lib/constants'
import { NAV_ICONS } from '../../lib/icons'

const PAGE_SIZE = 50

export function NotifichePage() {
  const notifications = useNotificationsStore(s => s.notifications)
  const unreadCount = useNotificationsStore(s => s.unreadCount)
  const loading = useNotificationsStore(s => s.loading)
  const fetchNotifications = useNotificationsStore(s => s.fetchNotifications)
  const markAllAsRead = useNotificationsStore(s => s.markAllAsRead)

  const [filterTipo, setFilterTipo] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [page, setPage] = useState(0)
  const [showPreferences, setShowPreferences] = useState(false)

  useEffect(() => { fetchNotifications(PAGE_SIZE, 0) }, [])

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchNotifications(PAGE_SIZE, nextPage * PAGE_SIZE)
  }, [page, fetchNotifications])

  const filtered = notifications.filter(n => {
    if (filterTipo && n.tipo !== filterTipo) return false
    if (filterStato === 'non_lette' && n.letta) return false
    if (filterStato === 'lette' && !n.letta) return false
    return true
  })

  return (
    <div>
      <MobileHeader title="Notifiche" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Notifiche' }]} />
      </div>
      <PageHeader
        title="Notifiche"
        subtitle={unreadCount > 0 ? `${unreadCount} non lette` : 'Tutto letto'}
        actions={
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={markAllAsRead}>
                Segna tutte come lette
              </Button>
            )}
            <Button
              variant={showPreferences ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowPreferences(!showPreferences)}
              aria-label="Preferenze notifiche"
            >
              <Icon icon={NAV_ICONS.impostazioni} size={18} />
              <span className="hidden md:inline ml-1">Preferenze</span>
            </Button>
          </div>
        }
      />

      <div className="px-4 md:px-8 pb-8">
        {/* Preferences panel */}
        {showPreferences && (
          <div className="mb-6 p-4 md:p-6 bg-white border border-gray-200 rounded-xl">
            <NotificationPreferences />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <select
            className={SELECT_STYLE}
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
            aria-label="Filtra per tipo"
          >
            <option value="">Tutti i tipi</option>
            {Object.entries(TIPO_NOTIFICA).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            className={SELECT_STYLE}
            value={filterStato}
            onChange={e => setFilterStato(e.target.value)}
            aria-label="Filtra per stato"
          >
            <option value="">Tutte</option>
            <option value="non_lette">Non lette</option>
            <option value="lette">Lette</option>
          </select>
        </div>

        {/* List */}
        {loading && notifications.length === 0 ? (
          <LoadingSkeleton lines={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Tutto in ordine!"
            description="Non hai notifiche."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map(n => (
              <NotificationCard key={n.id} notification={n} />
            ))}
          </div>
        )}

        {/* Load more */}
        {notifications.length > 0 && notifications.length % PAGE_SIZE === 0 ? (
          <div className="mt-4 text-center">
            <Button variant="secondary" onClick={handleLoadMore} loading={loading}>
              Carica altre notifiche
            </Button>
          </div>
        ) : notifications.length > 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">Nessun'altra notifica</p>
        ) : null}
      </div>
    </div>
  )
}

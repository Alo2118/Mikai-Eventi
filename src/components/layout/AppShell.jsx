import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomBar } from './BottomBar'
import { ToastContainer } from '../ui/Toast'
import { GlobalSearch } from '../ui/GlobalSearch'
import { NotificationBell } from '../ui/NotificationBell'
import { OfflineIndicator } from '../ui/OfflineIndicator'
import { InstallPrompt } from '../ui/InstallPrompt'
import { useAuthStore } from '../../hooks/useAuth'
import { useNotificationsStore } from '../../hooks/useNotifications'

export function AppShell() {
  const profile = useAuthStore(s => s.profile)
  const fetchUnreadCount = useNotificationsStore(s => s.fetchUnreadCount)
  const fetchNotifications = useNotificationsStore(s => s.fetchNotifications)
  const subscribeRealtime = useNotificationsStore(s => s.subscribeRealtime)
  const unsubscribeRealtime = useNotificationsStore(s => s.unsubscribeRealtime)
  const channelRef = useRef(null)

  useEffect(() => {
    const userId = profile?.id
    if (!userId) return

    // Initial unread count + recent notifications for dropdown
    fetchUnreadCount()
    fetchNotifications(10, 0)

    // Realtime subscription
    const channel = subscribeRealtime(userId)
    channelRef.current = channel

    // Polling fallback: every 60s re-fetch unread count
    const pollInterval = setInterval(() => {
      fetchUnreadCount()
    }, 60_000)

    return () => {
      if (channelRef.current) {
        unsubscribeRealtime(channelRef.current)
        channelRef.current = null
      }
      clearInterval(pollInterval)
    }
  }, [profile?.id])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0 overflow-x-hidden">
        <Outlet />
      </main>
      <BottomBar />

      {/* Mobile notification bell — fixed top-right, hidden on desktop */}
      <div className="fixed top-3 right-3 z-40 md:hidden">
        <NotificationBell />
      </div>

      <OfflineIndicator />
      <InstallPrompt />
      <ToastContainer />
      <GlobalSearch />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Icon } from './Icon'
import { PWA_ICONS } from '../../lib/icons'

export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      // Brief delay before hiding to show "reconnected" feedback
      setTimeout(() => setShow(false), 1500)
    }
    const handleOffline = () => {
      setOnline(false)
      setShow(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    if (!navigator.onLine) {
      setOnline(false)
      setShow(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!show) return null

  return (
    <div
      role="alert"
      className={`fixed top-0 inset-x-0 z-50 text-center py-3 px-4 text-white text-base font-medium transition-colors duration-300 ${
        online ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {online ? (
          <>
            <Icon icon={PWA_ICONS.online} size={18} />
            <span>Connessione ripristinata</span>
          </>
        ) : (
          <>
            <Icon icon={PWA_ICONS.wifiOff} size={18} />
            <span>Connessione assente &mdash; l&apos;app richiede internet per funzionare</span>
          </>
        )}
      </div>
    </div>
  )
}

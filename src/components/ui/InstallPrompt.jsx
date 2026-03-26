import { useState, useEffect, useRef } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import { PWA_ICONS } from '../../lib/icons'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DAYS = 7

function isDismissed() {
  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (!dismissed) return false
  const daysSince = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24)
  return daysSince < DISMISS_DAYS
}

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const deferredPromptRef = useRef(null)

  useEffect(() => {
    // Only show on mobile-ish screens
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    if (!isMobile || isDismissed()) return

    const handleBeforeInstall = (e) => {
      e.preventDefault()
      deferredPromptRef.current = e
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    const prompt = deferredPromptRef.current
    if (!prompt) return

    prompt.prompt()
    await prompt.userChoice
    deferredPromptRef.current = null
    setShow(false)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 inset-x-0 z-40 px-4 md:hidden">
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-mikai-50 flex items-center justify-center">
          <Icon icon={PWA_ICONS.install} size={22} className="text-mikai-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Installa Eventi Mikai</p>
          <p className="text-xs text-gray-500">Accesso rapido dal tuo dispositivo</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Non ora
          </Button>
          <Button variant="primary" size="sm" onClick={handleInstall}>
            Installa
          </Button>
        </div>
      </div>
    </div>
  )
}

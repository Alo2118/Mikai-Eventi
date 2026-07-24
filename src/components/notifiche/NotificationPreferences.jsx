import { useEffect, useState } from 'react'
import { useNotificationsStore } from '../../hooks/useNotifications'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { TIPO_NOTIFICA } from '../../lib/constants'
import { NOTIFICA_ICONS } from '../../lib/icons'
import { PushActivationCard } from './PushActivationCard'

export function NotificationPreferences() {
  const preferences = useNotificationsStore(s => s.preferences)
  const fetchPreferences = useNotificationsStore(s => s.fetchPreferences)
  const updatePreferences = useNotificationsStore(s => s.updatePreferences)
  const addToast = useToastStore(s => s.add)

  const [localPrefs, setLocalPrefs] = useState({
    email_daily: true,
    email_weekly: true,
    mute_types: [],
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchPreferences().then(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        email_daily: preferences.email_daily ?? true,
        email_weekly: preferences.email_weekly ?? true,
        mute_types: preferences.mute_types || [],
      })
    }
  }, [preferences])

  const handleToggle = (field) => {
    setLocalPrefs(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleMuteToggle = (tipo) => {
    setLocalPrefs(prev => {
      const muted = prev.mute_types.includes(tipo)
      return {
        ...prev,
        mute_types: muted
          ? prev.mute_types.filter(t => t !== tipo)
          : [...prev.mute_types, tipo],
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await updatePreferences({
      email_daily: localPrefs.email_daily,
      email_weekly: localPrefs.email_weekly,
      mute_types: localPrefs.mute_types,
    })
    setSaving(false)
    if (error) {
      addToast('Errore nel salvataggio delle preferenze', 'error')
    } else {
      addToast('Preferenze salvate', 'success')
    }
  }

  if (!loaded) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Preferenze Notifiche</h3>
        <p className="text-sm text-gray-500">
          Configura come ricevere le notifiche via email. Le notifiche in-app restano sempre attive.
        </p>
      </div>

      {/* Push sul dispositivo (secondo canale, oltre a in-app ed email) */}
      <PushActivationCard />

      {/* Email toggles */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Email di riepilogo</h4>

        <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer min-h-[48px] hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={localPrefs.email_daily}
            onChange={() => handleToggle('email_daily')}
            className="w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400"
          />
          <div className="flex-1">
            <span className="text-base text-gray-900">Email giornaliera</span>
            <p className="text-sm text-gray-500">Lunedì-venerdì alle 8:00 — approvazioni, scadenze, eventi del giorno</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer min-h-[48px] hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={localPrefs.email_weekly}
            onChange={() => handleToggle('email_weekly')}
            className="w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400"
          />
          <div className="flex-1">
            <span className="text-base text-gray-900">Email settimanale</span>
            <p className="text-sm text-gray-500">Lunedì alle 8:00 — riepilogo settimanale, avvisi budget</p>
          </div>
        </label>
      </div>

      {/* Mute types */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Silenzia per tipo (email)</h4>
        <p className="text-xs text-gray-500">
          Le notifiche selezionate non verranno incluse nelle email di riepilogo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Object.entries(TIPO_NOTIFICA).map(([key, label]) => {
            const isMuted = localPrefs.mute_types.includes(key)
            const iconComponent = NOTIFICA_ICONS[key]

            return (
              <label
                key={key}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer min-h-[48px] transition-colors ${
                  isMuted
                    ? 'bg-gray-100 border-gray-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isMuted}
                  onChange={() => handleMuteToggle(key)}
                  className="w-5 h-5 rounded border-gray-300 text-gray-500 focus:ring-mikai-400"
                />
                {iconComponent && (
                  <Icon icon={iconComponent} size={18} className="text-gray-400 flex-shrink-0" />
                )}
                <span className={`text-sm ${isMuted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                  {label}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
        >
          Salva preferenze
        </Button>
      </div>
    </div>
  )
}

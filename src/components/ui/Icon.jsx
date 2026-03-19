// Wrapper centralizzato per tutte le icone.
// Uso: <Icon name="calendar" size={24} />
// oppure: <Icon icon={CalendarComponent} size={24} />
//
// Mai importare lucide-react direttamente nei componenti.

import { NAV_ICONS, ACTION_ICONS, FEEDBACK_ICONS, MATERIALE_ICONS, TOAST_ICONS } from '../../lib/icons'

// Flat lookup per uso con name string
const ALL_ICONS = {
  ...NAV_ICONS,
  ...ACTION_ICONS,
  ...FEEDBACK_ICONS,
  ...MATERIALE_ICONS,
  ...TOAST_ICONS,
}

export function Icon({
  name,
  icon: IconComponent,
  size = 24,
  className = '',
  strokeWidth = 2,
  ...props
}) {
  const Resolved = IconComponent || ALL_ICONS[name]

  if (!Resolved) {
    if (import.meta.env.DEV) {
      console.warn(`[Icon] Unknown icon name: "${name}"`)
    }
    return null
  }

  return (
    <Resolved
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      {...props}
    />
  )
}

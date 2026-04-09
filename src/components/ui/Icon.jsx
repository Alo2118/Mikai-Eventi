// Wrapper centralizzato per tutte le icone.
// Uso: <Icon name="calendar" size={24} />
// oppure: <Icon icon={CalendarComponent} size={24} />
//
// Mai importare lucide-react direttamente nei componenti.

import {
  TIPO_EVENTO_ICONS,
  MODALITA_ICONS,
  STATO_EVENTO_ICONS,
  STATUS_COLOR_ICONS,
  NAV_ICONS,
  ACTION_ICONS,
  MATERIALE_ICONS,
  CATALOGO_ICONS,
  WIZARD_STEP_ICONS,
  TOAST_ICONS,
  POSIZIONE_ICONS,
  ADMIN_ICONS,
  FEEDBACK_ICONS,
  ATTIVITA_STATO_ICONS,
  CATEGORIA_ICONS,
  CONTATTI_ICONS,
  INFO_EVENTO_ICONS,
  LOGISTICA_PERSONE_ICONS,
  COSTI_ICONS,
  NOTIFICA_ICONS,
  SOTTO_ATTIVITA_ICONS,
  TRASPORTO_ICONS,
  TAVOLI_ICONS,
  DOCUMENTO_ICONS,
  DASHBOARD_ICONS,
  PWA_ICONS,
  COMPLIANCE_ICONS,
  STATO_MATERIALE_RICHIESTA_ICONS,
  STATO_DOCUMENTO_ICONS,
  STATO_RIENTRO_ICONS,
  TIPO_BRAND_ICONS,
  TIPO_CONTATTO_ICONS,
  TIPO_PRODOTTO_ICONS,
  PASSWORD_ICONS,
  ICON_BY_NAME,
} from '../../lib/icons'

// Flat lookup per uso con name string
const ALL_ICONS = {
  ...TIPO_EVENTO_ICONS,
  ...MODALITA_ICONS,
  ...STATO_EVENTO_ICONS,
  ...STATUS_COLOR_ICONS,
  ...NAV_ICONS,
  ...ACTION_ICONS,
  ...MATERIALE_ICONS,
  ...CATALOGO_ICONS,
  ...WIZARD_STEP_ICONS,
  ...TOAST_ICONS,
  ...POSIZIONE_ICONS,
  ...ADMIN_ICONS,
  ...FEEDBACK_ICONS,
  ...ATTIVITA_STATO_ICONS,
  ...CATEGORIA_ICONS,
  ...CONTATTI_ICONS,
  ...INFO_EVENTO_ICONS,
  ...LOGISTICA_PERSONE_ICONS,
  ...COSTI_ICONS,
  ...NOTIFICA_ICONS,
  ...SOTTO_ATTIVITA_ICONS,
  ...TRASPORTO_ICONS,
  ...TAVOLI_ICONS,
  ...DOCUMENTO_ICONS,
  ...DASHBOARD_ICONS,
  ...PWA_ICONS,
  ...COMPLIANCE_ICONS,
  ...STATO_MATERIALE_RICHIESTA_ICONS,
  ...STATO_DOCUMENTO_ICONS,
  ...STATO_RIENTRO_ICONS,
  ...TIPO_BRAND_ICONS,
  ...TIPO_CONTATTO_ICONS,
  ...TIPO_PRODOTTO_ICONS,
  ...PASSWORD_ICONS,
}

export function Icon({
  name,
  icon: IconComponent,
  size = 24,
  className = '',
  strokeWidth = 2,
  ...props
}) {
  const Resolved = IconComponent || ALL_ICONS[name] || ICON_BY_NAME[name]

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

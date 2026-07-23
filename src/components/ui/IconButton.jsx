import { Button } from './Button'
import { Icon } from './Icon'

// Wrapper icon-only per azioni compatte (es. slot azioni di MobileHeader).
// Vero reuse di Button (size="icon" + polymorphic `to`) — nessuna duplicazione
// di classi/varianti. onClick e to sono mutuamente esclusivi: to -> <Link>
// react-router (via Button), altrimenti <button>.
export function IconButton({ icon, label, onClick, to, disabled, loading, variant = 'ghost' }) {
  if (import.meta.env.DEV && Boolean(onClick) === Boolean(to)) {
    console.warn(`[IconButton] "${label}": passa esattamente uno tra "onClick" e "to" (mai entrambi, mai nessuno).`)
  }

  return (
    <Button
      {...(to ? {} : { type: 'button' })}
      to={to}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      variant={variant}
      size="icon"
      aria-label={label}
      title={label}
    >
      {!loading && <Icon icon={icon} size={20} />}
    </Button>
  )
}

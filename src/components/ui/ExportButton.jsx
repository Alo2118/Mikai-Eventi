import { Button } from './Button'
import { Icon } from './Icon'
import { DOCUMENTO_ICONS } from '../../lib/icons'

export function ExportButton({ onClick, loading = false, label = 'Esporta Excel' }) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      loading={loading}
      disabled={loading}
    >
      <Icon icon={DOCUMENTO_ICONS.spreadsheet} size={18} className="mr-2" />
      {label}
    </Button>
  )
}

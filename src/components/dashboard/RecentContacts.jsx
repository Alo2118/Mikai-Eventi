import { Link } from 'react-router-dom'
import { EmptyState } from '../ui/EmptyState'
import { TIPO_CONTATTO, CARD_STYLE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'

export function RecentContacts({ contacts }) {
  if (!contacts || contacts.length === 0) {
    return (
      <div className={CARD_STYLE}>
        <h3 className="font-semibold text-lg mb-3">Contatti recenti</h3>
        <EmptyState title="Nessun contatto" description="Non hai ancora aggiunto contatti" />
      </div>
    )
  }

  return (
    <div className={CARD_STYLE}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">Contatti recenti</h3>
        <Link to="/contatti" className="text-sm text-mikai-400 hover:underline min-h-[48px] flex items-center">
          Vedi tutti
        </Link>
      </div>
      <div className="space-y-2">
        {contacts.map(c => (
          <Link
            key={c.id}
            to={`/contatti/${c.id}`}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors min-h-[48px]"
          >
            <div className="min-w-0">
              <p className="font-medium text-base truncate">{c.cognome} {c.nome}</p>
              <p className="text-sm text-gray-500">{TIPO_CONTATTO[c.tipo_contatto] || c.tipo_contatto}</p>
            </div>
            <span className="text-xs text-gray-400 shrink-0 ml-2">{formatDate(c.created_at)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

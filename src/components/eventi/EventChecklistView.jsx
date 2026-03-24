import { useState } from 'react'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useToastStore } from '../ui/Toast'
import { SearchInput } from '../ui/SearchInput'
import { formatDate } from '../../lib/date-utils'
import { TIPO_PARTECIPANTE } from '../../lib/constants'

export function EventChecklistView({ event, participants }) {
  const [search, setSearch] = useState('')
  const updateParticipant = useParticipantsStore(s => s.updateParticipant)
  const addToast = useToastStore(s => s.add)

  const attendees = participants.filter(p => p.tipo !== 'staff')
  const presenti = attendees.filter(p => p.stato_iscrizione === 'presente')

  const filtered = attendees.filter(p => {
    if (!search) return true
    const full = `${p.contact?.cognome ?? ''} ${p.contact?.nome ?? ''}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  async function handleToggle(p) {
    const nuovoStato = p.stato_iscrizione === 'presente' ? 'assente' : 'presente'
    const { error } = await updateParticipant(p.id, { stato_iscrizione: nuovoStato })
    if (error) {
      addToast('Errore durante l\'aggiornamento', 'error')
      return
    }
    const nome = `${p.contact?.nome ?? ''} ${p.contact?.cognome ?? ''}`.trim()
    const label = nuovoStato === 'presente' ? 'presente' : 'assente'
    addToast(`${nome} segnato come ${label}`, 'success')
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{event.titolo}</h2>
        <p className="text-sm text-gray-500">{formatDate(event.data_inizio)}</p>
        <p className="text-sm font-medium text-gray-700 mt-1">
          {attendees.length} partecipanti · {presenti.length} presenti
        </p>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Cerca per nome..."
      />

      <ul className="space-y-2">
        {filtered.map(p => {
          const presente = p.stato_iscrizione === 'presente'
          const nome = `${p.contact?.cognome ?? ''} ${p.contact?.nome ?? ''}`.trim()
          const tipoLabel = TIPO_PARTECIPANTE[p.tipo] ?? p.tipo

          return (
            <li key={p.id}>
              <button
                onClick={() => handleToggle(p)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors text-left min-h-[48px] ${
                  presente
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                aria-label={`Segna ${nome} come ${presente ? 'assente' : 'presente'}`}
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center ${
                    presente
                      ? 'bg-green-500 border-green-500'
                      : 'bg-white border-gray-400'
                  }`}
                  aria-hidden="true"
                >
                  {presente && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${presente ? 'text-green-900' : 'text-gray-900'}`}>
                    {nome}
                  </p>
                  {p.contact?.azienda && (
                    <p className="text-sm text-gray-500 truncate">{p.contact.azienda}</p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  {tipoLabel}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-8">Nessun partecipante trovato</p>
      )}
    </div>
  )
}

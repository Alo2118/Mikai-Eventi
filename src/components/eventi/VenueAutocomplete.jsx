import { useState, useEffect, useRef } from 'react'
import { useVenuesStore } from '../../hooks/useVenues'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { useToastStore } from '../ui/Toast'

export function VenueAutocomplete({ value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newVenue, setNewVenue] = useState({ nome: '', indirizzo: '', cap: '', citta: '', provincia: '' })
  const timeoutRef = useRef(null)

  const searchVenues = useVenuesStore(s => s.searchVenues)
  const createVenue = useVenuesStore(s => s.createVenue)
  const addToast = useToastStore(s => s.add)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (query.length < 2) { setResults([]); setShowDropdown(false); return }

    timeoutRef.current = setTimeout(async () => {
      const { data } = await searchVenues(query)
      setResults(data)
      setShowDropdown(data.length > 0 || query.length >= 2)
    }, 300)

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [query])

  const handleSelect = (venue) => {
    setQuery(venue.nome)
    setShowDropdown(false)
    onSelect(venue)
  }

  const handleCreateNew = async () => {
    if (!newVenue.nome.trim()) return
    const { data, error } = await createVenue(newVenue)
    if (error) { addToast(error, 'error'); return }
    setShowNewForm(false)
    setQuery(data.nome)
    setShowDropdown(false)
    onSelect(data)
    addToast('Sede salvata nella rubrica', 'success')
  }

  return (
    <div className="relative">
      <label className="block text-base font-medium text-gray-700 mb-1">Sede</label>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value) }}
        onFocus={() => { if (results.length > 0) setShowDropdown(true) }}
        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
        placeholder="Cerca sede o digita il nome..."
      />

      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {results.map((v) => (
            <button
              key={v.id}
              onClick={() => handleSelect(v)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 min-h-[48px]"
            >
              <p className="text-base font-medium text-gray-900">{v.nome}</p>
              <p className="text-sm text-gray-500">{[v.citta, v.provincia].filter(Boolean).join(', ')}</p>
            </button>
          ))}
          <button
            onClick={() => { setShowDropdown(false); setShowNewForm(true); setNewVenue({ ...newVenue, nome: query }) }}
            className="w-full text-left px-4 py-3 hover:bg-mikai-50 text-mikai-600 font-medium min-h-[48px]"
          >
            <Icon icon={ACTION_ICONS.add} size={16} className="inline mr-1" />
            Crea nuova sede
          </button>
        </div>
      )}

      {showNewForm && (
        <div className="mt-3 bg-gray-50 rounded-xl p-4 space-y-3">
          <h4 className="text-base font-semibold text-gray-900">Nuova sede</h4>
          <input type="text" value={newVenue.nome} onChange={(e) => setNewVenue({ ...newVenue, nome: e.target.value })}
            placeholder="Nome sede" className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400" />
          <input type="text" value={newVenue.indirizzo} onChange={(e) => setNewVenue({ ...newVenue, indirizzo: e.target.value })}
            placeholder="Indirizzo" className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400" />
          <div className="grid grid-cols-3 gap-3">
            <input type="text" value={newVenue.cap} onChange={(e) => setNewVenue({ ...newVenue, cap: e.target.value })}
              placeholder="CAP" className="px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400" />
            <input type="text" value={newVenue.citta} onChange={(e) => setNewVenue({ ...newVenue, citta: e.target.value })}
              placeholder="Città" className="px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400" />
            <input type="text" value={newVenue.provincia} onChange={(e) => setNewVenue({ ...newVenue, provincia: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="Prov." maxLength={2} className="px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowNewForm(false)}>Annulla</Button>
            <Button onClick={handleCreateNew} disabled={!newVenue.nome.trim()}>Salva sede</Button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useContactsStore } from '../../hooks/useContacts'
import { supabase } from '../../lib/supabase'
import { INPUT_STYLE } from '../../lib/constants'

export function ContactPicker({ value, onChange, placeholder = 'Cerca contatto...' }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [recentContacts, setRecentContacts] = useState([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef(null)
  const searchContacts = useContactsStore(s => s.searchContacts)

  // Fetch 5 most recently created contacts on mount
  useEffect(() => {
    async function loadRecent() {
      const { data } = await supabase
        .from('contacts')
        .select('id, nome, cognome, tipo_contatto, azienda')
        .eq('attivo', true)
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) setRecentContacts(data)
    }
    loadRecent()
  }, [])

  useEffect(() => {
    if (term.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await searchContacts(term)
      setResults(data)
      setOpen(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [term, searchContacts])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (contact) => {
    onChange(contact)
    setTerm(`${contact.cognome} ${contact.nome}`)
    setOpen(false)
    setFocused(false)
  }

  const showRecent = focused && !term && recentContacts.length > 0

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={term}
        onChange={(e) => { setTerm(e.target.value); if (!value) onChange(null) }}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        className={INPUT_STYLE}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full px-4 py-3 text-left hover:bg-mikai-50 min-h-[48px] text-base"
              >
                <span className="font-medium">{c.cognome} {c.nome}</span>
                {c.azienda && <span className="text-gray-500 ml-2">— {c.azienda}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {showRecent && (
        <div className="absolute z-50 w-full border border-gray-200 rounded-xl mt-1 bg-white shadow-lg overflow-hidden">
          <p className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">Ultimi contatti</p>
          {recentContacts.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 min-h-[48px] flex items-center gap-2"
            >
              <span className="font-medium">{c.cognome} {c.nome}</span>
              {c.azienda && <span className="text-sm text-gray-400">— {c.azienda}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useToastStore } from '../ui/Toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { AttestatoPersonRow } from './AttestatoPersonRow'
import { INPUT_STYLE, SUMMARY_BAR_STYLE, ATTESTATO_SEDE } from '../../lib/constants'
import { FEEDBACK_ICONS, LOGISTICA_PERSONE_ICONS } from '../../lib/icons'
import { formatDateRangeLong } from '../../lib/date-utils'
import { guessTitoloFromNome } from '../../lib/titolo-utils'

const SUPPORTS_FOLDER = typeof window !== 'undefined' && 'showDirectoryPicker' in window

export function AttestatiModal({ event, onClose }) {
  const participants = useParticipantsStore(s => s.participants)
  const updateContactsTitolo = useParticipantsStore(s => s.updateContactsTitolo)
  const addToast = useToastStore(s => s.add)

  const discenti = useMemo(() => participants
    .filter(p => p.tipo === 'discente' && p.contact)
    .sort((a, b) => `${a.contact.cognome} ${a.contact.nome}`.localeCompare(`${b.contact.cognome} ${b.contact.nome}`, 'it')),
  [participants])

  const [selected, setSelected] = useState(() => new Set(discenti.filter(p => p.stato_iscrizione === 'presente').map(p => p.id)))
  // Chi non ha il titolo in rubrica lo riceve dedotto dal nome; resta modificabile e viene salvato alla creazione
  const [titoli, setTitoli] = useState(() => Object.fromEntries(discenti.map(p => [p.id, p.contact.titolo || guessTitoloFromNome(p.contact.nome)])))
  const [guessed, setGuessed] = useState(() => new Set(discenti.filter(p => !p.contact.titolo && guessTitoloFromNome(p.contact.nome)).map(p => p.id)))
  const [corso, setCorso] = useState(event.titolo || '')
  const [generating, setGenerating] = useState(false)

  const chosen = discenti.filter(p => selected.has(p.id))
  const senzaTitolo = chosen.filter(p => !titoli[p.id]).length
  const dedotti = chosen.filter(p => guessed.has(p.id)).length
  const disabledReason = chosen.length === 0 ? 'Seleziona almeno una persona'
    : !corso.trim() ? 'Scrivi il titolo del corso' : null

  const handleToggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleTitoloChange = (id, value) => {
    setTitoli(t => ({ ...t, [id]: value }))
    setGuessed(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleSelectAll = () => setSelected(chosen.length === discenti.length ? new Set() : new Set(discenti.map(p => p.id)))

  const saveTitoli = async () => {
    const changes = Object.fromEntries(chosen
      .filter(p => (p.contact.titolo || '') !== titoli[p.id])
      .map(p => [p.contact_id, titoli[p.id] || null]))
    if (Object.keys(changes).length === 0) return
    const { error, updated, requested } = await updateContactsTitolo(changes)
    if (error || updated < requested) {
      addToast('Non siamo riusciti a salvare il titolo in rubrica per alcune persone. Gli attestati sono comunque corretti.', 'warning')
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await saveTitoli()
      const { generateAttestati } = await import('../../lib/generate-attestati')
      const people = chosen.map(p => ({ nome: p.contact.nome, cognome: p.contact.cognome, titolo: titoli[p.id] }))
      const result = await generateAttestati({ event, people, corso: corso.trim() })
      if (result.cancelled) return
      addToast(result.method === 'folder'
        ? `${result.count} attestati salvati nella cartella "${result.folderName}"`
        : `${result.count} attestati scaricati nel file "${result.folderName}.zip"`, 'success')
      onClose()
    } catch {
      addToast('Non siamo riusciti a creare gli attestati. Riprova.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const footer = (
    <div className="flex flex-col gap-2">
      {disabledReason && discenti.length > 0 && <p className="text-sm text-gray-500">{disabledReason}</p>}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>Annulla</Button>
        <Button onClick={handleGenerate} loading={generating} disabled={!!disabledReason}>
          <Icon icon={LOGISTICA_PERSONE_ICONS.attestato} size={18} />
          <span className="ml-1">Crea {chosen.length} {chosen.length === 1 ? 'attestato' : 'attestati'}</span>
        </Button>
      </div>
    </div>
  )

  return (
    <Modal open onClose={onClose} size="xl" title="Attestati di partecipazione" subtitle={formatDateRangeLong(event.data_inizio, event.data_fine)} footer={footer}>
      {discenti.length === 0 ? (
        <EmptyState icon={LOGISTICA_PERSONE_ICONS.attestato} title="Nessun discente" description="Aggiungi i discenti nella sezione Persone per poter creare gli attestati." />
      ) : (
        <div className="space-y-6">
          <div>
            <label htmlFor="attestato-corso" className="block text-sm font-medium text-gray-700 mb-1">Titolo del corso sull'attestato</label>
            <input id="attestato-corso" className={INPUT_STYLE} value={corso} onChange={e => setCorso(e.target.value)} />
            <p className="text-sm text-gray-500 mt-1">Sede: {ATTESTATO_SEDE.join(' — ')}</p>
          </div>

          <div className={SUMMARY_BAR_STYLE + ' flex items-center justify-between gap-3'}>
            <span className="text-base">{chosen.length} di {discenti.length} discenti selezionati</span>
            <Button variant="secondary" size="sm" onClick={handleSelectAll}>
              {chosen.length === discenti.length ? 'Togli tutti' : 'Seleziona tutti'}
            </Button>
          </div>

          {dedotti > 0 && (
            <div className="flex items-start gap-2 bg-mikai-50 border border-mikai-200 rounded-lg px-4 py-3" role="status">
              <Icon icon={FEEDBACK_ICONS.info} size={18} className="text-mikai-600 mt-0.5 shrink-0" />
              <p className="text-sm text-mikai-800">
                {dedotti === 1 ? 'Per 1 persona abbiamo scelto' : `Per ${dedotti} persone abbiamo scelto`} Dott. o Dott.ssa in base al nome. Controlla prima di creare gli attestati: verrà salvato in rubrica.
              </p>
            </div>
          )}

          {senzaTitolo > 0 && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3" role="status">
              <Icon icon={FEEDBACK_ICONS.warning} size={18} className="text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-800">
                {senzaTitolo === 1 ? '1 persona non ha' : `${senzaTitolo} persone non hanno`} il titolo: sull'attestato comparirà "Il Dott./La Dott.ssa". Puoi sceglierlo qui sotto, verrà salvato in rubrica.
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {discenti.map(p => (
              <AttestatoPersonRow
                key={p.id}
                participant={p}
                selected={selected.has(p.id)}
                titolo={titoli[p.id]}
                guessed={guessed.has(p.id)}
                onToggle={() => handleToggle(p.id)}
                onTitoloChange={value => handleTitoloChange(p.id, value)}
              />
            ))}
          </ul>

          <p className="text-sm text-gray-500">
            {SUPPORTS_FOLDER
              ? 'Ti chiederemo dove salvare: creeremo lì una cartella con un PDF per ogni persona.'
              : 'Riceverai un file ZIP con dentro una cartella e un PDF per ogni persona.'}
          </p>
        </div>
      )}
    </Modal>
  )
}

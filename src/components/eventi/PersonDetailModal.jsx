import { useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { INPUT_STYLE, TEXTAREA_STYLE } from '../../lib/constants'

export function PersonDetailModal({ person, onSaveNote, onSaveEsigenze, onClose }) {
  const [note, setNote] = useState(person.note || '')
  const [alimentari, setAlimentari] = useState(person.esigenze_alimentari || '')
  const [accessibilita, setAccessibilita] = useState(person.esigenze_accessibilita || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    const newNote = note.trim() || null
    const newAlim = alimentari.trim() || null
    const newAcc = accessibilita.trim() || null

    if (newNote !== (person.note || null)) {
      await onSaveNote(person, newNote)
    }
    if (newAlim !== (person.esigenze_alimentari || null) || newAcc !== (person.esigenze_accessibilita || null)) {
      await onSaveEsigenze(person, { esigenze_alimentari: newAlim, esigenze_accessibilita: newAcc })
    }
    setLoading(false)
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} size="md" title="Dettagli persona" subtitle={`${person.cognome} ${person.nome}`}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea className={TEXTAREA_STYLE} value={note} onChange={e => setNote(e.target.value)} placeholder="Note sulla persona per questo evento..." rows={3} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Esigenze alimentari</label>
          <input className={INPUT_STYLE} value={alimentari} onChange={e => setAlimentari(e.target.value)} placeholder="Es: vegetariano, celiaco..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Esigenze accessibilità</label>
          <input className={INPUT_STYLE} value={accessibilita} onChange={e => setAccessibilita(e.target.value)} placeholder="Es: sedia a rotelle, piano basso..." />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} loading={loading}>Salva</Button>
        </div>
      </div>
    </Modal>
  )
}

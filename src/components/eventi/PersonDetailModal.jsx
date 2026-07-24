import { useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { INPUT_STYLE, TEXTAREA_STYLE, SELECT_STYLE, RUOLO_EVENTO, TIPO_PARTECIPANTE } from '../../lib/constants'

export function PersonDetailModal({ person, onSaveNote, onSaveEsigenze, onSaveRole, onClose }) {
  const [note, setNote] = useState(person.note || '')
  const [ruolo, setRuolo] = useState(person.ruolo || '')
  const [alimentari, setAlimentari] = useState(person.esigenze_alimentari || '')
  const [accessibilita, setAccessibilita] = useState(person.esigenze_accessibilita || '')
  const [costoPasti, setCostoPasti] = useState(person.costo_pasti != null ? String(person.costo_pasti) : '')
  const [loading, setLoading] = useState(false)

  const ruoloOptions = person.type === 'staff' ? RUOLO_EVENTO : TIPO_PARTECIPANTE
  const mostraCostoPasti = person.type === 'participant'

  const handleSave = async () => {
    setLoading(true)
    const newNote = note.trim() || null
    const newAlim = alimentari.trim() || null
    const newAcc = accessibilita.trim() || null
    const parsedCosto = costoPasti.trim() === '' ? null : Number(costoPasti.replace(',', '.'))
    const newCosto = parsedCosto != null && Number.isFinite(parsedCosto) ? parsedCosto : null

    if (ruolo !== (person.ruolo || '') && onSaveRole) {
      await onSaveRole(person, ruolo)
    }
    if (newNote !== (person.note || null)) {
      await onSaveNote(person, newNote)
    }
    const esigenzeChanged = newAlim !== (person.esigenze_alimentari || null) || newAcc !== (person.esigenze_accessibilita || null)
    const costoChanged = mostraCostoPasti && newCosto !== (person.costo_pasti ?? null)
    if (esigenzeChanged || costoChanged) {
      const updates = { esigenze_alimentari: newAlim, esigenze_accessibilita: newAcc }
      if (mostraCostoPasti) updates.costo_pasti = newCosto
      await onSaveEsigenze(person, updates)
    }
    setLoading(false)
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} size="md" title="Dettagli persona" subtitle={`${person.cognome} ${person.nome}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
          <select className={SELECT_STYLE} value={ruolo} onChange={e => setRuolo(e.target.value)}>
            {Object.entries(ruoloOptions).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
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
          <p className="mt-1 text-sm text-gray-500">Le esigenze valgono solo per questo evento e non modificano il profilo della persona.</p>
        </div>
        {mostraCostoPasti && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Costo pasti (€)</label>
            <input
              className={INPUT_STYLE}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={costoPasti}
              onChange={e => setCostoPasti(e.target.value)}
              placeholder="Es: 45.00"
            />
            <p className="mt-1 text-sm text-gray-500">Costo del vitto offerto a questa persona per l'evento. Serve per il calcolo dei valori trasferiti (ToV).</p>
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} loading={loading}>Salva</Button>
        </div>
      </div>
    </Modal>
  )
}

import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { INPUT_STYLE, SELECT_STYLE } from '../../lib/constants'
import { PROGRAM_EMPTY_FORM } from '../../lib/admin-template-utils'

export function AdminTemplateProgramEditor({ open, editing, saTypes, programItemsCount, saving, onSave, onClose }) {
  const [form, setForm] = useState(PROGRAM_EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    setForm(editing?.id ? {
      tipo_sotto_attivita_id: editing.tipo_sotto_attivita_id || '',
      descrizione: editing.descrizione || '',
      giorno: editing.giorno ?? 1,
      orario: editing.orario || '',
      durata_minuti: editing.durata_minuti ?? '',
      luogo: editing.luogo || '',
      fornitore: editing.fornitore || '',
      note: editing.note || '',
    } : { ...PROGRAM_EMPTY_FORM })
  }, [open, editing])

  const handleSubmit = () => {
    if (!form.tipo_sotto_attivita_id) return
    const typeName = saTypes.find(t => t.id === form.tipo_sotto_attivita_id)?.nome || ''
    onSave({
      tipo_sotto_attivita_id: form.tipo_sotto_attivita_id,
      descrizione: form.descrizione.trim() || typeName,
      giorno: form.giorno ? parseInt(form.giorno) : 1,
      orario: form.orario || null,
      durata_minuti: form.durata_minuti !== '' ? parseInt(form.durata_minuti) : null,
      luogo: form.luogo.trim() || null,
      fornitore: form.fornitore.trim() || null,
      note: form.note.trim() || null,
      ordine: editing?.id ? editing.ordine : programItemsCount,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing?.id ? 'Modifica voce programma' : 'Nuova voce programma'}
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!form.tipo_sotto_attivita_id}>
            {editing?.id ? 'Salva' : 'Crea'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Tipo sotto-attività" required>
          <select className={SELECT_STYLE} value={form.tipo_sotto_attivita_id} onChange={e => setForm(f => ({ ...f, tipo_sotto_attivita_id: e.target.value }))}>
            <option value="">Seleziona...</option>
            {saTypes.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </FormField>

        <FormField label="Descrizione" hint="Opzionale — se vuoto usa il nome del tipo">
          <input
            className={INPUT_STYLE}
            value={form.descrizione}
            onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
            placeholder="es. Sessione pratica su femore"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Giorno" hint="1 = primo giorno evento">
            <input
              type="number"
              min="1"
              className={INPUT_STYLE}
              value={form.giorno}
              onChange={e => setForm(f => ({ ...f, giorno: e.target.value }))}
            />
          </FormField>
          <FormField label="Orario">
            <input
              type="time"
              className={INPUT_STYLE}
              value={form.orario}
              onChange={e => setForm(f => ({ ...f, orario: e.target.value }))}
            />
          </FormField>
          <FormField label="Durata (minuti)">
            <input
              type="number"
              min="1"
              className={INPUT_STYLE}
              value={form.durata_minuti}
              onChange={e => setForm(f => ({ ...f, durata_minuti: e.target.value }))}
              placeholder="es. 60"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Luogo">
            <input
              className={INPUT_STYLE}
              value={form.luogo}
              onChange={e => setForm(f => ({ ...f, luogo: e.target.value }))}
              placeholder="es. Sala operatoria"
            />
          </FormField>
          <FormField label="Fornitore">
            <input
              className={INPUT_STYLE}
              value={form.fornitore}
              onChange={e => setForm(f => ({ ...f, fornitore: e.target.value }))}
              placeholder="es. Catering XYZ"
            />
          </FormField>
        </div>

        <FormField label="Note">
          <textarea
            className={INPUT_STYLE + ' min-h-[80px]'}
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          />
        </FormField>
      </div>
    </Modal>
  )
}

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { CATEGORIA_ATTIVITA, INPUT_STYLE, SELECT_STYLE, TEXTAREA_STYLE } from '../../lib/constants'

export function ActivityEditModal({ open, activity, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    descrizione: '',
    deadline: '',
    categoria: '',
    obbligatoria: false,
    tipo_verifica: 'manuale',
    note: '',
  })

  useEffect(() => {
    if (activity && open) {
      setForm({
        descrizione: activity.descrizione || '',
        deadline: activity.deadline ? activity.deadline.slice(0, 10) : '',
        categoria: activity.categoria || '',
        obbligatoria: !!activity.obbligatoria,
        tipo_verifica: activity.tipo_verifica || 'manuale',
        note: activity.note || '',
      })
    }
  }, [activity, open])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.descrizione.trim()) return
    const updates = {
      descrizione: form.descrizione.trim(),
      deadline: form.deadline || null,
      categoria: form.categoria || null,
      obbligatoria: form.obbligatoria,
      tipo_verifica: form.tipo_verifica,
      note: form.note.trim() || null,
    }
    onSave(activity.id, updates)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modifica attività"
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Annulla</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!form.descrizione.trim()}>Salva modifiche</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrizione <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.descrizione}
            onChange={e => handleChange('descrizione', e.target.value)}
            className={INPUT_STYLE}
            placeholder="Descrivi l'attività..."
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => handleChange('deadline', e.target.value)}
              className={INPUT_STYLE}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={form.categoria}
              onChange={e => handleChange('categoria', e.target.value)}
              className={SELECT_STYLE}
            >
              <option value="">Nessuna</option>
              {Object.entries(CATEGORIA_ATTIVITA).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer min-h-[48px]">
            <input
              type="checkbox"
              checked={form.obbligatoria}
              onChange={e => handleChange('obbligatoria', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400"
            />
            <span className="text-sm text-gray-700">Attività obbligatoria</span>
          </label>
          {activity?.tipo_verifica !== 'automatica' && (
            <label className="flex items-center gap-2 cursor-pointer min-h-[48px]">
              <input
                type="checkbox"
                checked={form.tipo_verifica === 'documento'}
                onChange={e => handleChange('tipo_verifica', e.target.checked ? 'documento' : 'manuale')}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700">Richiede documento allegato</span>
            </label>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea
            value={form.note}
            onChange={e => handleChange('note', e.target.value)}
            className={TEXTAREA_STYLE}
            rows={3}
            placeholder="Note aggiuntive..."
          />
        </div>
      </form>
    </Modal>
  )
}

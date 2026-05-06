import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { useToastStore } from '../ui/Toast'
import { CATEGORIA_ATTIVITA, VERIFICATION_FUNCTIONS, INPUT_STYLE, SELECT_STYLE } from '../../lib/constants'
import { PERMISSION_OPTIONS, CHECKLIST_EMPTY_FORM, wouldCreateCycle } from '../../lib/admin-template-utils'

export function AdminTemplateChecklistEditor({ open, editing, items, saving, onSave, onClose }) {
  const addToast = useToastStore(s => s.add)
  const [form, setForm] = useState(CHECKLIST_EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    setForm(editing?.id ? {
      descrizione: editing.descrizione || '',
      categoria: editing.categoria || 'organizzazione',
      permesso_responsabile: editing.permesso_responsabile || '',
      giorni_prima_evento: editing.giorni_prima_evento ?? -7,
      obbligatorio: editing.obbligatorio ?? true,
      post_evento: editing.post_evento ?? false,
      tipo_verifica: editing.tipo_verifica || 'manuale',
      verifica_automatica: editing.verifica_automatica || '',
      dipende_da: editing.dipende_da || '',
    } : { ...CHECKLIST_EMPTY_FORM })
  }, [open, editing])

  const handleSubmit = () => {
    if (!form.descrizione.trim()) return
    onSave({
      ...form,
      descrizione: form.descrizione.trim(),
      dipende_da: form.dipende_da || null,
      permesso_responsabile: form.permesso_responsabile || null,
      verifica_automatica: form.tipo_verifica === 'automatica' ? form.verifica_automatica : null,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing?.id ? 'Modifica attività template' : 'Nuova attività template'}
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!form.descrizione.trim()}>
            {editing?.id ? 'Salva' : 'Crea'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Descrizione" required>
          <input
            className={INPUT_STYLE}
            value={form.descrizione}
            onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
            placeholder="es. Preparare locandina evento"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Categoria">
            <select className={SELECT_STYLE} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
              {Object.entries(CATEGORIA_ATTIVITA).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Permesso responsabile">
            <select className={SELECT_STYLE} value={form.permesso_responsabile} onChange={e => setForm(f => ({ ...f, permesso_responsabile: e.target.value }))}>
              <option value="">Nessuno (chiunque)</option>
              {Object.entries(PERMISSION_OPTIONS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Giorni rispetto all'evento" hint="Negativo = prima, positivo = dopo">
            <input
              type="number"
              className={INPUT_STYLE}
              value={form.giorni_prima_evento}
              onChange={e => setForm(f => ({ ...f, giorni_prima_evento: parseInt(e.target.value) || 0 }))}
            />
          </FormField>

          <FormField label="Obbligatoria">
            <select className={SELECT_STYLE} value={form.obbligatorio ? 'si' : 'no'} onChange={e => setForm(f => ({ ...f, obbligatorio: e.target.value === 'si' }))}>
              <option value="si">Sì</option>
              <option value="no">No</option>
            </select>
          </FormField>

          <FormField label="Post-evento" hint="Non blocca l'avanzamento a pronto">
            <select className={SELECT_STYLE} value={form.post_evento ? 'si' : 'no'} onChange={e => setForm(f => ({ ...f, post_evento: e.target.value === 'si' }))}>
              <option value="no">No</option>
              <option value="si">Sì</option>
            </select>
          </FormField>
        </div>

        <FormField label="Tipo verifica">
          <div className="flex gap-2">
            {[
              { value: 'manuale', label: 'Manuale', desc: 'Un responsabile segna il completamento' },
              { value: 'automatica', label: 'Automatica', desc: 'Il sistema verifica in base ai dati' },
              { value: 'documento', label: 'Documento', desc: 'Richiede un documento approvato' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, tipo_verifica: opt.value }))}
                className={`flex-1 px-4 py-3 rounded-lg border-2 text-left min-h-[48px] transition-all ${
                  form.tipo_verifica === opt.value
                    ? 'border-mikai-400 bg-mikai-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-base">{opt.label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </FormField>

        {form.tipo_verifica === 'automatica' && (
          <FormField label="Funzione di verifica">
            <select className={SELECT_STYLE} value={form.verifica_automatica} onChange={e => setForm(f => ({ ...f, verifica_automatica: e.target.value }))}>
              <option value="">Seleziona...</option>
              {Object.entries(VERIFICATION_FUNCTIONS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            {form.verifica_automatica && VERIFICATION_FUNCTIONS[form.verifica_automatica] && (
              <p className="text-sm text-gray-500 mt-1">
                {VERIFICATION_FUNCTIONS[form.verifica_automatica].desc}
              </p>
            )}
          </FormField>
        )}

        <FormField label="Dipende da" hint="L'attività non può iniziare finché la dipendenza non è completata">
          <select
            className={SELECT_STYLE}
            value={form.dipende_da}
            onChange={e => {
              const targetId = e.target.value
              if (targetId && wouldCreateCycle(editing?.id, targetId, items)) {
                addToast('Dipendenza circolare non consentita', 'warning')
                return
              }
              setForm(f => ({ ...f, dipende_da: targetId }))
            }}
          >
            <option value="">Nessuna dipendenza</option>
            {items
              .filter(i => i.id !== editing?.id)
              .map(i => {
                const isCyclic = wouldCreateCycle(editing?.id, i.id, items)
                return (
                  <option key={i.id} value={i.id} disabled={isCyclic}>
                    {i.descrizione} ({i.giorni_prima_evento}gg){isCyclic ? ' [circolare]' : ''}
                  </option>
                )
              })}
          </select>
        </FormField>
      </div>
    </Modal>
  )
}

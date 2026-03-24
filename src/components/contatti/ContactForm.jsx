import { useState } from 'react'
import { Button } from '../ui/Button'
import { TIPO_CONTATTO, INPUT_STYLE } from '../../lib/constants'

export function ContactForm({ contact, users = [], zones = [], onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    nome: contact?.nome || '',
    cognome: contact?.cognome || '',
    tipo_contatto: contact?.tipo_contatto || 'medico',
    email: contact?.email || '',
    telefono: contact?.telefono || '',
    azienda: contact?.azienda || '',
    ruolo_medico: contact?.ruolo_medico || '',
    specializzazione: contact?.specializzazione || '',
    tipo_servizio: contact?.tipo_servizio || '',
    proprietario_id: contact?.proprietario_id || '',
    zone_id: contact?.zone_id || '',
    note: contact?.note || '',
  })

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const isMedico = form.tipo_contatto === 'medico'
  const isFornitore = form.tipo_contatto === 'fornitore'

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input className={INPUT_STYLE} value={form.nome} onChange={e => set('nome', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cognome <span className="text-red-500">*</span>
          </label>
          <input className={INPUT_STYLE} value={form.cognome} onChange={e => set('cognome', e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo contatto</label>
          <select className={INPUT_STYLE} value={form.tipo_contatto} onChange={e => set('tipo_contatto', e.target.value)}>
            {Object.entries(TIPO_CONTATTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
          <select className={INPUT_STYLE} value={form.zone_id} onChange={e => set('zone_id', e.target.value)}>
            <option value="">— Nessuna —</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" className={INPUT_STYLE} value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
          <input type="tel" className={INPUT_STYLE} value={form.telefono} onChange={e => set('telefono', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isMedico ? 'Struttura / Ente' : 'Azienda'}
        </label>
        <input className={INPUT_STYLE} value={form.azienda} onChange={e => set('azienda', e.target.value)} />
      </div>

      {isMedico && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo medico</label>
            <input className={INPUT_STYLE} value={form.ruolo_medico} onChange={e => set('ruolo_medico', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specializzazione</label>
            <input className={INPUT_STYLE} value={form.specializzazione} onChange={e => set('specializzazione', e.target.value)} />
          </div>
        </div>
      )}

      {isFornitore && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo servizio</label>
          <input className={INPUT_STYLE} value={form.tipo_servizio} onChange={e => set('tipo_servizio', e.target.value)} placeholder="es. catering, hotel, agenzia..." />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Proprietario</label>
        <select className={INPUT_STYLE} value={form.proprietario_id} onChange={e => set('proprietario_id', e.target.value)}>
          <option value="">— Nessuno —</option>
          {users.filter(u => u.ruolo === 'commerciale' || u.ruolo === 'area_manager').map(u => (
            <option key={u.id} value={u.id}>{u.cognome} {u.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
        <textarea className={INPUT_STYLE + ' min-h-[80px]'} value={form.note} onChange={e => set('note', e.target.value)} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={saving}>{contact ? 'Salva modifiche' : 'Crea contatto'}</Button>
        <Button variant="secondary" type="button" onClick={onCancel}>Annulla</Button>
      </div>
    </form>
  )
}

import { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { TIPO_CONTATTO, INPUT_STYLE, SELECT_STYLE } from '../../lib/constants'
import { FEEDBACK_ICONS } from '../../lib/icons'
import { useContactsStore } from '../../hooks/useContacts'

const CLINICAL_TYPES = ['medico', 'specializzando', 'infermiere']

export function ContactForm({ contact, users = [], zones = [], onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    nome: contact?.nome || '',
    cognome: contact?.cognome || '',
    tipo_contatto: contact?.tipo_contatto || 'medico',
    email: contact?.email || '',
    telefono: contact?.telefono || '',
    azienda: contact?.azienda || '',
    citta: contact?.citta || '',
    ruolo_medico: contact?.ruolo_medico || '',
    specializzazione: contact?.specializzazione || '',
    tipo_servizio: contact?.tipo_servizio || '',
    proprietario_id: contact?.proprietario_id || '',
    zone_id: contact?.zone_id || '',
    note: contact?.note || '',
    esigenze_alimentari: contact?.esigenze_alimentari || '',
    esigenze_accessibilita: contact?.esigenze_accessibilita || '',
  })
  const [duplicates, setDuplicates] = useState([])
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(!!contact)
  const searchContacts = useContactsStore(s => s.searchContacts)

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const isClinical = CLINICAL_TYPES.includes(form.tipo_contatto)
  const isFornitore = form.tipo_contatto === 'fornitore'

  // Duplicate check with debounce
  useEffect(() => {
    if (skipDuplicateCheck) return
    const nome = form.nome.trim()
    const cognome = form.cognome.trim()
    if (nome.length < 2 || cognome.length < 2) { setDuplicates([]); return }

    const timer = setTimeout(async () => {
      const { data } = await searchContacts(cognome)
      const matches = (data || []).filter(c =>
        c.cognome.toLowerCase() === cognome.toLowerCase() &&
        c.nome.toLowerCase() === nome.toLowerCase() &&
        c.id !== contact?.id
      )
      setDuplicates(matches)
    }, 500)
    return () => clearTimeout(timer)
  }, [form.nome, form.cognome])

  const capitalize = (s) => s ? s.trim().replace(/\b\w/g, c => c.toUpperCase()) : ''

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...form,
      nome: capitalize(form.nome),
      cognome: capitalize(form.cognome),
      azienda: form.azienda?.trim() || null,
      citta: capitalize(form.citta || '') || null,
      email: form.email?.trim().toLowerCase() || null,
      telefono: form.telefono?.trim() || null,
      ruolo_medico: isClinical ? form.ruolo_medico?.trim() || null : null,
      specializzazione: isClinical ? form.specializzazione?.trim() || null : null,
      tipo_servizio: isFornitore ? form.tipo_servizio?.trim() || null : null,
      proprietario_id: form.proprietario_id || null,
      zone_id: form.zone_id || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Anagrafica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cognome <span className="text-red-500">*</span>
          </label>
          <input className={INPUT_STYLE} value={form.cognome} onChange={e => set('cognome', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input className={INPUT_STYLE} value={form.nome} onChange={e => set('nome', e.target.value)} required />
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3" role="alert">
          <Icon icon={FEEDBACK_ICONS.warning} size={18} className="text-yellow-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              Contatto già presente nella rubrica
            </p>
            {duplicates.map(d => (
              <p key={d.id} className="text-sm text-yellow-700 mt-0.5">
                {d.cognome} {d.nome}{d.azienda ? ` — ${d.azienda}` : ''} ({TIPO_CONTATTO[d.tipo_contatto] || d.tipo_contatto})
              </p>
            ))}
            <p className="text-xs text-yellow-600 mt-1">Puoi comunque salvare se si tratta di un omonimo.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo contatto</label>
          <select className={SELECT_STYLE} value={form.tipo_contatto} onChange={e => set('tipo_contatto', e.target.value)}>
            {Object.entries(TIPO_CONTATTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isClinical ? 'Struttura / Ente' : 'Azienda'}
          </label>
          <input className={INPUT_STYLE} value={form.azienda} onChange={e => set('azienda', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
          <input className={INPUT_STYLE} value={form.citta} onChange={e => set('citta', e.target.value)} />
        </div>
      </div>

      {/* Recapiti */}
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

      {/* Campi clinici (medico, specializzando, infermiere) */}
      {isClinical && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
            <input className={INPUT_STYLE} value={form.ruolo_medico} onChange={e => set('ruolo_medico', e.target.value)} placeholder="es. Primario, Dirigente medico..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specializzazione</label>
            <input className={INPUT_STYLE} value={form.specializzazione} onChange={e => set('specializzazione', e.target.value)} placeholder="es. Ortopedia, Traumatologia..." />
          </div>
        </div>
      )}

      {/* Campi fornitore */}
      {isFornitore && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo servizio</label>
          <input className={INPUT_STYLE} value={form.tipo_servizio} onChange={e => set('tipo_servizio', e.target.value)} placeholder="es. Catering, Hotel, Agenzia viaggi..." />
        </div>
      )}

      {/* Assegnazione */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
          <select className={SELECT_STYLE} value={form.zone_id} onChange={e => set('zone_id', e.target.value)}>
            <option value="">— Nessuna —</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.nome}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
        <textarea className={INPUT_STYLE + ' min-h-[80px]'} value={form.note} onChange={e => set('note', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Esigenze alimentari</label>
          <input className={INPUT_STYLE} value={form.esigenze_alimentari} onChange={e => set('esigenze_alimentari', e.target.value)} placeholder="Es: vegetariano, celiaco..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Esigenze accessibilità</label>
          <input className={INPUT_STYLE} value={form.esigenze_accessibilita} onChange={e => set('esigenze_accessibilita', e.target.value)} placeholder="Es: sedia a rotelle, piano basso..." />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={saving}>{contact ? 'Salva modifiche' : 'Crea contatto'}</Button>
        <Button variant="secondary" type="button" onClick={onCancel}>Annulla</Button>
      </div>
    </form>
  )
}

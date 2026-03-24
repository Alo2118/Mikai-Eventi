import { useState } from 'react'
import { DatePicker } from '../ui/DatePicker'
import { FormField } from '../ui/FormField'
import { VenueAutocomplete } from './VenueAutocomplete'
import { INPUT_STYLE } from '../../lib/constants'

export function WizardStepDove({ data, onChange }) {
  const [touched, setTouched] = useState({})
  const update = (field, value) => onChange({ ...data, [field]: value })
  const touch = (field) => setTouched(t => ({ ...t, [field]: true }))

  const errors = {
    titolo: touched.titolo && !data.titolo?.trim() ? 'Il titolo è obbligatorio' : null,
    data_inizio: touched.data_inizio && !data.data_inizio ? 'La data di inizio è obbligatoria' : null,
    luogo: touched.luogo && !data.luogo?.trim() ? 'Il luogo è obbligatorio' : null,
  }

  const handleVenueSelect = (venue) => {
    onChange({
      ...data,
      luogo: venue.nome,
      venue_id: venue.id,
      sede_dettaglio: [venue.indirizzo, venue.cap, venue.citta, venue.provincia].filter(Boolean).join(', '),
    })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Dove e quando?</h2>
      <p className="text-base text-gray-500 mb-6">Inserisci i dettagli dell'evento.</p>

      <div className="space-y-5">
        <FormField label="Titolo" required error={errors.titolo}>
          <input
            type="text"
            value={data.titolo || ''}
            onChange={(e) => update('titolo', e.target.value)}
            onBlur={() => touch('titolo')}
            placeholder="Es: Workshop Fissatore Poloso"
            className={INPUT_STYLE}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Data inizio"
            value={data.data_inizio}
            onChange={(v) => { update('data_inizio', v); touch('data_inizio') }}
            required
            error={errors.data_inizio}
          />
          <DatePicker
            label="Data fine"
            value={data.data_fine}
            onChange={(v) => update('data_fine', v)}
            min={data.data_inizio}
          />
        </div>

        <VenueAutocomplete
          value={data.luogo || ''}
          onChange={(val) => update('luogo', val)}
          onSelect={handleVenueSelect}
          onBlur={() => touch('luogo')}
          error={errors.luogo}
        />

        <FormField label="Dettaglio sede" hint="Facoltativo">
          <input
            type="text"
            value={data.sede_dettaglio || ''}
            onChange={(e) => update('sede_dettaglio', e.target.value)}
            placeholder="Es: Sala conferenze, Piano 2"
            className={INPUT_STYLE}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Data spedizione prevista"
            value={data.data_spedizione_prevista}
            onChange={(v) => update('data_spedizione_prevista', v)}
            max={data.data_inizio}
          />
          <FormField label="Note consegna" hint="Facoltativo">
            <input
              type="text"
              value={data.note_consegna || ''}
              onChange={(e) => update('note_consegna', e.target.value)}
              placeholder="Es: Consegnare al portiere"
              className={INPUT_STYLE}
            />
          </FormField>
        </div>
      </div>
    </div>
  )
}

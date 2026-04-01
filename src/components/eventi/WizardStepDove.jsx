import { useState } from 'react'
import { DatePicker } from '../ui/DatePicker'
import { FormField } from '../ui/FormField'
import { VenueAutocomplete } from './VenueAutocomplete'
import { INPUT_STYLE } from '../../lib/constants'

export function WizardStepDove({ data, onChange, showErrors }) {
  const [touched, setTouched] = useState({})
  const update = (field, value) => onChange({ ...data, [field]: value })
  const touch = (field) => setTouched(t => ({ ...t, [field]: true }))

  // A field shows its error if it has been individually touched OR if the user tried to advance
  const isTouched = (field) => touched[field] || showErrors

  const dateFineError = (() => {
    if (!isTouched('data_fine') || !data.data_fine || !data.data_inizio) return null
    return data.data_fine < data.data_inizio
      ? 'La data di fine deve essere successiva alla data di inizio'
      : null
  })()

  const errors = {
    titolo: isTouched('titolo') && !data.titolo?.trim() ? 'Il titolo è obbligatorio' : null,
    data_inizio: isTouched('data_inizio') && !data.data_inizio ? 'La data di inizio è obbligatoria' : null,
    data_fine: dateFineError,
    luogo: isTouched('luogo') && !data.luogo?.trim() ? 'Il luogo è obbligatorio' : null,
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
            onChange={(v) => { update('data_fine', v); touch('data_fine') }}
            onBlur={() => touch('data_fine')}
            min={data.data_inizio}
            hint="Facoltativo"
            error={errors.data_fine}
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

      </div>
    </div>
  )
}

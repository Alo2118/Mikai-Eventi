import { DatePicker } from '../ui/DatePicker'
import { VenueAutocomplete } from './VenueAutocomplete'

export function WizardStepDove({ data, onChange }) {
  const update = (field, value) => onChange({ ...data, [field]: value })

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
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">
            Titolo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.titolo || ''}
            onChange={(e) => update('titolo', e.target.value)}
            placeholder="Es: Workshop Fissatore Poloso"
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 min-h-[48px]"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Data inizio"
            value={data.data_inizio}
            onChange={(v) => update('data_inizio', v)}
            required
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
        />

        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">
            Dettaglio sede <span className="text-gray-400">(facoltativo)</span>
          </label>
          <input
            type="text"
            value={data.sede_dettaglio || ''}
            onChange={(e) => update('sede_dettaglio', e.target.value)}
            placeholder="Es: Sala conferenze, Piano 2"
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 min-h-[48px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Data spedizione prevista"
            value={data.data_spedizione_prevista}
            onChange={(v) => update('data_spedizione_prevista', v)}
            max={data.data_inizio}
          />
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">
              Note consegna <span className="text-gray-400">(facoltativo)</span>
            </label>
            <input
              type="text"
              value={data.note_consegna || ''}
              onChange={(e) => update('note_consegna', e.target.value)}
              placeholder="Es: Consegnare al portiere"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 min-h-[48px]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

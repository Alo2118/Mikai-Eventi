import { Button } from '../ui/Button'
import { CATEGORIA_ATTIVITA, FORM_CONTAINER_STYLE, INPUT_STYLE, SELECT_STYLE } from '../../lib/constants'

export function PreparazioneAddActivityForm({
  newActivity,
  setNewActivity,
  adding,
  onSubmit,
  onCancel,
  showDocumentoToggle = false,
}) {
  return (
    <form onSubmit={onSubmit} className={FORM_CONTAINER_STYLE + ' space-y-4'}>
      <h3 className="font-semibold text-lg">Nuova attività</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrizione <span className="text-red-500">*</span>
        </label>
        <input
          className={INPUT_STYLE}
          value={newActivity.descrizione}
          onChange={e => setNewActivity(prev => ({ ...prev, descrizione: e.target.value }))}
          placeholder="Es. Prenotare sala conferenze"
          required
          autoFocus
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            className={SELECT_STYLE}
            value={newActivity.categoria}
            onChange={e => setNewActivity(prev => ({ ...prev, categoria: e.target.value }))}
          >
            {Object.entries(CATEGORIA_ATTIVITA).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
          <input
            type="date"
            className={INPUT_STYLE}
            value={newActivity.deadline}
            onChange={e => setNewActivity(prev => ({ ...prev, deadline: e.target.value }))}
          />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
              checked={newActivity.obbligatoria}
              onChange={e => setNewActivity(prev => ({ ...prev, obbligatoria: e.target.checked }))}
            />
            <span className="text-sm font-medium text-gray-700">Obbligatoria</span>
          </label>
          <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
              checked={newActivity.post_evento}
              onChange={e => setNewActivity(prev => ({ ...prev, post_evento: e.target.checked }))}
            />
            <span className="text-sm font-medium text-gray-700">Post-evento</span>
          </label>
          {showDocumentoToggle && (
            <label className="flex items-center gap-2 min-h-[48px] cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                checked={newActivity.tipo_verifica === 'documento'}
                onChange={e => setNewActivity(prev => ({ ...prev, tipo_verifica: e.target.checked ? 'documento' : 'manuale' }))}
              />
              <span className="text-sm font-medium text-gray-700">Richiede documento</span>
            </label>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="primary" size="sm" loading={adding} type="submit">
          Aggiungi
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} type="button">
          Annulla
        </Button>
      </div>
    </form>
  )
}

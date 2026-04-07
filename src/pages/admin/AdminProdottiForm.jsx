import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ACTION_ICONS, ADMIN_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { INPUT_STYLE, SELECT_STYLE, TEXTAREA_STYLE, CARD_STYLE } from '../../lib/constants'
import { toDriveImageUrl } from '../../lib/format-utils'
import { AdminProdottiKit } from '../../components/admin/AdminProdottiKit'
import { AdminProdottiSpecimens } from '../../components/admin/AdminProdottiSpecimens'
import { AdminProdottiStock } from '../../components/admin/AdminProdottiStock'

const CHECK = 'w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400'

export function AdminProdottiForm({
  editing, setEditing, saving,
  brands, bodySections, productTypes,
  selectedSections, toggleSection,
  // Type + serializzato
  handleTipoChange, handleSerializzatoChange,
  // Save / navigation
  handleSave, onCancel,
  filteredProducts, goToProduct,
  // Kit
  kitContents, newPiece, setNewPiece,
  editingPiece, editingPieceData, setEditingPieceData,
  handleAddPiece, handleDeletePiece, handleStartEditPiece, handleSavePiece, handleCancelEditPiece,
  // Specimens
  specimens, newSpecimen, setNewSpecimen,
  editingSpecimen, editingSpecimenData, setEditingSpecimenData,
  deletingSpecimen, setDeletingSpecimen, specimenSaving,
  handleAddSpecimen, handleStartEditSpecimen, handleSaveSpecimen,
  handleDeleteSpecimen,
  // Stock
  stock, setStock, stockSaving, stockUnderThreshold,
  lottoQty, setLottoQty, lottoMotivo, setLottoMotivo, lottoSaving,
  stockHistory, showHistory, setShowHistory,
  handleSaveStock, handleCaricaLotto, handleUpdateAdjustment, handleDeleteAdjustment,
  stockLocations, magazzini, agenti,
}) {
  const currentIndex = editing?.id ? filteredProducts.findIndex(p => p.id === editing.id) : -1
  const canGoPrev = currentIndex > 0
  const canGoNext = currentIndex >= 0 && currentIndex < filteredProducts.length - 1

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Product header with prev/next nav */}
      {editing.id && (
        <div className="flex items-center justify-between bg-white border-b border-gray-200 -mx-4 md:-mx-8 px-4 md:px-8 py-3 sticky top-0 z-10">
          <div>
            <h2 className="font-semibold text-lg text-gray-900">{editing.nome || 'Nuovo prodotto'}</h2>
            {editing.codice && <p className="text-sm text-gray-500 font-mono">{editing.codice}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => canGoPrev && goToProduct(filteredProducts[currentIndex - 1])}
              disabled={!canGoPrev}
              className="min-h-[48px] min-w-[48px] rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30"
              aria-label="Prodotto precedente"
            >
              <Icon icon={ACTION_ICONS.back} size={20} />
            </button>
            <span className="text-sm text-gray-400">{currentIndex + 1} / {filteredProducts.length}</span>
            <button
              onClick={() => canGoNext && goToProduct(filteredProducts[currentIndex + 1])}
              disabled={!canGoNext}
              className="min-h-[48px] min-w-[48px] rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30"
              aria-label="Prodotto successivo"
            >
              <Icon icon={ACTION_ICONS.chevron_right} size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Dati prodotto */}
      <div className={CARD_STYLE + ' md:p-6 space-y-4'}>
        <h3 className="font-semibold text-lg">{editing.id ? 'Modifica prodotto' : 'Nuovo prodotto'}</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
          <input className={INPUT_STYLE} value={editing.nome || ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <select className={SELECT_STYLE} value={editing.brand_id || ''} onChange={e => setEditing({ ...editing, brand_id: e.target.value })}>
              <option value="">-- Seleziona --</option>
              {brands.filter(b => b.attivo).map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select className={SELECT_STYLE} value={editing.tipo || 'demo_kit'} onChange={e => handleTipoChange(e.target.value)}>
              {productTypes.filter(pt => pt.attivo).map(pt => <option key={pt.codice} value={pt.codice}>{pt.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Modalita gestione */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Modalità gestione</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => handleSerializzatoChange(true)}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors min-h-[48px] flex-1 ${editing.serializzato ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${editing.serializzato ? 'border-mikai-400 bg-mikai-400' : 'border-gray-300'}`}>
                {editing.serializzato && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <div className="text-base font-medium text-gray-900">Gestione a esemplari</div>
                <div className="text-sm text-gray-500">Traccia ogni pezzo con codice e posizione</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleSerializzatoChange(false)}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors min-h-[48px] flex-1 ${!editing.serializzato ? 'border-mikai-400 bg-mikai-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${!editing.serializzato ? 'border-mikai-400 bg-mikai-400' : 'border-gray-300'}`}>
                {!editing.serializzato && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <div className="text-base font-medium text-gray-900">Gestione a quantità</div>
                <div className="text-sm text-gray-500">Traccia solo lo stock totale</div>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
          <input className={INPUT_STYLE} value={editing.codice || ''} onChange={e => setEditing({ ...editing, codice: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
          <textarea className={TEXTAREA_STYLE} value={editing.descrizione || ''} onChange={e => setEditing({ ...editing, descrizione: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link immagine (Google Drive o URL diretto)</label>
          <input
            className={INPUT_STYLE}
            value={editing.foto_url || ''}
            onChange={e => setEditing({ ...editing, foto_url: e.target.value })}
            placeholder="https://drive.google.com/file/d/..."
          />
          <p className="text-xs text-gray-500 mt-1">Incolla il link di condivisione di Google Drive</p>
          {editing.foto_url && (
            <div className="mt-2 flex items-start gap-3">
              <img
                src={toDriveImageUrl(editing.foto_url)}
                alt="Anteprima"
                className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <button
                type="button"
                onClick={() => setEditing({ ...editing, foto_url: '' })}
                className="text-sm text-red-500 hover:text-red-700 mt-1"
              >
                Rimuovi immagine
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" className={CHECK} checked={editing.attivo !== false} onChange={e => setEditing({ ...editing, attivo: e.target.checked })} id="attivo" />
          <label htmlFor="attivo" className="text-base text-gray-700">Attivo</label>
        </div>
      </div>

      {/* Distretti anatomici */}
      <div className={CARD_STYLE + ' md:p-6'}>
        <h3 className="font-semibold text-lg text-gray-900 mb-3">Distretti anatomici</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {bodySections.filter(bs => bs.attivo).map(bs => (
            <label key={bs.id} className="flex items-center gap-2 text-base text-gray-700 cursor-pointer">
              <input type="checkbox" className={CHECK} checked={selectedSections.includes(bs.id)} onChange={() => toggleSection(bs.id)} />
              {bs.nome}
            </label>
          ))}
        </div>
      </div>

      {/* Contenuto kit */}
      <AdminProdottiKit
        editing={editing}
        kitContents={kitContents}
        newPiece={newPiece}
        setNewPiece={setNewPiece}
        editingPiece={editingPiece}
        editingPieceData={editingPieceData}
        setEditingPieceData={setEditingPieceData}
        onAddPiece={handleAddPiece}
        onDeletePiece={handleDeletePiece}
        onStartEditPiece={handleStartEditPiece}
        onSavePiece={handleSavePiece}
        onCancelEditPiece={handleCancelEditPiece}
      />

      {/* Esemplari (serialized) */}
      <AdminProdottiSpecimens
        editing={editing}
        specimens={specimens}
        newSpecimen={newSpecimen}
        setNewSpecimen={setNewSpecimen}
        editingSpecimen={editingSpecimen}
        editingSpecimenData={editingSpecimenData}
        setEditingSpecimenData={setEditingSpecimenData}
        deletingSpecimen={deletingSpecimen}
        setDeletingSpecimen={setDeletingSpecimen}
        specimenSaving={specimenSaving}
        onAddSpecimen={handleAddSpecimen}
        onStartEditSpecimen={handleStartEditSpecimen}
        onSaveSpecimen={handleSaveSpecimen}
        onCancelEditSpecimen={() => setEditingSpecimen(null)}
        onDeleteSpecimen={handleDeleteSpecimen}
      />

      {/* Stock (quantity) */}
      <AdminProdottiStock
        editing={editing}
        stock={stock}
        setStock={setStock}
        stockSaving={stockSaving}
        stockUnderThreshold={stockUnderThreshold}
        lottoQty={lottoQty}
        setLottoQty={setLottoQty}
        lottoMotivo={lottoMotivo}
        setLottoMotivo={setLottoMotivo}
        lottoSaving={lottoSaving}
        stockHistory={stockHistory}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        onSaveStock={handleSaveStock}
        onCaricaLotto={handleCaricaLotto}
        onUpdateAdjustment={handleUpdateAdjustment}
        onDeleteAdjustment={handleDeleteAdjustment}
        stockLocations={stockLocations}
        magazzini={magazzini}
        agenti={agenti}
      />

      <div className="flex gap-3">
        <Button onClick={handleSave} loading={saving} disabled={!editing.nome?.trim()}>Salva prodotto</Button>
        <Button variant="secondary" onClick={onCancel}>Annulla</Button>
      </div>
    </div>
  )
}

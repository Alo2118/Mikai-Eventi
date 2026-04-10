import { useState, useCallback, useEffect } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useAuthStore } from '../../hooks/useAuth'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useToastStore } from '../../components/ui/Toast'

const SERIALIZED_TYPES = new Set(['demo_kit', 'strumentario', 'montaggio'])

function defaultSerializzato(tipo) {
  return SERIALIZED_TYPES.has(tipo)
}

export function useAdminProdottiHandlers() {
  const fetchKitContents = useAdminStore(s => s.fetchKitContents)
  const createKitContent = useAdminStore(s => s.createKitContent)
  const updateKitContent = useAdminStore(s => s.updateKitContent)
  const deleteKitContent = useAdminStore(s => s.deleteKitContent)
  const fetchProductSpecimens = useAdminStore(s => s.fetchProductSpecimens)
  const createSpecimen = useAdminStore(s => s.createSpecimen)
  const updateSpecimen = useAdminStore(s => s.updateSpecimen)
  const deleteSpecimen = useAdminStore(s => s.deleteSpecimen)
  const fetchProductStock = useAdminStore(s => s.fetchProductStock)
  const updateProductStock = useAdminStore(s => s.updateProductStock)
  const adjustStock = useAdminStore(s => s.adjustStock)
  const fetchStockHistory = useAdminStore(s => s.fetchStockHistory)
  const updateStockAdjustment = useAdminStore(s => s.updateStockAdjustment)
  const deleteStockAdjustment = useAdminStore(s => s.deleteStockAdjustment)
  const fetchStockLocations = useAdminStore(s => s.fetchStockLocations)
  const addToast = useToastStore(s => s.add)
  const currentUserId = useAuthStore(s => s.user?.id)
  const fetchMagazzini = useMaterialsStore(s => s.fetchMagazzini)
  const fetchAgenti = useMaterialsStore(s => s.fetchAgenti)

  // Kit state
  const [kitContents, setKitContents] = useState([])
  const [newPiece, setNewPiece] = useState({ piece_name: '', piece_code: '', quantity: 1 })
  const [editingPiece, setEditingPiece] = useState(null)
  const [editingPieceData, setEditingPieceData] = useState({})

  // Specimen state
  const [specimens, setSpecimens] = useState([])
  const [newSpecimen, setNewSpecimen] = useState({ codice_inventario: '', posizione_attuale: 'in_magazzino', note: '' })
  const [editingSpecimen, setEditingSpecimen] = useState(null)
  const [editingSpecimenData, setEditingSpecimenData] = useState({})
  const [deletingSpecimen, setDeletingSpecimen] = useState(null)
  const [specimenSaving, setSpecimenSaving] = useState(false)

  // Stock state
  const [stock, setStock] = useState({ quantita_disponibile: 0, soglia_minima: 0 })
  const [stockSaving, setStockSaving] = useState(false)
  const [lottoQty, setLottoQty] = useState('')
  const [lottoMotivo, setLottoMotivo] = useState('')
  const [lottoSaving, setLottoSaving] = useState(false)
  const [stockHistory, setStockHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [stockLocations, setStockLocations] = useState([])
  const [magazzini, setMagazzini] = useState([])
  const [agenti, setAgenti] = useState([])

  useEffect(() => {
    fetchMagazzini().then(r => setMagazzini(r.data || []))
    fetchAgenti().then(r => setAgenti(r.data || []))
  }, [])

  const loadRelated = useCallback(async (product) => {
    if (product.id) {
      if (product.serializzato) {
        const [kcRes, spRes] = await Promise.all([
          fetchKitContents(product.id),
          fetchProductSpecimens(product.id),
        ])
        setKitContents(kcRes.data || [])
        setSpecimens(spRes.data || [])
        setStock({ quantita_disponibile: 0, soglia_minima: 0 })
        setStockHistory([])
        setStockLocations([])
      } else {
        const [kcRes, stRes, histRes, locRes] = await Promise.all([
          fetchKitContents(product.id),
          fetchProductStock(product.id),
          fetchStockHistory(product.id),
          fetchStockLocations(product.id),
        ])
        setKitContents(kcRes.data || [])
        setSpecimens([])
        setStock({ quantita_disponibile: stRes.data?.quantita_disponibile ?? 0, soglia_minima: stRes.data?.soglia_minima ?? 0 })
        setStockHistory(histRes.data || [])
        setStockLocations(locRes.data || [])
      }
    } else {
      setKitContents([])
      setSpecimens([])
      setStock({ quantita_disponibile: 0, soglia_minima: 0 })
    }
  }, [fetchKitContents, fetchProductSpecimens, fetchProductStock, fetchStockHistory, fetchStockLocations])

  const resetEditState = () => {
    setNewPiece({ piece_name: '', piece_code: '', quantity: 1 })
    setNewSpecimen({ codice_inventario: '', posizione_attuale: 'in_magazzino', note: '' })
    setEditingSpecimen(null)
    setLottoQty('')
    setLottoMotivo('')
    setShowHistory(false)
  }

  const resetAllState = () => {
    setKitContents([])
    setSpecimens([])
    resetEditState()
    setStock({ quantita_disponibile: 0, soglia_minima: 0 })
  }

  // Kit
  const handleAddPiece = async (productId) => {
    if (!productId || !newPiece.piece_name.trim()) return
    const { error } = await createKitContent({
      product_id: productId, piece_name: newPiece.piece_name,
      piece_code: newPiece.piece_code || null, quantity: parseInt(newPiece.quantity) || 1,
    })
    if (error) { addToast(error, 'error'); return }
    const { data } = await fetchKitContents(productId)
    setKitContents(data || [])
    setNewPiece({ piece_name: '', piece_code: '', quantity: 1 })
  }

  const handleDeletePiece = async (pieceId, productId) => {
    const { error } = await deleteKitContent(pieceId)
    if (error) { addToast(error, 'error'); return }
    const { data } = await fetchKitContents(productId)
    setKitContents(data || [])
  }

  const handleStartEditPiece = (kc) => {
    setEditingPiece(kc.id)
    setEditingPieceData({ piece_name: kc.piece_name, piece_code: kc.piece_code || '', quantity: kc.quantity })
  }

  const handleSavePiece = async (productId) => {
    if (!editingPiece || !editingPieceData.piece_name?.trim()) return
    const { error } = await updateKitContent(editingPiece, {
      piece_name: editingPieceData.piece_name, piece_code: editingPieceData.piece_code || null,
      quantity: parseInt(editingPieceData.quantity) || 1,
    })
    if (error) { addToast(error, 'error'); return }
    const { data } = await fetchKitContents(productId)
    setKitContents(data || [])
    setEditingPiece(null)
  }

  const handleCancelEditPiece = () => { setEditingPiece(null); setEditingPieceData({}) }

  // Auto-generate next inventory code
  const nextInventoryCode = useCallback((codice) => {
    const base = codice?.trim()
    if (!base) return ''
    const existing = specimens
      .map(sp => sp.codice_inventario || '')
      .filter(c => c.startsWith(base + '-'))
      .map(c => parseInt(c.slice(base.length + 1), 10))
      .filter(n => !isNaN(n))
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
    return `${base}-${String(next).padStart(3, '0')}`
  }, [specimens])

  // Specimens
  const handleAddSpecimen = async (productId, editing) => {
    if (!productId || !newSpecimen.codice_inventario.trim()) return
    setSpecimenSaving(true)
    const tipo = editing.tipo === 'pezzo_sfuso' ? 'altro' : (editing.tipo === 'gadget' ? 'altro' : editing.tipo)
    const { error } = await createSpecimen({
      product_id: productId, nome: editing.nome, tipo,
      codice_inventario: newSpecimen.codice_inventario,
      posizione_attuale: newSpecimen.posizione_attuale || 'in_magazzino',
      note: newSpecimen.note || null, attivo: true,
    })
    setSpecimenSaving(false)
    if (error) { addToast(error, 'error'); return }
    const { data } = await fetchProductSpecimens(productId)
    setSpecimens(data || [])
    setNewSpecimen({ codice_inventario: '', posizione_attuale: 'in_magazzino', note: '' })
  }

  const handleStartEditSpecimen = (sp) => {
    setEditingSpecimen(sp.id)
    setEditingSpecimenData({
      codice_inventario: sp.codice_inventario || '', posizione_attuale: sp.posizione_attuale || 'in_magazzino', note: sp.note || '',
    })
  }

  const handleSaveSpecimen = async (productId) => {
    setSpecimenSaving(true)
    const { error } = await updateSpecimen(editingSpecimen, {
      codice_inventario: editingSpecimenData.codice_inventario || null,
      posizione_attuale: editingSpecimenData.posizione_attuale || 'in_magazzino',
      note: editingSpecimenData.note || null,
    })
    setSpecimenSaving(false)
    if (error) { addToast(error, 'error'); return }
    setEditingSpecimen(null)
    if (productId) {
      const { data } = await fetchProductSpecimens(productId)
      setSpecimens(data || [])
    }
  }

  const handleDeleteSpecimen = async (productId) => {
    const { error } = await deleteSpecimen(deletingSpecimen.id)
    if (error) { addToast(error, 'error') } else { addToast('Esemplare eliminato', 'success') }
    setDeletingSpecimen(null)
    if (productId) {
      const { data } = await fetchProductSpecimens(productId)
      setSpecimens(data || [])
    }
  }

  // Stock
  const handleSaveStock = async (productId) => {
    if (!productId) return
    setStockSaving(true)
    const { error } = await updateProductStock(productId, stock.quantita_disponibile, stock.soglia_minima)
    setStockSaving(false)
    if (error) { addToast(error, 'error'); return }
    addToast('Stock aggiornato', 'success')
  }

  const handleCaricaLotto = async (productId, magazzinoId, agentUserId) => {
    const delta = parseInt(lottoQty)
    if (!productId || !delta || delta <= 0) return
    if (!magazzinoId && !agentUserId) { addToast('Seleziona una destinazione', 'warning'); return }
    setLottoSaving(true)
    const { error, quantitaDopo } = await adjustStock(productId, delta, lottoMotivo || 'Carico lotto', currentUserId, magazzinoId || null, agentUserId || null)
    setLottoSaving(false)
    if (error) { addToast(error, 'error'); return }
    setStock(s => ({ ...s, quantita_disponibile: quantitaDopo }))
    setLottoQty('')
    setLottoMotivo('')
    const [histRes, locRes] = await Promise.all([fetchStockHistory(productId), fetchStockLocations(productId)])
    setStockHistory(histRes.data || [])
    setStockLocations(locRes.data || [])
    addToast(`+${delta} pz caricati`, 'success')
  }

  const reloadStockData = async (productId) => {
    const [histRes, locRes, stRes] = await Promise.all([
      fetchStockHistory(productId), fetchStockLocations(productId), fetchProductStock(productId),
    ])
    setStockHistory(histRes.data || [])
    setStockLocations(locRes.data || [])
    setStock({ quantita_disponibile: stRes.data?.quantita_disponibile ?? 0, soglia_minima: stRes.data?.soglia_minima ?? stock.soglia_minima })
  }

  const handleUpdateAdjustment = async (adjId, productId, newDelta, newMotivo) => {
    const { error } = await updateStockAdjustment(adjId, productId, newDelta, newMotivo)
    if (error) { addToast(error, 'error'); return }
    await reloadStockData(productId)
    addToast('Movimento aggiornato', 'success')
  }

  const handleDeleteAdjustment = async (adjId, productId) => {
    const { error } = await deleteStockAdjustment(adjId, productId)
    if (error) { addToast(error, 'error'); return }
    await reloadStockData(productId)
    addToast('Movimento eliminato', 'success')
  }

  const handleSerializzatoChange = async (val, editing, setEditing) => {
    setEditing(prev => ({ ...prev, serializzato: val }))
    if (editing?.id) {
      if (val) {
        const { data: sp } = await fetchProductSpecimens(editing.id)
        setSpecimens(sp || [])
        setStock({ quantita_disponibile: 0, soglia_minima: 0 })
      } else {
        setSpecimens([])
        const { data: st } = await fetchProductStock(editing.id)
        setStock({ quantita_disponibile: st?.quantita_disponibile ?? 0, soglia_minima: st?.soglia_minima ?? 0 })
      }
    }
  }

  return {
    defaultSerializzato,
    loadRelated, resetEditState, resetAllState,
    // Kit
    kitContents, newPiece, setNewPiece,
    editingPiece, editingPieceData, setEditingPieceData,
    handleAddPiece, handleDeletePiece, handleStartEditPiece, handleSavePiece, handleCancelEditPiece,
    // Specimens
    specimens, newSpecimen, setNewSpecimen,
    editingSpecimen, editingSpecimenData, setEditingSpecimenData,
    deletingSpecimen, setDeletingSpecimen, specimenSaving,
    handleAddSpecimen, handleStartEditSpecimen, handleSaveSpecimen, handleDeleteSpecimen,
    nextInventoryCode,
    // Stock
    stock, setStock, stockSaving,
    lottoQty, setLottoQty, lottoMotivo, setLottoMotivo, lottoSaving,
    stockHistory, showHistory, setShowHistory, stockLocations,
    magazzini, agenti,
    handleSaveStock, handleCaricaLotto, handleUpdateAdjustment, handleDeleteAdjustment,
    handleSerializzatoChange,
  }
}

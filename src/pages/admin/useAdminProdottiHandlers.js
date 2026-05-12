import { useState, useCallback, useEffect } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useAuthStore } from '../../hooks/useAuth'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useToastStore } from '../../components/ui/Toast'
import { STOCK_MOTIVO } from '../../lib/constants'

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
  const adjustStock = useAdminStore(s => s.adjustStock)
  const setStockLocationQty = useAdminStore(s => s.setStockLocationQty)
  const reverseStockAdjustment = useAdminStore(s => s.reverseStockAdjustment)
  const fetchStockHistory = useAdminStore(s => s.fetchStockHistory)
  const fetchStockLocations = useAdminStore(s => s.fetchStockLocations)
  const fetchCommittedStock = useAdminStore(s => s.fetchCommittedStock)
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
  const [committed, setCommitted] = useState(0)
  const [stockLocations, setStockLocations] = useState([])
  const [stockHistory, setStockHistory] = useState([])
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyLimit, setHistoryLimit] = useState(50)
  const [stockBusy, setStockBusy] = useState(false)
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false)
  const [magazzini, setMagazzini] = useState([])
  const [agenti, setAgenti] = useState([])

  useEffect(() => {
    fetchMagazzini().then(r => setMagazzini(r.data || []))
    fetchAgenti().then(r => setAgenti(r.data || []))
  }, [])

  const resetStockState = () => {
    setStock({ quantita_disponibile: 0, soglia_minima: 0 })
    setCommitted(0)
    setStockLocations([])
    setStockHistory([])
    setHistoryHasMore(false)
    setHistoryLimit(50)
  }

  const loadRelated = useCallback(async (product) => {
    if (product.id) {
      if (product.serializzato) {
        const [kcRes, spRes] = await Promise.all([
          fetchKitContents(product.id),
          fetchProductSpecimens(product.id),
        ])
        setKitContents(kcRes.data || [])
        setSpecimens(spRes.data || [])
        resetStockState()
      } else {
        const [kcRes, stRes, histRes, locRes, commRes] = await Promise.all([
          fetchKitContents(product.id),
          fetchProductStock(product.id),
          fetchStockHistory(product.id, 50),
          fetchStockLocations(product.id),
          fetchCommittedStock(product.id),
        ])
        setKitContents(kcRes.data || [])
        setSpecimens([])
        setStock({ quantita_disponibile: stRes.data?.quantita_disponibile ?? 0, soglia_minima: stRes.data?.soglia_minima ?? 0 })
        setStockHistory(histRes.data || [])
        setHistoryHasMore(!!histRes.hasMore)
        setHistoryLimit(50)
        setStockLocations(locRes.data || [])
        setCommitted(commRes.data || 0)
      }
    } else {
      setKitContents([])
      setSpecimens([])
      resetStockState()
    }
  }, [fetchKitContents, fetchProductSpecimens, fetchProductStock, fetchStockHistory, fetchStockLocations, fetchCommittedStock])

  const resetEditState = () => {
    setNewPiece({ piece_name: '', piece_code: '', quantity: 1 })
    setNewSpecimen({ codice_inventario: '', posizione_attuale: 'in_magazzino', note: '' })
    setEditingSpecimen(null)
  }

  const resetAllState = () => {
    setKitContents([])
    setSpecimens([])
    resetEditState()
    resetStockState()
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
  const reloadStockData = async (productId, limit = historyLimit) => {
    const [histRes, locRes, stRes, commRes] = await Promise.all([
      fetchStockHistory(productId, limit),
      fetchStockLocations(productId),
      fetchProductStock(productId),
      fetchCommittedStock(productId),
    ])
    setStockHistory(histRes.data || [])
    setHistoryHasMore(!!histRes.hasMore)
    setStockLocations(locRes.data || [])
    setStock(s => ({ quantita_disponibile: stRes.data?.quantita_disponibile ?? 0, soglia_minima: stRes.data?.soglia_minima ?? s.soglia_minima }))
    setCommitted(commRes.data || 0)
  }

  const handleCaricaLotto = async (productId, qty, motivo, magazzinoId, agentUserId) => {
    const delta = parseInt(qty, 10)
    if (!productId || !delta || delta <= 0) return { error: 'Quantità non valida' }
    if (!magazzinoId && !agentUserId) { addToast('Seleziona una destinazione', 'warning'); return { error: 'Destinazione mancante' } }
    setStockBusy(true)
    const { error } = await adjustStock(productId, delta, motivo?.trim() || STOCK_MOTIVO.caricoLotto, currentUserId, magazzinoId || null, agentUserId || null)
    setStockBusy(false)
    if (error) { addToast(error, 'error'); return { error } }
    await reloadStockData(productId)
    addToast(`+${delta} pz caricati`, 'success')
    return { error: null }
  }

  const handleRettificaPosizione = async (productId, magazzinoId, agentUserId, targetQty, motivo) => {
    if (!productId) return { error: 'Prodotto non valido' }
    setStockBusy(true)
    const { error, delta } = await setStockLocationQty(productId, magazzinoId, agentUserId, targetQty, currentUserId, motivo?.trim() || STOCK_MOTIVO.rettifica)
    setStockBusy(false)
    if (error) { addToast(error, 'error'); return { error } }
    if (delta === 0) { addToast('La giacenza era già corretta', 'success'); return { error: null } }
    await reloadStockData(productId)
    addToast('Giacenza rettificata', 'success')
    return { error: null }
  }

  const handleReverseAdjustment = async (adjId, productId) => {
    if (!productId) return { error: 'Prodotto non valido' }
    setStockBusy(true)
    const { error } = await reverseStockAdjustment(adjId, productId, currentUserId)
    setStockBusy(false)
    if (error) { addToast(error, 'error'); return { error } }
    await reloadStockData(productId)
    addToast('Movimento stornato', 'success')
    return { error: null }
  }

  const handleLoadMoreHistory = async (productId) => {
    const newLimit = historyLimit + 50
    setLoadingMoreHistory(true)
    const res = await fetchStockHistory(productId, newLimit)
    setLoadingMoreHistory(false)
    setHistoryLimit(newLimit)
    setStockHistory(res.data || [])
    setHistoryHasMore(!!res.hasMore)
  }

  const handleSerializzatoChange = async (val, editing, setEditing) => {
    setEditing(prev => ({ ...prev, serializzato: val }))
    if (editing?.id) {
      if (val) {
        const { data: sp } = await fetchProductSpecimens(editing.id)
        setSpecimens(sp || [])
      } else {
        setSpecimens([])
        await reloadStockData(editing.id, 50)
        setHistoryLimit(50)
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
    stock, setStock, committed,
    stockLocations, stockHistory, historyHasMore,
    stockBusy, loadingMoreHistory,
    magazzini, agenti,
    handleCaricaLotto, handleRettificaPosizione, handleReverseAdjustment, handleLoadMoreHistory,
    handleSerializzatoChange,
  }
}

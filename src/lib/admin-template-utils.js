export const PERMISSION_OPTIONS = {
  gestione_marketing: 'Marketing',
  gestione_spedizioni: 'Spedizioni',
  gestione_magazzino: 'Magazzino',
  gestione_organizzazione: 'Organizzazione',
  gestione_costi: 'Costi',
}

export const CHECKLIST_EMPTY_FORM = {
  descrizione: '',
  categoria: 'organizzazione',
  permesso_responsabile: '',
  giorni_prima_evento: -7,
  obbligatorio: true,
  post_evento: false,
  tipo_verifica: 'manuale',
  verifica_automatica: '',
  dipende_da: '',
}

export const PROGRAM_EMPTY_FORM = {
  tipo_sotto_attivita_id: '',
  descrizione: '',
  giorno: 1,
  orario: '',
  durata_minuti: '',
  luogo: '',
  fornitore: '',
  note: '',
}

export const MATERIAL_EMPTY_FORM = { product_id: '', quantita: 1, note: '' }

export function wouldCreateCycle(itemId, targetId, allItems) {
  if (!itemId || !targetId) return false
  const visited = new Set()
  let current = targetId
  while (current) {
    if (current === itemId) return true
    if (visited.has(current)) return false
    visited.add(current)
    const item = allItems.find(i => i.id === current)
    current = item?.dipende_da || null
  }
  return false
}

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

export function topologicalSort(items) {
  const sorted = []
  const visited = new Set()
  const itemMap = new Map(items.map(i => [i.id, i]))
  function visit(item) {
    if (visited.has(item.id)) return
    visited.add(item.id)
    if (item.dipende_da && itemMap.has(item.dipende_da)) {
      visit(itemMap.get(item.dipende_da))
    }
    sorted.push(item)
  }
  items.forEach(i => visit(i))
  return sorted
}

export function getDepthLevel(item, items, maxDepth = 3) {
  let depth = 0
  let current = item
  while (current.dipende_da && depth < maxDepth) {
    depth++
    current = items.find(i => i.id === current.dipende_da) || { dipende_da: null }
  }
  return depth
}

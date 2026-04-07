import { supabase } from './supabase'

/**
 * Builds a paginated, filtered Supabase query for the materials table.
 * Extracted from useMaterials store for maintainability.
 */
export function buildMaterialQuery(filters, from, to) {
  let query = supabase.from('materials').select(`
      *,
      product:products(id, nome, codice, foto_url, brand:brands(id, nome)),
      magazzino:magazzini(id, nome),
      agente:users!materials_presso_utente_id_fkey(id, nome, cognome)
    `, { count: 'exact' }).eq('attivo', true).order('nome')

  const { search, tipo, posizione, brand } = filters
  if (search) query = query.ilike('nome', `%${search}%`)
  if (tipo) query = query.eq('tipo', tipo)
  if (posizione) query = query.eq('posizione_attuale', posizione)
  if (brand) query = query.eq('product.brand_id', brand)

  query = query.range(from, to)
  return query
}

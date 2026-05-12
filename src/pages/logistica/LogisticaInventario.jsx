import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput } from '../../components/ui/SearchInput'
import { Icon } from '../../components/ui/Icon'
import { ACTION_ICONS, POSIZIONE_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { POSIZIONE_MATERIALE, TIPO_MATERIALE, TIPO_PRODOTTO } from '../../lib/constants'

const TYPE_FILTERS = [
  { id: 'all', label: 'Tutto' },
  { id: 'specimens', label: 'Esemplari' },
  { id: 'stock', label: 'Quantità' },
]
const GROUP_CAP = 15

function groupIcon(group) {
  if (group.kind === 'magazzino') return MATERIALE_ICONS.warehouse
  if (group.kind === 'agente') return POSIZIONE_ICONS.magazzino_agente
  return POSIZIONE_ICONS[group.posKey] || POSIZIONE_ICONS.in_transito
}

function ItemRow({ item, locationLabel, onNavigate }) {
  const body = (
    <span className="flex items-center justify-between gap-3 min-w-0">
      <span className="min-w-0 block">
        <span className="block text-base text-gray-900 truncate">{item.nome}</span>
        <span className="flex items-center gap-2 flex-wrap mt-0.5">
          {item.codice && <span className="text-xs text-gray-500 font-mono">{item.codice}</span>}
          {item.tipo && <span className="text-xs text-gray-400">{(item.kind === 'stock' ? TIPO_PRODOTTO[item.tipo] : TIPO_MATERIALE[item.tipo]) || item.tipo}</span>}
          {locationLabel && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{locationLabel}</span>}
        </span>
      </span>
      {item.kind === 'stock'
        ? <span className="shrink-0 text-sm font-medium text-gray-900">{item.quantita} pz</span>
        : <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">esemplare</span>}
    </span>
  )
  if (item.kind === 'specimen') {
    return (
      <button type="button" onClick={() => onNavigate(item.navTo)} className="w-full text-left rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors px-3 py-2 min-h-[48px]">
        {body}
      </button>
    )
  }
  return <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 min-h-[48px] flex items-center">{body}</div>
}

function LocationGroup({ group, expanded, onToggle, onNavigate }) {
  const [showAll, setShowAll] = useState(false)
  const nSpec = group.items.filter(i => i.kind === 'specimen').length
  const nStock = group.items.length - nSpec
  const countLabel = [nSpec ? `${nSpec} esempl.` : null, nStock ? `${nStock} prod.` : null].filter(Boolean).join(' · ')
  const visible = showAll ? group.items : group.items.slice(0, GROUP_CAP)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[48px] hover:bg-gray-50">
        <span className="flex items-center gap-2 min-w-0">
          <Icon icon={groupIcon(group)} size={18} className="text-gray-400 shrink-0" />
          <span className="font-semibold text-gray-900 truncate">{group.label}</span>
          {group.kind === 'agente' && <span className="text-xs text-gray-400 shrink-0">agente</span>}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-gray-500">{countLabel}</span>
          <Icon icon={ACTION_ICONS.chevron_right} size={18} className={expanded ? 'rotate-90 transition-transform' : 'transition-transform'} />
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {visible.map(item => <ItemRow key={`${item.kind}:${item.id}`} item={item} onNavigate={onNavigate} />)}
          {group.items.length > GROUP_CAP && (
            <button type="button" onClick={() => setShowAll(s => !s)} className="min-h-[48px] text-sm font-medium text-mikai-600 hover:text-mikai-800">
              {showAll ? 'Mostra meno' : `Mostra tutti (${group.items.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function LogisticaInventario() {
  const inventory = useMaterialsStore(s => s.inventory)
  const inventoryStock = useMaterialsStore(s => s.inventoryStock)
  const loading = useMaterialsStore(s => s.inventoryLoading)
  const error = useMaterialsStore(s => s.inventoryError)
  const fetchInventory = useMaterialsStore(s => s.fetchInventory)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [collapsed, setCollapsed] = useState(() => new Set())

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const groups = useMemo(() => {
    const map = new Map()
    const ensure = (key, meta) => { if (!map.has(key)) map.set(key, { key, items: [], ...meta }); return map.get(key) }

    if (typeFilter !== 'stock') {
      for (const m of inventory) {
        const item = { kind: 'specimen', id: m.id, nome: m.nome || '—', codice: m.codice_inventario, tipo: m.tipo, navTo: `/materiale/${m.id}` }
        if (m.posizione_attuale === 'in_magazzino') {
          ensure(m.magazzino ? `mag:${m.magazzino.id}` : 'mag:?', { kind: 'magazzino', label: m.magazzino?.nome || 'Magazzino non specificato', order: 1 }).items.push(item)
        } else if (m.posizione_attuale === 'magazzino_agente') {
          ensure(m.agente ? `agent:${m.agente.id}` : 'agent:?', { kind: 'agente', label: m.agente ? `${m.agente.cognome} ${m.agente.nome}` : 'Agente non specificato', order: 2 }).items.push(item)
        } else {
          ensure(`fuori:${m.posizione_attuale}`, { kind: 'fuori', posKey: m.posizione_attuale, label: POSIZIONE_MATERIALE[m.posizione_attuale] || m.posizione_attuale, order: 3 }).items.push(item)
        }
      }
    }
    if (typeFilter !== 'specimens') {
      for (const s of inventoryStock) {
        if (!s.product || s.product.serializzato) continue
        const item = { kind: 'stock', id: s.id, nome: s.product.nome || '—', codice: s.product.codice, tipo: s.product.tipo, quantita: s.quantita }
        if (s.magazzino_id) ensure(`mag:${s.magazzino_id}`, { kind: 'magazzino', label: s.magazzino?.nome || 'Magazzino', order: 1 }).items.push(item)
        else if (s.user_id) ensure(`agent:${s.user_id}`, { kind: 'agente', label: s.agent ? `${s.agent.cognome} ${s.agent.nome}` : 'Agente', order: 2 }).items.push(item)
      }
    }

    const arr = [...map.values()]
    for (const g of arr) g.items.sort((a, b) => a.nome.localeCompare(b.nome) || (a.codice || '').localeCompare(b.codice || ''))
    return arr.sort((a, b) => (a.order - b.order) || a.label.localeCompare(b.label))
  }, [inventory, inventoryStock, typeFilter])

  const q = search.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!q) return null
    const out = []
    for (const g of groups) {
      for (const item of g.items) {
        if (item.nome.toLowerCase().includes(q) || item.codice?.toLowerCase().includes(q)) out.push({ ...item, locationLabel: g.label })
      }
    }
    return out
  }, [groups, q])

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  const toggleGroup = (key) => setCollapsed(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  return (
    <div className="px-4 md:px-8 py-4">
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Cerca esemplare o prodotto (nome o codice)..." />
        </div>
        <div className="flex gap-2" role="group" aria-label="Filtra per tipo">
          {TYPE_FILTERS.map(t => {
            const active = typeFilter === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                aria-pressed={active}
                className={`min-h-[48px] px-3 rounded-lg border text-sm font-medium transition-colors flex items-center gap-1 ${active ? 'border-mikai-400 bg-mikai-50 text-mikai-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {active && <Icon icon={ACTION_ICONS.check} size={14} />}
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {!error && !loading && total > 0 && (
        <p className="text-sm text-gray-500 mb-3">
          {q ? `${searchResults.length} risultati` : `${total} articoli in inventario`}
          {typeFilter !== 'all' && !q && ` (solo ${typeFilter === 'specimens' ? 'esemplari' : 'quantità'})`}
        </p>
      )}

      {error ? (
        <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          Non siamo riusciti a caricare l'inventario. Riprova.
        </div>
      ) : loading ? (
        <LoadingSkeleton lines={5} />
      ) : q ? (
        searchResults.length === 0 ? (
          <EmptyState title="Nessun risultato" description={`Niente corrisponde a "${search}".`} />
        ) : (
          <div className="space-y-2">
            {searchResults.map(item => <ItemRow key={`${item.kind}:${item.id}`} item={item} locationLabel={item.locationLabel} onNavigate={navigate} />)}
          </div>
        )
      ) : total === 0 ? (
        <EmptyState title="Inventario vuoto" description="Non ci sono ancora esemplari né giacenze a quantità." />
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <LocationGroup key={g.key} group={g} expanded={!collapsed.has(g.key)} onToggle={() => toggleGroup(g.key)} onNavigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}

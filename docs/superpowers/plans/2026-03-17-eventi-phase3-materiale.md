# Mikai Eventi — Phase 3: Materiale & Gadget

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build material inventory management, event material requests with conflict detection, movement tracking (uscita/rientro), and gadgets — both as a top-level page and as the "Materiale & Gadget" tab in event detail.

**Architecture:** Two Zustand stores (`useMaterials` for inventory/movements, `useGadgets` for gadgets). Material requests live in the event detail tab. Conflict detection queries `event_materials` for overlapping dates. Position sync is automatic via DB trigger (already in place from Phase 1). All UI follows elderly-proof guidelines (48px targets, 16px font, Italian labels).

**Tech Stack:** React 19, Zustand, Supabase JS, TailwindCSS v4, date-fns

**Spec:** `docs/superpowers/specs/2026-03-17-eventi-mikai-design.md` (Sections 4.3, 5.2, 6.2, 6.5, 8, 9.3)

**Depends on:** Phase 1 (DB schema) + Phase 2 (event detail tabs, UI components)

---

## File Structure

```
src/
  hooks/
    useMaterials.js           # Zustand store: materials CRUD, movements, conflict check
    useGadgets.js             # Zustand store: gadgets CRUD, event gadgets
  pages/
    materiale/
      MaterialeList.jsx       # Top-level inventory page (/materiale)
      MaterialeDetail.jsx     # Single material detail with movements history
  components/
    materiale/
      MaterialCard.jsx        # Card for inventory list
      MaterialFilters.jsx     # Filters (tipo, posizione, search)
      MaterialRequestForm.jsx # Request material for event (with conflict check)
      MaterialMovementForm.jsx # Register uscita/rientro
      MovementHistory.jsx     # Movement history table
      ConflictAlert.jsx       # Conflict warning with suggestion
      GadgetCard.jsx          # Gadget card for inventory
      GadgetRequestForm.jsx   # Request gadgets for event
    eventi/
      EventMaterialsTab.jsx   # "Materiale & Gadget" tab in event detail
  lib/
    constants.js              # Add material-related label maps
```

---

## Task 3.1: Material constants + Zustand stores

**Files:**
- Modify: `src/lib/constants.js`
- Create: `src/hooks/useMaterials.js`, `src/hooks/useGadgets.js`

- [ ] **Step 1: Add material constants to constants.js**

Add to `src/lib/constants.js`:
```js
export const TIPO_MATERIALE = {
  demo_kit: 'Kit demo',
  montaggio: 'Montaggio',
  strumentario: 'Strumentario',
  altro: 'Altro',
}

export const POSIZIONE_MATERIALE = {
  magazzino: 'In magazzino',
  evento: 'All\'evento',
  agente: 'Presso agente',
  spedito: 'In spedizione',
  manutenzione: 'In manutenzione',
}

export const POSIZIONE_MATERIALE_COLORE = {
  magazzino: 'green',
  evento: 'blue',
  agente: 'yellow',
  spedito: 'mikai',
  manutenzione: 'red',
}

export const STATO_MOVIMENTO = {
  uscita: 'Uscita',
  rientro: 'Rientro',
  trasferimento: 'Trasferimento',
}

export const MODALITA_MOVIMENTO = {
  spedizione: 'Spedizione',
  mano: 'Consegna a mano',
  gia_in_loco: 'Gi\u00E0 in loco',
  trasferimento_da_altro_evento: 'Trasferimento da altro evento',
}

export const STATO_RIENTRO = {
  integro: 'Integro',
  parziale: 'Parziale',
  danneggiato: 'Danneggiato',
}

export const STATO_GADGET_RICHIESTA = {
  richiesto: 'Richiesto',
  pronto: 'Pronto',
  consegnato: 'Consegnato',
}
```

- [ ] **Step 2: Create useMaterials store**

`src/hooks/useMaterials.js`:
```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useMaterialsStore = create((set, get) => ({
  materials: [],
  loading: false,
  error: null,
  filters: { search: '', tipo: '', posizione: '' },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }))
    get().fetchMaterials()
  },

  resetFilters: () => {
    set({ filters: { search: '', tipo: '', posizione: '' } })
    get().fetchMaterials()
  },

  fetchMaterials: async () => {
    set({ loading: true, error: null })
    let query = supabase.from('materials').select('*').eq('attivo', true).order('nome')

    const { search, tipo, posizione } = get().filters
    if (search) query = query.ilike('nome', `%${search}%`)
    if (tipo) query = query.eq('tipo', tipo)
    if (posizione) query = query.eq('posizione_attuale', posizione)

    const { data, error } = await query
    set({ materials: data || [], loading: false, error: error?.message || null })
  },

  fetchMaterial: async (id) => {
    const { data, error } = await supabase
      .from('materials').select('*').eq('id', id).single()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  // Event materials (requests)
  fetchEventMaterials: async (eventId) => {
    const { data, error } = await supabase
      .from('event_materials')
      .select('*, material:materials(id, nome, tipo, codice_inventario, posizione_attuale), richiesto:users!event_materials_richiesto_da_fkey(nome, cognome)')
      .eq('event_id', eventId)
      .order('data_richiesta', { ascending: false })
    return { data: data || [], error: error?.message || null }
  },

  requestMaterial: async (request) => {
    const { data, error } = await supabase
      .from('event_materials').insert(request).select().single()
    return { data, error: error?.message || null }
  },

  approveMaterial: async (id, userId) => {
    const { data, error } = await supabase
      .from('event_materials')
      .update({ stato: 'approvato', approvato_da: userId, data_approvazione: new Date().toISOString() })
      .eq('id', id).select().single()
    return { data, error: error?.message || null }
  },

  rejectMaterial: async (id) => {
    const { data, error } = await supabase
      .from('event_materials')
      .update({ stato: 'rifiutato' })
      .eq('id', id).select().single()
    return { data, error: error?.message || null }
  },

  // Conflict detection
  checkConflict: async (materialId, startDate, endDate, excludeRequestId) => {
    let query = supabase
      .from('event_materials')
      .select('*, event:events(titolo, data_inizio, data_fine)')
      .eq('material_id', materialId)
      .neq('stato', 'rifiutato')
      .lte('data_inizio_utilizzo', endDate)
      .gte('data_fine_utilizzo', startDate)

    if (excludeRequestId) query = query.neq('id', excludeRequestId)

    const { data } = await query
    return data || []
  },

  // Movements
  fetchMovements: async (materialId) => {
    const { data, error } = await supabase
      .from('material_movements')
      .select('*, responsabile:users!material_movements_responsabile_id_fkey(nome, cognome), event:events(titolo)')
      .eq('material_id', materialId)
      .order('data_movimento', { ascending: false })
    return { data: data || [], error: error?.message || null }
  },

  fetchEventMovements: async (eventId) => {
    const { data, error } = await supabase
      .from('material_movements')
      .select('*, material:materials(nome, codice_inventario), responsabile:users!material_movements_responsabile_id_fkey(nome, cognome)')
      .eq('event_id', eventId)
      .order('data_movimento', { ascending: false })
    return { data: data || [], error: error?.message || null }
  },

  createMovement: async (movement) => {
    const { data, error } = await supabase
      .from('material_movements').insert(movement).select().single()
    if (!error) get().fetchMaterials()
    return { data, error: error?.message || null }
  },
}))
```

- [ ] **Step 3: Create useGadgets store**

`src/hooks/useGadgets.js`:
```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useGadgetsStore = create((set, get) => ({
  gadgets: [],
  loading: false,
  error: null,

  fetchGadgets: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('gadgets').select('*').eq('attivo', true).order('nome')
    set({ gadgets: data || [], loading: false, error: error?.message || null })
  },

  fetchEventGadgets: async (eventId) => {
    const { data, error } = await supabase
      .from('event_gadgets')
      .select('*, gadget:gadgets(id, nome, quantita_disponibile, soglia_minima)')
      .eq('event_id', eventId)
    return { data: data || [], error: error?.message || null }
  },

  requestGadget: async (request) => {
    const { data, error } = await supabase
      .from('event_gadgets').insert(request).select().single()
    return { data, error: error?.message || null }
  },

  updateGadgetRequest: async (id, updates) => {
    const { data, error } = await supabase
      .from('event_gadgets').update(updates).eq('id', id).select().single()
    return { data, error: error?.message || null }
  },
}))
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.js src/hooks/useMaterials.js src/hooks/useGadgets.js
git commit -m "feat: add material/gadget stores and constants"
```

---

## Task 3.2: Material UI components

**Files:**
- Create: `src/components/materiale/MaterialCard.jsx`, `src/components/materiale/MaterialFilters.jsx`, `src/components/materiale/ConflictAlert.jsx`

- [ ] **Step 1: Create MaterialCard**

`src/components/materiale/MaterialCard.jsx`:
```jsx
import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE } from '../../lib/constants'

export function MaterialCard({ material, linkTo }) {
  const Wrapper = linkTo ? Link : 'div'
  const wrapperProps = linkTo ? { to: linkTo } : {}

  return (
    <Wrapper
      {...wrapperProps}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">{material.nome}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {material.codice_inventario && `${material.codice_inventario} \u00B7 `}
            {TIPO_MATERIALE[material.tipo]}
          </p>
        </div>
        <StatusBadge
          stato={material.posizione_attuale}
          labels={POSIZIONE_MATERIALE}
          colors={POSIZIONE_MATERIALE_COLORE}
        />
      </div>
      {material.note && (
        <p className="mt-2 text-sm text-gray-400 truncate">{material.note}</p>
      )}
    </Wrapper>
  )
}
```

- [ ] **Step 2: Create MaterialFilters**

`src/components/materiale/MaterialFilters.jsx`:
```jsx
import { SearchInput } from '../ui/SearchInput'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE } from '../../lib/constants'
import { useMaterialsStore } from '../../hooks/useMaterials'

export function MaterialFilters() {
  const filters = useMaterialsStore(s => s.filters)
  const setFilter = useMaterialsStore(s => s.setFilter)
  const resetFilters = useMaterialsStore(s => s.resetFilters)

  const hasFilters = filters.search || filters.tipo || filters.posizione

  return (
    <div className="space-y-3 px-6 md:px-8">
      <SearchInput
        value={filters.search}
        onChange={(v) => setFilter('search', v)}
        placeholder="Cerca materiale..."
      />
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.tipo}
          onChange={(e) => setFilter('tipo', e.target.value)}
          className="px-4 py-2.5 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
          aria-label="Filtra per tipo"
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(TIPO_MATERIALE).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filters.posizione}
          onChange={(e) => setFilter('posizione', e.target.value)}
          className="px-4 py-2.5 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
          aria-label="Filtra per posizione"
        >
          <option value="">Tutte le posizioni</option>
          {Object.entries(POSIZIONE_MATERIALE).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {hasFilters && (
          <button onClick={resetFilters} className="px-4 py-2.5 text-base text-mikai-400 hover:text-mikai-500 min-h-[48px] font-medium">
            Azzera filtri
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create ConflictAlert**

`src/components/materiale/ConflictAlert.jsx`:
```jsx
import { formatDateRange } from '../../lib/date-utils'

export function ConflictAlert({ conflicts }) {
  if (!conflicts || conflicts.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{'\u26A0\uFE0F'}</span>
        <span className="text-base font-semibold text-red-800">
          Attenzione: materiale gi\u00E0 prenotato!
        </span>
      </div>
      {conflicts.map((c) => (
        <p key={c.id} className="text-base text-red-700 ml-8">
          {c.event?.titolo || 'Evento'} ({formatDateRange(c.data_inizio_utilizzo, c.data_fine_utilizzo)})
        </p>
      ))}
      <p className="text-sm text-red-600 ml-8">
        Scegli date diverse o un materiale alternativo.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/materiale/
git commit -m "feat: add MaterialCard, MaterialFilters, ConflictAlert"
```

---

## Task 3.3: Material request + movement forms

**Files:**
- Create: `src/components/materiale/MaterialRequestForm.jsx`, `src/components/materiale/MaterialMovementForm.jsx`, `src/components/materiale/MovementHistory.jsx`, `src/components/materiale/GadgetCard.jsx`, `src/components/materiale/GadgetRequestForm.jsx`

- [ ] **Step 1: Create MaterialRequestForm**

`src/components/materiale/MaterialRequestForm.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import { ConflictAlert } from './ConflictAlert'
import { useToastStore } from '../ui/Toast'

export function MaterialRequestForm({ eventId, onDone }) {
  const [materialId, setMaterialId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [note, setNote] = useState('')
  const [conflicts, setConflicts] = useState([])
  const [loading, setLoading] = useState(false)

  const materials = useMaterialsStore(s => s.materials)
  const fetchMaterials = useMaterialsStore(s => s.fetchMaterials)
  const checkConflict = useMaterialsStore(s => s.checkConflict)
  const requestMaterial = useMaterialsStore(s => s.requestMaterial)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  useEffect(() => { fetchMaterials() }, [])

  useEffect(() => {
    if (materialId && startDate && endDate) {
      checkConflict(materialId, startDate, endDate).then(setConflicts)
    } else {
      setConflicts([])
    }
  }, [materialId, startDate, endDate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (conflicts.length > 0) return
    setLoading(true)
    const { error } = await requestMaterial({
      event_id: eventId,
      material_id: materialId,
      quantita_richiesta: 1,
      data_inizio_utilizzo: startDate,
      data_fine_utilizzo: endDate,
      richiesto_da: user.id,
      note: note || null,
    })
    setLoading(false)
    if (error) addToast(error, 'error')
    else { addToast('Materiale richiesto!', 'success'); onDone?.() }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-900">Richiedi materiale</h3>

      <div>
        <label className="block text-base font-medium text-gray-700 mb-1">
          Materiale <span className="text-red-500">*</span>
        </label>
        <select
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          required
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
        >
          <option value="">Seleziona materiale...</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.nome} ({m.codice_inventario})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DatePicker label="Da" value={startDate} onChange={setStartDate} required />
        <DatePicker label="A" value={endDate} onChange={setEndDate} min={startDate} required />
      </div>

      <ConflictAlert conflicts={conflicts} />

      <div>
        <label className="block text-base font-medium text-gray-700 mb-1">
          Note <span className="text-gray-400">(facoltativo)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[80px] focus:ring-2 focus:ring-mikai-400"
          placeholder="Es: Serve anche il supporto per monitor"
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onDone}>Annulla</Button>
        <Button type="submit" loading={loading} disabled={conflicts.length > 0 || !materialId || !startDate || !endDate}>
          Richiedi
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create MaterialMovementForm**

`src/components/materiale/MaterialMovementForm.jsx`:
```jsx
import { useState } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import { useToastStore } from '../ui/Toast'
import { MODALITA_MOVIMENTO } from '../../lib/constants'

export function MaterialMovementForm({ materialId, eventId, tipo = 'uscita', onDone }) {
  const [modalita, setModalita] = useState('')
  const [aPos, setAPos] = useState(tipo === 'rientro' ? 'magazzino' : 'evento')
  const [tracking, setTracking] = useState('')
  const [rientro, setRientro] = useState('')
  const [statoRientro, setStatoRientro] = useState('')
  const [noteDanni, setNoteDanni] = useState('')
  const [loading, setLoading] = useState(false)

  const createMovement = useMaterialsStore(s => s.createMovement)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const movement = {
      material_id: materialId,
      event_id: eventId || null,
      tipo,
      modalita,
      a_posizione: aPos,
      da_posizione: tipo === 'rientro' ? 'evento' : 'magazzino',
      data_movimento: new Date().toISOString(),
      data_rientro_prevista: rientro || null,
      responsabile_id: user.id,
      tracking_spedizione: tracking || null,
      stato_rientro: tipo === 'rientro' ? statoRientro : null,
      note_danni: noteDanni || null,
    }
    const { error } = await createMovement(movement)
    setLoading(false)
    if (error) addToast(error, 'error')
    else {
      addToast(tipo === 'rientro' ? 'Rientro registrato!' : 'Movimento registrato!', 'success')
      onDone?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-900">
        {tipo === 'uscita' ? 'Registra uscita' : tipo === 'rientro' ? 'Registra rientro' : 'Registra trasferimento'}
      </h3>

      <div>
        <label className="block text-base font-medium text-gray-700 mb-1">Modalit\u00E0 <span className="text-red-500">*</span></label>
        <select value={modalita} onChange={(e) => setModalita(e.target.value)} required
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400">
          <option value="">Seleziona...</option>
          {Object.entries(MODALITA_MOVIMENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {tipo === 'uscita' && (
        <DatePicker label="Rientro previsto" value={rientro} onChange={setRientro} />
      )}

      {modalita === 'spedizione' && (
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">Tracking spedizione</label>
          <input type="text" value={tracking} onChange={(e) => setTracking(e.target.value)}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
            placeholder="Numero tracking..." />
        </div>
      )}

      {tipo === 'rientro' && (
        <>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">Stato rientro <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-3">
              {[['integro', 'Integro', 'green'], ['parziale', 'Parziale', 'yellow'], ['danneggiato', 'Danneggiato', 'red']].map(([val, label, color]) => (
                <button key={val} type="button" onClick={() => setStatoRientro(val)}
                  className={`px-5 py-3 rounded-xl border-2 text-base font-medium min-h-[48px] transition-all ${
                    statoRientro === val ? `border-${color}-400 bg-${color}-50 text-${color}-800` : 'border-gray-200 text-gray-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {statoRientro === 'danneggiato' && (
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">Descrizione danni <span className="text-red-500">*</span></label>
              <textarea value={noteDanni} onChange={(e) => setNoteDanni(e.target.value)} required
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[80px] focus:ring-2 focus:ring-mikai-400"
                placeholder="Descrivi i danni..." />
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onDone}>Annulla</Button>
        <Button type="submit" loading={loading} disabled={!modalita || (tipo === 'rientro' && !statoRientro)}>
          Registra
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create MovementHistory**

`src/components/materiale/MovementHistory.jsx`:
```jsx
import { STATO_MOVIMENTO, MODALITA_MOVIMENTO, STATO_RIENTRO } from '../../lib/constants'
import { formatDateTime } from '../../lib/date-utils'

export function MovementHistory({ movements }) {
  if (!movements || movements.length === 0) {
    return <p className="text-base text-gray-400 py-4">Nessun movimento registrato.</p>
  }

  return (
    <div className="space-y-3">
      {movements.map((m) => (
        <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-base font-medium ${m.tipo === 'uscita' ? 'text-red-700' : m.tipo === 'rientro' ? 'text-green-700' : 'text-blue-700'}`}>
              {STATO_MOVIMENTO[m.tipo]}
            </span>
            <span className="text-sm text-gray-400">{formatDateTime(m.data_movimento)}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {MODALITA_MOVIMENTO[m.modalita]}
            {m.event?.titolo && ` \u2014 ${m.event.titolo}`}
            {m.material?.nome && ` \u2014 ${m.material.nome}`}
          </p>
          <p className="text-sm text-gray-500">
            {m.da_posizione && `Da: ${m.da_posizione}`} {m.a_posizione && `\u2192 ${m.a_posizione}`}
          </p>
          {m.responsabile && (
            <p className="text-sm text-gray-400 mt-1">Resp: {m.responsabile.nome} {m.responsabile.cognome}</p>
          )}
          {m.tracking_spedizione && <p className="text-sm text-gray-400">Tracking: {m.tracking_spedizione}</p>}
          {m.stato_rientro && (
            <p className={`text-sm font-medium mt-1 ${m.stato_rientro === 'integro' ? 'text-green-600' : m.stato_rientro === 'danneggiato' ? 'text-red-600' : 'text-yellow-600'}`}>
              Rientro: {STATO_RIENTRO[m.stato_rientro]}
            </p>
          )}
          {m.note_danni && <p className="text-sm text-red-500">{m.note_danni}</p>}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create GadgetCard and GadgetRequestForm**

`src/components/materiale/GadgetCard.jsx`:
```jsx
import { STATO_GADGET_RICHIESTA } from '../../lib/constants'

export function GadgetCard({ gadget, eventGadget }) {
  const lowStock = gadget.quantita_disponibile <= gadget.soglia_minima

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-base font-medium text-gray-900">{gadget.nome}</h4>
          <p className="text-sm text-gray-500">
            Disponibili: <span className={lowStock ? 'text-red-600 font-semibold' : ''}>{gadget.quantita_disponibile}</span>
            {lowStock && ' \u26A0\uFE0F Scorta bassa'}
          </p>
        </div>
        {eventGadget && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            eventGadget.stato === 'consegnato' ? 'bg-green-100 text-green-800' :
            eventGadget.stato === 'pronto' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {STATO_GADGET_RICHIESTA[eventGadget.stato]}
          </span>
        )}
      </div>
      {eventGadget && (
        <p className="text-sm text-gray-600 mt-2">
          Richiesti: {eventGadget.quantita_richiesta}
          {eventGadget.quantita_consegnata > 0 && ` \u00B7 Consegnati: ${eventGadget.quantita_consegnata}`}
        </p>
      )}
    </div>
  )
}
```

`src/components/materiale/GadgetRequestForm.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useGadgetsStore } from '../../hooks/useGadgets'
import { Button } from '../ui/Button'
import { useToastStore } from '../ui/Toast'

export function GadgetRequestForm({ eventId, onDone }) {
  const [gadgetId, setGadgetId] = useState('')
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)

  const gadgets = useGadgetsStore(s => s.gadgets)
  const fetchGadgets = useGadgetsStore(s => s.fetchGadgets)
  const requestGadget = useGadgetsStore(s => s.requestGadget)
  const addToast = useToastStore(s => s.add)

  useEffect(() => { fetchGadgets() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await requestGadget({
      event_id: eventId,
      gadget_id: gadgetId,
      quantita_richiesta: qty,
    })
    setLoading(false)
    if (error) addToast(error, 'error')
    else { addToast('Gadget richiesto!', 'success'); onDone?.() }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-900">Richiedi gadget</h3>
      <div>
        <label className="block text-base font-medium text-gray-700 mb-1">Gadget <span className="text-red-500">*</span></label>
        <select value={gadgetId} onChange={(e) => setGadgetId(e.target.value)} required
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400">
          <option value="">Seleziona...</option>
          {gadgets.map((g) => (
            <option key={g.id} value={g.id}>{g.nome} (disp: {g.quantita_disponibile})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-base font-medium text-gray-700 mb-1">Quantit\u00E0 <span className="text-red-500">*</span></label>
        <input type="number" min="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)}
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400" />
      </div>
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onDone}>Annulla</Button>
        <Button type="submit" loading={loading} disabled={!gadgetId}>Richiedi</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/materiale/
git commit -m "feat: add material request, movement, gadget forms"
```

---

## Task 3.4: EventMaterialsTab (event detail tab)

**Files:**
- Create: `src/components/eventi/EventMaterialsTab.jsx`
- Modify: `src/pages/eventi/EventiDetail.jsx`

- [ ] **Step 1: Create EventMaterialsTab**

`src/components/eventi/EventMaterialsTab.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useGadgetsStore } from '../../hooks/useGadgets'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { useToastStore } from '../ui/Toast'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { MaterialRequestForm } from '../materiale/MaterialRequestForm'
import { MaterialMovementForm } from '../materiale/MaterialMovementForm'
import { GadgetRequestForm } from '../materiale/GadgetRequestForm'
import { GadgetCard } from '../materiale/GadgetCard'
import { MovementHistory } from '../materiale/MovementHistory'
import { ConflictAlert } from '../materiale/ConflictAlert'
import { STATO_MATERIALE_RICHIESTA, TIPO_MATERIALE, POSIZIONE_MATERIALE } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'

export function EventMaterialsTab({ event }) {
  const [eventMaterials, setEventMaterials] = useState([])
  const [eventGadgets, setEventGadgets] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showGadgetForm, setShowGadgetForm] = useState(false)
  const [showMovement, setShowMovement] = useState(null)

  const fetchEventMaterials = useMaterialsStore(s => s.fetchEventMaterials)
  const fetchEventMovements = useMaterialsStore(s => s.fetchEventMovements)
  const approveMaterial = useMaterialsStore(s => s.approveMaterial)
  const rejectMaterial = useMaterialsStore(s => s.rejectMaterial)
  const fetchEventGadgets = useGadgetsStore(s => s.fetchEventGadgets)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const loadData = async () => {
    setLoading(true)
    const [mats, movs, gads] = await Promise.all([
      fetchEventMaterials(event.id),
      fetchEventMovements(event.id),
      fetchEventGadgets(event.id),
    ])
    setEventMaterials(mats.data)
    setMovements(movs.data)
    setEventGadgets(gads.data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [event.id])

  const handleApprove = async (id) => {
    const { error } = await approveMaterial(id, user.id)
    if (error) addToast(error, 'error')
    else { addToast('Materiale approvato!', 'success'); loadData() }
  }

  const handleReject = async (id) => {
    const { error } = await rejectMaterial(id)
    if (error) addToast(error, 'error')
    else { addToast('Richiesta rifiutata', 'success'); loadData() }
  }

  if (loading) return <LoadingSkeleton lines={5} />

  return (
    <div className="space-y-8">
      {/* Material requests section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Materiale demo</h2>
          {!showRequestForm && (
            <Button onClick={() => setShowRequestForm(true)}>+ Richiedi materiale</Button>
          )}
        </div>

        {showRequestForm && (
          <MaterialRequestForm eventId={event.id} onDone={() => { setShowRequestForm(false); loadData() }} />
        )}

        {eventMaterials.length === 0 ? (
          <EmptyState title="Nessun materiale richiesto" description="Richiedi il materiale demo necessario per questo evento." />
        ) : (
          <div className="space-y-3">
            {eventMaterials.map((em) => (
              <div key={em.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-medium text-gray-900">
                      {em.material?.nome || 'Materiale'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {em.material?.codice_inventario} \u00B7 {TIPO_MATERIALE[em.material?.tipo]}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Periodo: {formatDateRange(em.data_inizio_utilizzo, em.data_fine_utilizzo)}
                    </p>
                    {em.material?.posizione_attuale && (
                      <p className="text-sm text-gray-400">
                        Posizione attuale: {POSIZIONE_MATERIALE[em.material.posizione_attuale]}
                      </p>
                    )}
                    {em.note && <p className="text-sm text-gray-400 mt-1">{em.note}</p>}
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                    em.stato === 'approvato' ? 'bg-green-100 text-green-800' :
                    em.stato === 'rifiutato' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {STATO_MATERIALE_RICHIESTA[em.stato]}
                  </span>
                </div>

                {em.stato === 'richiesto' && hasPermission('approva_materiale') && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                    <Button size="sm" onClick={() => handleApprove(em.id)}>Approva</Button>
                    <Button size="sm" variant="danger" onClick={() => handleReject(em.id)}>Rifiuta</Button>
                  </div>
                )}

                {em.stato === 'approvato' && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                    {showMovement === em.id ? (
                      <MaterialMovementForm
                        materialId={em.material_id}
                        eventId={event.id}
                        tipo="uscita"
                        onDone={() => { setShowMovement(null); loadData() }}
                      />
                    ) : (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setShowMovement(em.id)}>
                          Registra uscita
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Gadgets section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Gadget</h2>
          {!showGadgetForm && (
            <Button variant="secondary" onClick={() => setShowGadgetForm(true)}>+ Richiedi gadget</Button>
          )}
        </div>

        {showGadgetForm && (
          <GadgetRequestForm eventId={event.id} onDone={() => { setShowGadgetForm(false); loadData() }} />
        )}

        {eventGadgets.length === 0 ? (
          <EmptyState title="Nessun gadget richiesto" />
        ) : (
          <div className="space-y-3">
            {eventGadgets.map((eg) => (
              <GadgetCard key={eg.id} gadget={eg.gadget} eventGadget={eg} />
            ))}
          </div>
        )}
      </section>

      {/* Movement history */}
      {movements.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Movimenti materiale</h2>
          <MovementHistory movements={movements} />
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire EventMaterialsTab into EventiDetail.jsx**

In `src/pages/eventi/EventiDetail.jsx`, add import and replace placeholder:

```jsx
// Add import:
import { EventMaterialsTab } from '../../components/eventi/EventMaterialsTab'

// Replace:
{activeTab === 'materiale' && <PlaceholderTab name="Materiale & Gadget" />}
// With:
{activeTab === 'materiale' && <EventMaterialsTab event={event} />}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/EventMaterialsTab.jsx src/pages/eventi/EventiDetail.jsx
git commit -m "feat: add Materiale & Gadget tab in event detail"
```

---

## Task 3.5: Top-level materials pages

**Files:**
- Create: `src/pages/materiale/MaterialeList.jsx`, `src/pages/materiale/MaterialeDetail.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create MaterialeList page**

`src/pages/materiale/MaterialeList.jsx`:
```jsx
import { useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { MaterialCard } from '../../components/materiale/MaterialCard'
import { MaterialFilters } from '../../components/materiale/MaterialFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Breadcrumb } from '../../components/layout/Breadcrumb'

export function MaterialeList() {
  const materials = useMaterialsStore(s => s.materials)
  const loading = useMaterialsStore(s => s.loading)
  const fetchMaterials = useMaterialsStore(s => s.fetchMaterials)

  useEffect(() => { fetchMaterials() }, [])

  const inMagazzino = materials.filter(m => m.posizione_attuale === 'magazzino').length
  const fuori = materials.filter(m => m.posizione_attuale !== 'magazzino').length

  return (
    <div>
      <div className="px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Materiale & Gadget' }]} />
      </div>
      <PageHeader
        title="Materiale & Gadget"
        subtitle={`${inMagazzino} in magazzino \u00B7 ${fuori} fuori sede`}
      />
      <MaterialFilters />
      <div className="px-6 md:px-8 py-4">
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : materials.length === 0 ? (
          <EmptyState title="Nessun materiale trovato" description="Prova a cambiare i filtri." />
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <MaterialCard key={m.id} material={m} linkTo={`/materiale/${m.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create MaterialeDetail page**

`src/pages/materiale/MaterialeDetail.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { MaterialMovementForm } from '../../components/materiale/MaterialMovementForm'
import { MovementHistory } from '../../components/materiale/MovementHistory'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE } from '../../lib/constants'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { POSIZIONE_MATERIALE_COLORE } from '../../lib/constants'

export function MaterialeDetail() {
  const { id } = useParams()
  const fetchMaterial = useMaterialsStore(s => s.fetchMaterial)
  const fetchMovements = useMaterialsStore(s => s.fetchMovements)
  const [material, setMaterial] = useState(null)
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMovement, setShowMovement] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const [matRes, movRes] = await Promise.all([
      fetchMaterial(id),
      fetchMovements(id),
    ])
    setMaterial(matRes.data)
    setMovements(movRes.data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  if (loading) return <LoadingSkeleton lines={8} />
  if (!material) return <EmptyState title="Materiale non trovato" />

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[
          { label: 'Materiale & Gadget', to: '/materiale' },
          { label: material.nome },
        ]} />
      </div>
      <MobileHeader title={material.nome} subtitle={material.codice_inventario} />

      <div className="hidden md:block px-8 pt-5">
        <h1 className="text-2xl font-bold text-gray-900">{material.nome}</h1>
        <p className="mt-1 text-base text-gray-500">{material.codice_inventario}</p>
      </div>

      <div className="px-4 md:px-8 py-5 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base text-gray-500">Tipo</span>
            <span className="text-base font-medium">{TIPO_MATERIALE[material.tipo]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base text-gray-500">Posizione</span>
            <StatusBadge stato={material.posizione_attuale} labels={POSIZIONE_MATERIALE} colors={POSIZIONE_MATERIALE_COLORE} />
          </div>
          {material.posizione_dettaglio && (
            <div className="flex items-center justify-between">
              <span className="text-base text-gray-500">Dettaglio</span>
              <span className="text-base">{material.posizione_dettaglio}</span>
            </div>
          )}
          {material.note && (
            <div>
              <span className="text-base text-gray-500">Note</span>
              <p className="text-base mt-0.5">{material.note}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setShowMovement('uscita')}>Registra uscita</Button>
          <Button variant="secondary" onClick={() => setShowMovement('rientro')}>Registra rientro</Button>
        </div>

        {showMovement && (
          <MaterialMovementForm
            materialId={material.id}
            tipo={showMovement}
            onDone={() => { setShowMovement(null); loadData() }}
          />
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Storico movimenti</h2>
          <MovementHistory movements={movements} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add routes in App.jsx**

```jsx
// Add imports:
import { MaterialeList } from './pages/materiale/MaterialeList'
import { MaterialeDetail } from './pages/materiale/MaterialeDetail'

// Add routes inside protected layout:
<Route path="/materiale" element={<MaterialeList />} />
<Route path="/materiale/:id" element={<MaterialeDetail />} />
```

- [ ] **Step 4: Verify build and full flow**

```bash
npx vite build
```

Test: navigate to /materiale, see inventory list. Click a material, see detail with movement history. Open an event detail, go to "Materiale & Gadget" tab, request material, see conflict detection.

- [ ] **Step 5: Commit**

```bash
git add src/pages/materiale/ src/App.jsx
git commit -m "feat: add materials inventory pages and event detail routing"
```

---

## Phase 3 Summary

| Component | What it delivers |
|-----------|-----------------|
| useMaterials store | Materials CRUD, event material requests, conflict detection, movements |
| useGadgets store | Gadgets CRUD, event gadget requests |
| MaterialeList | Top-level inventory page with filters |
| MaterialeDetail | Single material view with movement history |
| EventMaterialsTab | "Materiale & Gadget" tab in event detail |
| 8 material components | Card, Filters, RequestForm, MovementForm, MovementHistory, ConflictAlert, GadgetCard, GadgetRequestForm |

**Total new files:** 15

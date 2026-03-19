# Mikai Eventi — Phase 2: Core UI Eventi

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete event management UI — list, detail, creation wizard, calendar view — with role-based visibility, 2-level approval, and elderly-proof UX.

**Architecture:** Page components fetch data via Supabase JS client, store list state in Zustand, use React Hook Form for the creation wizard. Role-based visibility is enforced by RLS at the DB level; the UI adapts what it shows (tabs, actions) based on `useAuthStore` profile/permissions. All UI follows spec section 10 (elderly-proof: 48px targets, 16px min font, Italian labels, semafori).

**Tech Stack:** React 19, React Router v7, Zustand, React Hook Form, date-fns, Supabase JS, TailwindCSS v4

**Spec:** `docs/superpowers/specs/2026-03-17-eventi-mikai-design.md`

**Depends on:** Phase 1 (complete) — scaffold, DB schema, auth, base UI/layout components

---

## File Structure

```
src/
  hooks/
    useEvents.js              # Zustand store: events list, filters, CRUD operations
  pages/
    eventi/
      EventiList.jsx          # Event list with filters + search
      EventiDetail.jsx        # Event detail with tabs
      EventiWizard.jsx        # 4-step creation wizard
      EventiCalendar.jsx      # Monthly calendar view
  components/
    eventi/
      EventCard.jsx           # Card for list view (title, date, location, status)
      EventFilters.jsx        # Filter bar (stato, tipo, date range, search)
      EventInfoTab.jsx        # Info tab content (detail view)
      EventStatusFlow.jsx     # Visual status stepper/timeline
      EventApprovalBar.jsx    # Approval actions bar (approve/reject)
      WizardStepIndicator.jsx # Progress indicator (step 1-4)
      WizardStepTipo.jsx      # Step 1: event type selection (cards)
      WizardStepDove.jsx      # Step 2: title, dates, location
      WizardStepModalita.jsx  # Step 3: modalita selection (cards)
      WizardStepRiepilogo.jsx # Step 4: summary + submit
      CalendarGrid.jsx        # Monthly calendar grid
      CalendarEventPill.jsx   # Event pill inside calendar day
    ui/
      DatePicker.jsx          # Visual date picker (Italian locale)
      SearchInput.jsx         # Search input with debounce
      Tabs.jsx                # Horizontal scrollable tabs
      PageHeader.jsx          # Page title + subtitle + actions
```

**Note:** Add `TIPO_EVENTO_ICON` to `src/lib/constants.js` to avoid duplication across components.

---

## Task 2.1: Events Zustand store (useEvents)

**Files:**
- Create: `src/hooks/useEvents.js`

- [ ] **Step 1: Create events store with list, filters, and CRUD**

`src/hooks/useEvents.js`:
```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useEventsStore = create((set, get) => ({
  events: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    stato: '',
    tipo: '',
    mese: null, // { year, month } for calendar
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value } }))
    get().fetchEvents()
  },

  resetFilters: () => {
    set({ filters: { search: '', stato: '', tipo: '', mese: null } })
    get().fetchEvents()
  },

  fetchEvents: async () => {
    set({ loading: true, error: null })
    let query = supabase
      .from('events')
      .select('*, promotore:users!events_promotore_id_fkey(nome, cognome), manager:users!events_manager_user_id_fkey(nome, cognome)')
      .order('data_inizio', { ascending: false })

    const { search, stato, tipo, mese } = get().filters
    if (stato) query = query.eq('stato', stato)
    if (tipo) query = query.eq('tipo_evento', tipo)
    if (search) query = query.ilike('titolo', `%${search}%`)
    if (mese) {
      const startDate = `${mese.year}-${String(mese.month).padStart(2, '0')}-01`
      const endMonth = mese.month === 12 ? 1 : mese.month + 1
      const endYear = mese.month === 12 ? mese.year + 1 : mese.year
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
      query = query.or(`data_inizio.gte.${startDate},data_fine.gte.${startDate}`).lte('data_inizio', endDate)
    }

    const { data, error } = await query
    set({ events: data || [], loading: false, error: error?.message || null })
  },

  fetchEvent: async (id) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, promotore:users!events_promotore_id_fkey(id, nome, cognome, ruolo), manager:users!events_manager_user_id_fkey(id, nome, cognome)')
      .eq('id', id)
      .single()
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  },

  createEvent: async (eventData) => {
    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()
    if (!error) get().fetchEvents()
    return { data, error: error?.message || null }
  },

  updateEvent: async (id, updates) => {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) get().fetchEvents()
    return { data, error: error?.message || null }
  },

  approveEvent: async (id) => {
    return get().updateEvent(id, { stato: 'confermato' })
  },

  // 2-level approval: check if area_manager can approve based on budget threshold
  canAreaManagerApprove: async (event) => {
    const { data: thresholds } = await supabase
      .from('approval_thresholds')
      .select('*')
      .or(`tipo_evento.eq.${event.tipo_evento},tipo_evento.is.null`)
      .order('tipo_evento', { ascending: false, nullsFirst: false })
    if (!thresholds?.length) return false
    const threshold = thresholds[0]
    if (!threshold.area_manager_can_approve) return false
    if (event.budget_previsto && Number(event.budget_previsto) > Number(threshold.soglia_importo)) return false
    return true
  },

  rejectEvent: async (id, motivo) => {
    return get().updateEvent(id, { stato: 'cancellato', motivo_cancellazione: motivo })
  },

  cancelEvent: async (id, motivo) => {
    return get().updateEvent(id, { stato: 'cancellato', motivo_cancellazione: motivo })
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useEvents.js
git commit -m "feat: add events Zustand store with CRUD and filters"
```

---

## Task 2.2: Shared UI components (Tabs, DatePicker, SearchInput, PageHeader)

**Files:**
- Create: `src/components/ui/Tabs.jsx`, `src/components/ui/DatePicker.jsx`, `src/components/ui/SearchInput.jsx`, `src/components/ui/PageHeader.jsx`

- [ ] **Step 1: Create Tabs component**

`src/components/ui/Tabs.jsx`:
```jsx
export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="border-b border-gray-200 overflow-x-auto">
      <nav className="flex gap-0 -mb-px" aria-label="Sezioni">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`whitespace-nowrap px-4 py-3 min-h-[48px] text-base font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-mikai-400 text-mikai-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Create SearchInput component**

`src/components/ui/SearchInput.jsx`:
```jsx
import { useState, useEffect } from 'react'

export function SearchInput({ value, onChange, placeholder = 'Cerca...', delay = 300 }) {
  const [local, setLocal] = useState(value)

  useEffect(() => { setLocal(value) }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local)
    }, delay)
    return () => clearTimeout(timer)
  }, [local, delay, value])

  return (
    <input
      type="search"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 min-h-[48px]"
      aria-label={placeholder}
    />
  )
}
```

- [ ] **Step 3: Create DatePicker component**

`src/components/ui/DatePicker.jsx`:
```jsx
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export function DatePicker({ label, value, onChange, required, min, max }) {
  return (
    <div>
      {label && (
        <label className="block text-base font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        min={min}
        max={max}
        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 min-h-[48px]"
      />
    </div>
  )
}
```

- [ ] **Step 4: Create PageHeader component**

`src/components/ui/PageHeader.jsx`:
```jsx
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="px-6 py-5 md:px-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-base text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-3">{actions}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Tabs.jsx src/components/ui/DatePicker.jsx src/components/ui/SearchInput.jsx src/components/ui/PageHeader.jsx
git commit -m "feat: add Tabs, DatePicker, SearchInput, PageHeader components"
```

---

## Task 2.3: Event card + filters components

**Files:**
- Create: `src/components/eventi/EventCard.jsx`, `src/components/eventi/EventFilters.jsx`

- [ ] **Step 1: Create EventCard component**

`src/components/eventi/EventCard.jsx`:
```jsx
import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { TIPO_EVENTO } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'

const tipoIcon = {
  workshop: '\u{1F3ED}',
  corso: '\u{1F393}',
  congresso: '\u{1F3E5}',
  convegno: '\u{1F4AC}',
  cadaver_lab: '\u{1FA7A}',
  live_surgery: '\u{1FA7A}',
}

export function EventCard({ event }) {
  return (
    <Link
      to={`/eventi/${event.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-mikai-300 transition-all min-h-[48px]"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5" aria-hidden="true">
          {tipoIcon[event.tipo_evento] || '\u{1F4C5}'}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {event.titolo}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDateRange(event.data_inizio, event.data_fine)}
            {event.luogo && ` \u00B7 ${event.luogo}`}
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusBadge stato={event.stato} />
            <span className="text-sm text-gray-400">
              {TIPO_EVENTO[event.tipo_evento]}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create EventFilters component**

`src/components/eventi/EventFilters.jsx`:
```jsx
import { SearchInput } from '../ui/SearchInput'
import { STATO_EVENTO, TIPO_EVENTO } from '../../lib/constants'
import { useEventsStore } from '../../hooks/useEvents'

export function EventFilters() {
  const filters = useEventsStore(s => s.filters)
  const setFilter = useEventsStore(s => s.setFilter)
  const resetFilters = useEventsStore(s => s.resetFilters)

  const hasFilters = filters.search || filters.stato || filters.tipo

  return (
    <div className="space-y-3 px-6 md:px-8">
      <SearchInput
        value={filters.search}
        onChange={(v) => setFilter('search', v)}
        placeholder="Cerca evento per nome..."
      />
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.stato}
          onChange={(e) => setFilter('stato', e.target.value)}
          className="px-4 py-2.5 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
          aria-label="Filtra per stato"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATO_EVENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filters.tipo}
          onChange={(e) => setFilter('tipo', e.target.value)}
          className="px-4 py-2.5 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
          aria-label="Filtra per tipo"
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(TIPO_EVENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="px-4 py-2.5 text-base text-mikai-400 hover:text-mikai-500 min-h-[48px] font-medium"
          >
            Azzera filtri
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/
git commit -m "feat: add EventCard and EventFilters components"
```

---

## Task 2.4: Events list page

**Files:**
- Create: `src/pages/eventi/EventiList.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create EventiList page**

`src/pages/eventi/EventiList.jsx`:
```jsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { EventCard } from '../../components/eventi/EventCard'
import { EventFilters } from '../../components/eventi/EventFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Breadcrumb } from '../../components/layout/Breadcrumb'

export function EventiList() {
  const events = useEventsStore(s => s.events)
  const loading = useEventsStore(s => s.loading)
  const error = useEventsStore(s => s.error)
  const fetchEvents = useEventsStore(s => s.fetchEvents)
  const profile = useAuthStore(s => s.profile)

  useEffect(() => { fetchEvents() }, [])

  return (
    <div>
      <div className="px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Eventi' }]} />
      </div>
      <PageHeader
        title="Eventi"
        subtitle={profile?.ruolo === 'commerciale' ? 'I tuoi eventi' : 'Tutti gli eventi'}
        actions={
          <Link to="/eventi/nuovo">
            <Button size="lg">+ Proponi nuovo evento</Button>
          </Link>
        }
      />
      <EventFilters />
      <div className="px-6 md:px-8 py-4">
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : error ? (
          <EmptyState
            title="Errore nel caricamento"
            description={error}
          />
        ) : events.length === 0 ? (
          <EmptyState
            title="Nessun evento trovato"
            description="Prova a cambiare i filtri o proponi un nuovo evento."
            action={
              <Link to="/eventi/nuovo">
                <Button>+ Proponi nuovo evento</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire EventiList into App.jsx routing**

In `src/App.jsx`, add the import and replace the placeholder route:

```jsx
// Add import at top:
import { EventiList } from './pages/eventi/EventiList'

// Replace:
<Route path="/eventi" element={<div className="p-8 text-lg">Eventi — In costruzione</div>} />
// With:
<Route path="/eventi" element={<EventiList />} />
```

- [ ] **Step 3: Verify events list page loads in browser**

Navigate to `http://localhost:5173/Eventi/eventi` — should show the list page with filters, empty state (or events if any exist), and "Proponi nuovo evento" button.

- [ ] **Step 4: Commit**

```bash
git add src/pages/eventi/EventiList.jsx src/App.jsx
git commit -m "feat: add events list page with filters and search"
```

---

## Task 2.5: Event status flow + approval bar components

**Files:**
- Create: `src/components/eventi/EventStatusFlow.jsx`, `src/components/eventi/EventApprovalBar.jsx`

- [ ] **Step 1: Create EventStatusFlow component**

`src/components/eventi/EventStatusFlow.jsx`:
```jsx
import { STATO_EVENTO } from '../../lib/constants'

const steps = ['proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso', 'concluso']

export function EventStatusFlow({ stato }) {
  if (stato === 'cancellato') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-lg">
        <span className="text-xl">{'\u{1F534}'}</span>
        <span className="text-base font-medium text-red-800">Evento annullato</span>
      </div>
    )
  }

  const currentIndex = steps.indexOf(stato)

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {steps.map((step, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={step} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`w-6 h-0.5 ${isDone ? 'bg-mikai-400' : 'bg-gray-200'}`} />
            )}
            <div className="flex flex-col items-center min-w-[64px]">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isDone
                    ? 'bg-mikai-400 text-white'
                    : isCurrent
                      ? 'bg-mikai-100 text-mikai-700 ring-2 ring-mikai-400'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? '\u2713' : i + 1}
              </div>
              <span className={`text-xs mt-1 text-center ${isCurrent ? 'font-semibold text-mikai-700' : 'text-gray-400'}`}>
                {STATO_EVENTO[step]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create EventApprovalBar component**

`src/components/eventi/EventApprovalBar.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'

export function EventApprovalBar({ event, onUpdate }) {
  const [showReject, setShowReject] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [canApproveThreshold, setCanApproveThreshold] = useState(false)
  const approveEvent = useEventsStore(s => s.approveEvent)
  const rejectEvent = useEventsStore(s => s.rejectEvent)
  const cancelEvent = useEventsStore(s => s.cancelEvent)
  const canAreaManagerApprove = useEventsStore(s => s.canAreaManagerApprove)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const hasRole = useAuthStore(s => s.hasRole)
  const addToast = useToastStore(s => s.add)

  // 2-level approval: area_manager can only approve under threshold
  useEffect(() => {
    if (event.stato === 'proposto' && hasPermission('approva_eventi')) {
      if (hasRole('area_manager')) {
        canAreaManagerApprove(event).then(setCanApproveThreshold)
      } else {
        setCanApproveThreshold(true) // direzione/admin can always approve
      }
    }
  }, [event.id, event.stato])

  const canApprove = hasPermission('approva_eventi') && event.stato === 'proposto' && canApproveThreshold
  const canCancel = hasPermission('approva_eventi') && !['concluso', 'cancellato'].includes(event.stato)

  if (!canApprove && !canCancel) return null

  const handleApprove = async () => {
    setLoading(true)
    const { error } = await approveEvent(event.id)
    setLoading(false)
    if (error) addToast(error, 'error')
    else { addToast('Evento approvato!', 'success'); onUpdate?.() }
  }

  const handleReject = async () => {
    if (!motivo.trim()) return
    setLoading(true)
    const { error } = await rejectEvent(event.id, motivo)
    setLoading(false)
    setShowReject(false)
    if (error) addToast(error, 'error')
    else { addToast('Evento rifiutato', 'success'); onUpdate?.() }
  }

  const handleCancel = async () => {
    if (!motivo.trim()) return
    setLoading(true)
    const { error } = await cancelEvent(event.id, motivo)
    setLoading(false)
    setShowReject(false)
    if (error) addToast(error, 'error')
    else { addToast('Evento annullato', 'success'); onUpdate?.() }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        {canApprove && (
          <>
            <Button onClick={handleApprove} loading={loading} size="lg">
              Approva evento
            </Button>
            <Button variant="danger" onClick={() => setShowReject(true)} size="lg">
              Rifiuta
            </Button>
          </>
        )}
        {canCancel && event.stato !== 'proposto' && (
          <Button variant="danger" onClick={() => setShowReject(true)} size="lg">
            Annulla evento
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={showReject}
        title={event.stato === 'proposto' ? 'Rifiuta evento' : 'Annulla evento'}
        message={
          <div className="space-y-3">
            <p>Inserisci il motivo:</p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[100px] focus:ring-2 focus:ring-mikai-400"
              placeholder="Motivo..."
              required
            />
          </div>
        }
        confirmLabel={event.stato === 'proposto' ? 'Rifiuta' : 'Annulla evento'}
        onConfirm={event.stato === 'proposto' ? handleReject : handleCancel}
        onCancel={() => { setShowReject(false); setMotivo('') }}
        danger
      />
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eventi/EventStatusFlow.jsx src/components/eventi/EventApprovalBar.jsx
git commit -m "feat: add event status flow and approval bar components"
```

---

## Task 2.6: Event info tab

**Files:**
- Create: `src/components/eventi/EventInfoTab.jsx`

- [ ] **Step 1: Create EventInfoTab component**

`src/components/eventi/EventInfoTab.jsx`:
```jsx
import { TIPO_EVENTO, MODALITA_EVENTO } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'
import { StatusBadge } from '../ui/StatusBadge'
import { EventStatusFlow } from './EventStatusFlow'
import { EventApprovalBar } from './EventApprovalBar'

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="py-3 border-b border-gray-100">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-base text-gray-900">{value}</dd>
    </div>
  )
}

export function EventInfoTab({ event, onUpdate }) {
  return (
    <div className="space-y-6">
      <EventApprovalBar event={event} onUpdate={onUpdate} />
      <EventStatusFlow stato={event.stato} />

      <dl className="divide-y divide-gray-100">
        <InfoRow label="Tipo evento" value={TIPO_EVENTO[event.tipo_evento]} />
        <InfoRow label="Modalita'" value={MODALITA_EVENTO[event.modalita]} />
        <InfoRow label="Date" value={formatDateRange(event.data_inizio, event.data_fine)} />
        <InfoRow label="Luogo" value={event.luogo} />
        <InfoRow label="Dettaglio sede" value={event.sede_dettaglio} />
        <InfoRow
          label="Promotore"
          value={event.promotore ? `${event.promotore.nome} ${event.promotore.cognome}` : null}
        />
        <InfoRow
          label="Area Manager"
          value={event.manager ? `${event.manager.nome} ${event.manager.cognome}` : null}
        />
        <InfoRow label="Desk richiesto" value={event.desk_richiesto ? 'Si' : 'No'} />
        {event.desk_richiesto && (
          <InfoRow label="N. postazioni" value={event.n_postazioni} />
        )}
        <InfoRow
          label="Budget previsto"
          value={event.budget_previsto ? `\u20AC ${Number(event.budget_previsto).toLocaleString('it-IT')}` : null}
        />
        <InfoRow label="Ricorrenza" value={event.ricorrenza} />
        <InfoRow label="Note" value={event.note} />
        {event.motivo_cancellazione && (
          <InfoRow label="Motivo annullamento" value={event.motivo_cancellazione} />
        )}
      </dl>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eventi/EventInfoTab.jsx
git commit -m "feat: add event info tab with status flow and approval"
```

---

## Task 2.7: Event detail page

**Files:**
- Create: `src/pages/eventi/EventiDetail.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create EventiDetail page**

`src/pages/eventi/EventiDetail.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { EventInfoTab } from '../../components/eventi/EventInfoTab'
import { TIPO_EVENTO } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'

function getVisibleTabs(event, profile, permissions) {
  const ruolo = profile?.ruolo
  const isUfficio = ['admin', 'direzione', 'ufficio'].includes(ruolo)
  const modalita = event.modalita

  const tabs = [{ id: 'info', label: 'Info' }]

  if (isUfficio && modalita !== 'contributo') {
    tabs.push({ id: 'staff', label: 'Staff' })
  }
  if (isUfficio && modalita === 'interno') {
    tabs.push({ id: 'partecipanti', label: 'Partecipanti' })
  }
  if (isUfficio && modalita !== 'contributo') {
    tabs.push({ id: 'materiale', label: 'Materiale & Gadget' })
  }
  if (isUfficio && (modalita === 'interno' || modalita === 'esterno')) {
    tabs.push({ id: 'subattivita', label: 'Sotto-attivita\'' })
    tabs.push({ id: 'logistica', label: 'Logistica' })
  }
  if (permissions.includes('gestione_costi')) {
    tabs.push({ id: 'costi', label: 'Costi' })
  }
  tabs.push({ id: 'documenti', label: 'Documenti' })
  tabs.push({ id: 'checklist', label: 'Lista attivita\'' })
  if (isUfficio) {
    tabs.push({ id: 'report', label: 'Report' })
  }

  return tabs
}

function PlaceholderTab({ name }) {
  return (
    <div className="py-12 text-center text-gray-400 text-base">
      {name} — In costruzione (Phase 3-5)
    </div>
  )
}

export function EventiDetail() {
  const { id } = useParams()
  const fetchEvent = useEventsStore(s => s.fetchEvent)
  const profile = useAuthStore(s => s.profile)
  const permissions = useAuthStore(s => s.permissions)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    setLoading(true)
    fetchEvent(id).then(({ data, error }) => {
      setEvent(data)
      setError(error)
      setLoading(false)
    })
  }, [id])

  if (loading) return <LoadingSkeleton lines={8} />
  if (error || !event) {
    return <EmptyState title="Evento non trovato" description={error || 'L\'evento richiesto non esiste o non hai accesso.'} />
  }

  const tabs = getVisibleTabs(event, profile, permissions)
  const subtitle = `${TIPO_EVENTO[event.tipo_evento]} \u00B7 ${formatDateRange(event.data_inizio, event.data_fine)}${event.luogo ? ` \u00B7 ${event.luogo}` : ''}`

  const refreshEvent = () => {
    fetchEvent(id).then(({ data }) => { if (data) setEvent(data) })
  }

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[
          { label: 'Eventi', to: '/eventi' },
          { label: event.titolo },
        ]} />
      </div>
      <MobileHeader title={event.titolo} subtitle={subtitle} />

      <div className="hidden md:block px-8 pt-5">
        <h1 className="text-2xl font-bold text-gray-900">{event.titolo}</h1>
        <p className="mt-1 text-base text-gray-500">{subtitle}</p>
      </div>

      <div className="mt-4 px-4 md:px-8">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-4 md:px-8 py-5">
        {activeTab === 'info' && <EventInfoTab event={event} onUpdate={refreshEvent} />}
        {activeTab === 'staff' && <PlaceholderTab name="Staff" />}
        {activeTab === 'partecipanti' && <PlaceholderTab name="Partecipanti" />}
        {activeTab === 'materiale' && <PlaceholderTab name="Materiale & Gadget" />}
        {activeTab === 'subattivita' && <PlaceholderTab name="Sotto-attivita'" />}
        {activeTab === 'logistica' && <PlaceholderTab name="Logistica" />}
        {activeTab === 'costi' && <PlaceholderTab name="Costi" />}
        {activeTab === 'documenti' && <PlaceholderTab name="Documenti" />}
        {activeTab === 'checklist' && <PlaceholderTab name="Lista attivita'" />}
        {activeTab === 'report' && <PlaceholderTab name="Report post-evento" />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add route in App.jsx**

```jsx
// Add import:
import { EventiDetail } from './pages/eventi/EventiDetail'

// Add route inside the protected layout, after /eventi:
<Route path="/eventi/:id" element={<EventiDetail />} />
```

- [ ] **Step 3: Verify detail page loads**

Navigate to list, click an event card — should show detail page with breadcrumb, tabs, info tab content.

- [ ] **Step 4: Commit**

```bash
git add src/pages/eventi/EventiDetail.jsx src/App.jsx
git commit -m "feat: add event detail page with tabs and info tab"
```

---

## Task 2.8: Wizard step components

**Files:**
- Create: `src/components/eventi/WizardStepIndicator.jsx`, `src/components/eventi/WizardStepTipo.jsx`, `src/components/eventi/WizardStepDove.jsx`, `src/components/eventi/WizardStepModalita.jsx`, `src/components/eventi/WizardStepRiepilogo.jsx`

- [ ] **Step 1: Create WizardStepIndicator**

`src/components/eventi/WizardStepIndicator.jsx`:
```jsx
const stepLabels = ['Tipo', 'Dove e quando', 'Modalita\'', 'Riepilogo']

export function WizardStepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {stepLabels.map((label, i) => {
        const isDone = i < current
        const isCurrent = i === current
        return (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`w-8 md:w-12 h-0.5 ${isDone ? 'bg-mikai-400' : 'bg-gray-200'}`} />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  isDone
                    ? 'bg-mikai-400 text-white'
                    : isCurrent
                      ? 'bg-mikai-100 text-mikai-700 ring-2 ring-mikai-400'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? '\u2713' : i + 1}
              </div>
              <span className={`text-xs mt-1 ${isCurrent ? 'font-semibold text-mikai-700' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create WizardStepTipo**

`src/components/eventi/WizardStepTipo.jsx`:
```jsx
import { TIPO_EVENTO } from '../../lib/constants'

const tipoIcon = {
  workshop: '\u{1F3ED}',
  corso: '\u{1F393}',
  congresso: '\u{1F3E5}',
  convegno: '\u{1F4AC}',
  cadaver_lab: '\u{1FA7A}',
  live_surgery: '\u{1FA7A}',
}

export function WizardStepTipo({ value, onChange }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Che tipo di evento?</h2>
      <p className="text-base text-gray-500 mb-6">Scegli il tipo di evento che vuoi proporre.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(TIPO_EVENTO).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex items-center gap-4 p-5 rounded-xl border-2 text-left min-h-[72px] transition-all ${
              value === key
                ? 'border-mikai-400 bg-mikai-50 text-mikai-700'
                : 'border-gray-200 hover:border-mikai-300 text-gray-700'
            }`}
          >
            <span className="text-3xl">{tipoIcon[key]}</span>
            <span className="text-lg font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create WizardStepDove**

`src/components/eventi/WizardStepDove.jsx`:
```jsx
import { DatePicker } from '../ui/DatePicker'

export function WizardStepDove({ data, onChange }) {
  const update = (field, value) => onChange({ ...data, [field]: value })

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

        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">
            Luogo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.luogo || ''}
            onChange={(e) => update('luogo', e.target.value)}
            placeholder="Es: Hotel Marriott, Milano"
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 min-h-[48px]"
            required
          />
        </div>

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
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create WizardStepModalita**

`src/components/eventi/WizardStepModalita.jsx`:
```jsx
import { MODALITA_EVENTO } from '../../lib/constants'

const modalitaIcon = {
  interno: '\u{1F3E2}',
  esterno: '\u{1F30D}',
  contributo: '\u{1F4B0}',
}

export function WizardStepModalita({ value, onChange }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Tipo di partecipazione?</h2>
      <p className="text-base text-gray-500 mb-6">Come partecipa Mikai a questo evento?</p>
      <div className="space-y-3">
        {Object.entries(MODALITA_EVENTO).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 text-left min-h-[72px] transition-all ${
              value === key
                ? 'border-mikai-400 bg-mikai-50 text-mikai-700'
                : 'border-gray-200 hover:border-mikai-300 text-gray-700'
            }`}
          >
            <span className="text-3xl">{modalitaIcon[key]}</span>
            <span className="text-lg font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create WizardStepRiepilogo**

`src/components/eventi/WizardStepRiepilogo.jsx`:
```jsx
import { TIPO_EVENTO, MODALITA_EVENTO } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'

export function WizardStepRiepilogo({ data }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Riepilogo</h2>
      <p className="text-base text-gray-500 mb-6">Controlla i dati prima di inviare la proposta.</p>

      <div className="bg-gray-50 rounded-xl p-5 space-y-3">
        <div>
          <span className="text-sm text-gray-500">Tipo evento</span>
          <p className="text-base font-medium text-gray-900">{TIPO_EVENTO[data.tipo_evento]}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Titolo</span>
          <p className="text-base font-medium text-gray-900">{data.titolo}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Date</span>
          <p className="text-base font-medium text-gray-900">
            {formatDateRange(data.data_inizio, data.data_fine)}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Luogo</span>
          <p className="text-base font-medium text-gray-900">
            {data.luogo}
            {data.sede_dettaglio && ` — ${data.sede_dettaglio}`}
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Modalita'</span>
          <p className="text-base font-medium text-gray-900">{MODALITA_EVENTO[data.modalita]}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/eventi/WizardStep*.jsx
git commit -m "feat: add wizard step components (tipo, dove, modalita, riepilogo, indicator)"
```

---

## Task 2.9: Event creation wizard page

**Files:**
- Create: `src/pages/eventi/EventiWizard.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create EventiWizard page**

`src/pages/eventi/EventiWizard.jsx`:
```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { WizardStepIndicator } from '../../components/eventi/WizardStepIndicator'
import { WizardStepTipo } from '../../components/eventi/WizardStepTipo'
import { WizardStepDove } from '../../components/eventi/WizardStepDove'
import { WizardStepModalita } from '../../components/eventi/WizardStepModalita'
import { WizardStepRiepilogo } from '../../components/eventi/WizardStepRiepilogo'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { Button } from '../../components/ui/Button'
import { useToastStore } from '../../components/ui/Toast'

export function EventiWizard() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    tipo_evento: '',
    titolo: '',
    data_inizio: '',
    data_fine: '',
    luogo: '',
    sede_dettaglio: '',
    modalita: '',
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const createEvent = useEventsStore(s => s.createEvent)
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const addToast = useToastStore(s => s.add)

  const canNext = () => {
    if (step === 0) return !!data.tipo_evento
    if (step === 1) return !!data.titolo && !!data.data_inizio && !!data.luogo
    if (step === 2) return !!data.modalita
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: created, error } = await createEvent({
      ...data,
      data_fine: data.data_fine || data.data_inizio,
      promotore_id: user.id,
      created_by: user.id,
      manager_user_id: profile?.responsabile_id || null,
      stato: 'proposto',
    })
    setLoading(false)
    if (error) {
      addToast(error, 'error')
    } else {
      addToast('Evento proposto!', 'success')
      navigate(`/eventi/${created.id}`)
    }
  }

  const stepLabels = ['Tipo', 'Dove e quando', 'Modalita\'', 'Riepilogo']

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Eventi', to: '/eventi' },
        { label: 'Nuova proposta' },
      ]} />
      <MobileHeader title="Nuova proposta" subtitle={`Passo ${step + 1} di 4 — ${stepLabels[step]}`} />

      <div className="hidden md:block px-8 pt-5">
        <h1 className="text-2xl font-bold text-gray-900">Nuova proposta evento</h1>
      </div>

      <div className="px-4 md:px-8">
        <WizardStepIndicator current={step} />
      </div>

      <div className="px-4 md:px-8 py-4 max-w-2xl">
        {step === 0 && (
          <WizardStepTipo
            value={data.tipo_evento}
            onChange={(v) => setData({ ...data, tipo_evento: v })}
          />
        )}
        {step === 1 && (
          <WizardStepDove
            data={data}
            onChange={(d) => setData({ ...data, ...d })}
          />
        )}
        {step === 2 && (
          <WizardStepModalita
            value={data.modalita}
            onChange={(v) => setData({ ...data, modalita: v })}
          />
        )}
        {step === 3 && <WizardStepRiepilogo data={data} />}
      </div>

      <div className="px-4 md:px-8 py-4 flex justify-between max-w-2xl">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(step - 1)} size="lg">
            {'\u2190'} Indietro
          </Button>
        ) : (
          <div />
        )}
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} size="lg">
            Avanti {'\u2192'}
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={loading} disabled={!canNext()} size="lg">
            Invia proposta
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add route in App.jsx**

```jsx
// Add import:
import { EventiWizard } from './pages/eventi/EventiWizard'

// Add route BEFORE /eventi/:id (order matters):
<Route path="/eventi/nuovo" element={<EventiWizard />} />
```

- [ ] **Step 3: Verify wizard flow in browser**

Navigate to `/eventi/nuovo`, complete all 4 steps, submit. Event should appear in list with status "proposto".

- [ ] **Step 4: Commit**

```bash
git add src/pages/eventi/EventiWizard.jsx src/App.jsx
git commit -m "feat: add 4-step event creation wizard"
```

---

## Task 2.10: Calendar view

**Files:**
- Create: `src/components/eventi/CalendarGrid.jsx`, `src/components/eventi/CalendarEventPill.jsx`, `src/pages/eventi/EventiCalendar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create CalendarEventPill**

`src/components/eventi/CalendarEventPill.jsx`:
```jsx
import { Link } from 'react-router-dom'
import { STATO_EVENTO_COLORE } from '../../lib/constants'

const pillColors = {
  yellow: 'bg-yellow-200 text-yellow-900',
  blue: 'bg-blue-200 text-blue-900',
  mikai: 'bg-mikai-200 text-mikai-800',
  green: 'bg-green-200 text-green-900',
  emerald: 'bg-emerald-200 text-emerald-900',
  gray: 'bg-gray-200 text-gray-700',
  red: 'bg-red-200 text-red-900',
}

export function CalendarEventPill({ event }) {
  const color = STATO_EVENTO_COLORE[event.stato] || 'gray'
  return (
    <Link
      to={`/eventi/${event.id}`}
      className={`block truncate px-2 py-0.5 rounded text-sm font-medium ${pillColors[color]} hover:opacity-80`}
      title={event.titolo}
    >
      {event.titolo}
    </Link>
  )
}
```

- [ ] **Step 2: Create CalendarGrid**

`src/components/eventi/CalendarGrid.jsx`:
```jsx
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, parseISO, isSameDay
} from 'date-fns'
import { it } from 'date-fns/locale'
import { CalendarEventPill } from './CalendarEventPill'

const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export function CalendarGrid({ date, events }) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const getEventsForDay = (day) => {
    return events.filter((e) => {
      const start = parseISO(e.data_inizio)
      const end = e.data_fine ? parseISO(e.data_fine) : start
      return day >= start && day <= end
    })
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
        {dayNames.map((d) => (
          <div key={d} className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-600">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day)
          const inMonth = isSameMonth(day, date)
          return (
            <div
              key={day.toISOString()}
              className={`bg-white min-h-[80px] md:min-h-[100px] p-1 ${!inMonth ? 'opacity-40' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'bg-mikai-400 text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-gray-700 px-1'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <CalendarEventPill key={e.id} event={e} />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-xs text-gray-400 px-1">+{dayEvents.length - 3} altri</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create EventiCalendar page**

`src/pages/eventi/EventiCalendar.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { addMonths, subMonths, format, getMonth, getYear } from 'date-fns'
import { it } from 'date-fns/locale'
import { useEventsStore } from '../../hooks/useEvents'
import { CalendarGrid } from '../../components/eventi/CalendarGrid'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { Link } from 'react-router-dom'

export function EventiCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const events = useEventsStore(s => s.events)
  const loading = useEventsStore(s => s.loading)
  const setFilter = useEventsStore(s => s.setFilter)

  useEffect(() => {
    setFilter('mese', { year: getYear(currentDate), month: getMonth(currentDate) + 1 })
  }, [currentDate])

  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: it })

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[
          { label: 'Eventi', to: '/eventi' },
          { label: 'Calendario' },
        ]} />
      </div>
      <PageHeader title="Calendario eventi" />

      <div className="px-4 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            {'\u2190'}
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 capitalize">{monthLabel}</h2>
          <Button variant="ghost" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            {'\u2192'}
          </Button>
        </div>

        {loading ? (
          <LoadingSkeleton lines={8} />
        ) : (
          <CalendarGrid date={currentDate} events={events} />
        )}

        <div className="mt-4 flex gap-3">
          <Link to="/eventi">
            <Button variant="secondary">Vista lista</Button>
          </Link>
          <Link to="/eventi/nuovo">
            <Button>+ Proponi nuovo evento</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add route in App.jsx**

```jsx
// Add import:
import { EventiCalendar } from './pages/eventi/EventiCalendar'

// Add route:
<Route path="/eventi/calendario" element={<EventiCalendar />} />
```

- [ ] **Step 5: Add calendar link to Sidebar**

In `src/components/layout/Sidebar.jsx`, update the eventi nav item to include a sub-link or add a calendar nav item:

```jsx
// Add after the eventi item in navItems array:
{ to: '/eventi/calendario', label: 'Calendario', icon: '\u{1F5D3}\uFE0F', roles: null },
```

- [ ] **Step 6: Verify calendar view**

Navigate to `/eventi/calendario` — should show monthly grid with navigation arrows, event pills on correct days.

- [ ] **Step 7: Commit**

```bash
git add src/components/eventi/CalendarGrid.jsx src/components/eventi/CalendarEventPill.jsx src/pages/eventi/EventiCalendar.jsx src/App.jsx src/components/layout/Sidebar.jsx
git commit -m "feat: add calendar view with monthly grid and event pills"
```

---

## Task 2.11: Final wiring + list/calendar toggle

**Files:**
- Modify: `src/pages/eventi/EventiList.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Add calendar toggle link to EventiList**

In `src/pages/eventi/EventiList.jsx`, add a link to calendar view in the PageHeader actions:

```jsx
// Update the actions prop of PageHeader to include both buttons:
actions={
  <div className="flex gap-3">
    <Link to="/eventi/calendario">
      <Button variant="secondary">{'\u{1F5D3}\uFE0F'} Calendario</Button>
    </Link>
    <Link to="/eventi/nuovo">
      <Button size="lg">+ Proponi nuovo evento</Button>
    </Link>
  </div>
}
```

- [ ] **Step 2: Ensure all routes are correctly ordered in App.jsx**

Verify routes are in this order (specific before parameterized):
```jsx
<Route path="/eventi" element={<EventiList />} />
<Route path="/eventi/nuovo" element={<EventiWizard />} />
<Route path="/eventi/calendario" element={<EventiCalendar />} />
<Route path="/eventi/:id" element={<EventiDetail />} />
```

- [ ] **Step 3: Verify full flow in browser**

1. Login → see events list (or empty state)
2. Click "Proponi nuovo evento" → wizard (4 steps) → submit
3. Event appears in list with "In attesa di approvazione"
4. Click event → detail page with tabs, info tab shows all data
5. Click "Calendario" → calendar view with event on correct day
6. As admin with `approva_eventi`: click "Approva evento" on detail page

- [ ] **Step 4: Run production build**

```bash
npx vite build
```
Expected: exit 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/eventi/EventiList.jsx src/App.jsx
git commit -m "feat: wire up events list/calendar toggle and finalize Phase 2 routing"
```

---

## Phase 2 Summary

| Component | What it delivers |
|-----------|-----------------|
| useEvents store | CRUD, filters, approval actions |
| EventiList | Filtered, searchable event list |
| EventiDetail | Tabbed detail view with info, status flow, approval |
| EventiWizard | 4-step creation (tipo → dove → modalita → riepilogo) |
| EventiCalendar | Monthly grid with event pills |
| 4 shared UI components | Tabs, DatePicker, SearchInput, PageHeader |
| 10 event components | Card, Filters, InfoTab, StatusFlow, ApprovalBar, 5 wizard steps |

**Tabs with placeholder content** (Phase 3-5): Staff, Partecipanti, Materiale & Gadget, Sotto-attivita', Logistica, Costi, Documenti, Lista attivita'

**Total new files:** 21

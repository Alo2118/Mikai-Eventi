# Phase 5D — Analytics & Dashboard — Implementation Plan

**Data:** 2026-03-24
**Spec di riferimento:** `docs/superpowers/specs/2026-03-24-phase5d-analytics-dashboard-design.md`
**Stato:** Pronto per esecuzione

---

## Panoramica

4 feature, 19 task discreti. Ordine: Consuntivo (DB first) -> Dashboard Commerciale (indipendente, no grafici) -> KPI Dashboard (recharts) -> Report Materiale (riusa recharts).

**File totali:** 23 nuovi + 11 modificati = 34 file

---

## Feature 1: Consuntivo vs Preventivo

### Task 1 — DB migration: add consuntivo fields to event_preventivi

**What:** Create SQL migration adding `importo_effettivo`, `n_fattura`, `data_fattura`, `note_consuntivo` columns to `event_preventivi`. Add index for consuntivo reporting.

**Files to create:**
- `supabase/migrations/20260324110000_add_consuntivo_fields.sql`

**Code changes:**
```sql
ALTER TABLE event_preventivi
  ADD COLUMN IF NOT EXISTS importo_effettivo decimal,
  ADD COLUMN IF NOT EXISTS n_fattura text,
  ADD COLUMN IF NOT EXISTS data_fattura date,
  ADD COLUMN IF NOT EXISTS note_consuntivo text;

CREATE INDEX IF NOT EXISTS idx_preventivi_consuntivo
  ON event_preventivi(importo_effettivo)
  WHERE importo_effettivo IS NOT NULL;
```

**Dependencies:** None (first task).

**Verification:**
- Run `source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"`
- Confirm migration appears in `supabase migration list`
- Verify columns exist: query `event_preventivi` with new columns from Supabase dashboard or via a test select

---

### Task 2 — Extend useCostsStore with consuntivo + analysis actions

**What:** Add `updateConsuntivo` and `fetchCostiAnalysis` actions to the existing store. Also modify `fetchEventPreventivi` select to include the new columns (they come automatically with `*` but verify the store re-fetches correctly after update).

**Files to modify:**
- `src/hooks/useCosts.js`

**Code changes:**
```js
// New action: updateConsuntivo
updateConsuntivo: async (preventivoId, { importo_effettivo, n_fattura, data_fattura, note_consuntivo }) => {
  return get().updatePreventivo(preventivoId, {
    importo_effettivo,
    n_fattura,
    data_fattura,
    note_consuntivo,
  })
},

// New action: fetchCostiAnalysis (cross-event, for CostiPage tab)
fetchCostiAnalysis: async (periodStart, periodEnd) => {
  let query = supabase
    .from('event_preventivi')
    .select('fornitore_nome, fornitore_ref:contacts!event_preventivi_fornitore_id_fkey(nome, cognome), importo, importo_effettivo, stato, evento:events!event_preventivi_event_id_fkey(tipo_evento, data_inizio)')
    .eq('stato', 'approvato')
  if (periodStart) query = query.gte('evento.data_inizio', periodStart)
  if (periodEnd) query = query.lte('evento.data_inizio', periodEnd)
  const { data, error } = await query
  // Client-side grouping key for "per fornitore" view:
  // Use COALESCE logic: fornitore_ref?.nome + ' ' + fornitore_ref?.cognome || fornitore_nome
  // This handles both FK-linked contacts and free-text fornitore names
  return { data: data || [], error }
},
```

> **Nota FK:** The actual FK constraint for `event_preventivi.fornitore_id` is `event_preventivi_fornitore_id_fkey` (not `fornitore_ref_fkey` as referenced in some parts of the spec).

**Dependencies:** Task 1 (columns must exist in DB).

**Verification:**
- `npm run build` passes
- In browser, call `useCostsStore.getState().updateConsuntivo(someId, { importo_effettivo: 100 })` from console — should succeed
- `fetchCostiAnalysis` returns data with `importo_effettivo` field

---

### Task 3 — ConsuntivoSection component

**What:** Create `ConsuntivoSection.jsx` — displays approved preventivi with editable consuntivo fields (importo_effettivo, n_fattura, data_fattura, note_consuntivo). Shows delta calculation with color coding. Includes riepilogo totals.

**Files to create:**
- `src/components/eventi/ConsuntivoSection.jsx`

**Code changes (key logic):**
- Receives `preventivi` (filtered to `stato === 'approvato'`), `costs`, `canManage`, `event` as props
- Each approved preventivo row shows: descrizione, importo (previsto), importo approvato, editable importo_effettivo input, n_fattura input, data_fattura DatePicker
- Delta calculation: `deltaColor(approvato, effettivo)` returns 'red' (>10% over), 'yellow' (0-10% over), 'green' (under/equal), 'gray' (not filled)
- Delta display: absolute value + percentage, e.g. "+400 EUR (+10.5%)"
- Alert toast when saving effettivo > importo by >10%
- Riepilogo section: totale previsto, totale approvato, totale effettivo (partial indicator if not all filled), count "ancora da rendicontare"
- `canManage` (permission `gestione_costi`) controls edit vs readonly
- Uses `INPUT_STYLE` from constants, `Button`, `Icon`, `useToastStore`
- Calls `useCostsStore.updateConsuntivo()` on save per row (inline save button)

**Dependencies:** Task 2.

**Verification:**
- Component renders without errors
- Editing importo_effettivo and saving persists to DB
- Delta colors show correctly: green when under, yellow when slightly over, red when >10% over
- Toast warning fires when effettivo > approvato by >10%
- Read-only mode when user lacks `gestione_costi` permission

---

### Task 4 — Integrate ConsuntivoSection into EventCostiTab

**What:** Add ConsuntivoSection below the Preventivi section in `EventCostiTab.jsx`. Visible when at least one preventivo has `stato === 'approvato'`. Update the existing budget bar to include effettivo from consuntivo data (sum of `importo_effettivo` from preventivi).

**Files to modify:**
- `src/components/eventi/EventCostiTab.jsx`

**Code changes:**
- Import `ConsuntivoSection`
- Filter `approvedPreventivi = preventivi.filter(p => p.stato === 'approvato')`
- Render `<ConsuntivoSection>` after the Preventivi section, passing approvedPreventivi, canManage, event
- Update budget bar KPI to use ONLY preventivi data (`event_costs` is a legacy table, do not reference it):
  - "Previsto" = `events.budget_previsto`
  - "Approvato" = `SUM(event_preventivi.importo) WHERE stato = 'approvato'`
  - "Effettivo" = `SUM(event_preventivi.importo_effettivo) WHERE importo_effettivo IS NOT NULL`
- Ensure `fetchEventPreventivi` re-runs after consuntivo update (already handled by `updatePreventivo` in store)

**Dependencies:** Task 3.

**Verification:**
- Navigate to an event with approved preventivi -> Costi tab shows Consuntivo section
- Budget bar reflects effettivo amounts from preventivi only (not legacy `event_costs`)
- No Consuntivo section when zero approved preventivi
- `npm run build` passes

---

### Task 5 — CostiPage: add "Analisi costi" tab with 3 sub-views

**What:** Extend `CostiPage.jsx` with a second tab "Analisi costi" alongside existing "In attesa di approvazione". The Analisi tab has 3 sub-views: per fornitore (table), per tipo evento (table), per mese (will use BudgetBreakdownChart from Feature 3, placeholder for now with simple table).

**Files to modify:**
- `src/pages/costi/CostiPage.jsx`

**Code changes:**
- Add `Tabs` component at the top: `[{ id: 'approvazioni', label: 'In attesa' }, { id: 'analisi', label: 'Analisi costi' }]`
- `activeTab` state, default 'approvazioni'
- When `analisi` tab active:
  - `TimeRangeFilter` (from Feature 3 — stub with year selector for now, replaced when Feature 3 is done)
  - Simple period filter: dropdown with "Trimestre corrente", "Anno corrente"
  - Call `useCostsStore.fetchCostiAnalysis(periodStart, periodEnd)` on mount
  - 3 sub-view chips: "Per fornitore", "Per tipo evento", "Per mese"
  - **Per fornitore:** table with columns Fornitore | Previsto | Approvato | Effettivo, grouped by `fornitore_ref?.nome + ' ' + fornitore_ref?.cognome || fornitore_nome` (COALESCE: prefer FK contact name, fallback to free-text `fornitore_nome`)
  - **Per tipo evento:** same table, grouped by `evento.tipo_evento`, labels from `TIPO_EVENTO`
  - **Per mese:** simple bar representation or table (upgraded to recharts chart in Task 14)
- All aggregation is client-side: reduce over the fetched preventivi data
- Currency formatting: `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })`
- Empty state if no data

**Dependencies:** Task 2.

**Verification:**
- Navigate to `/costi` -> tabs appear
- Switch to "Analisi costi" -> data loads and renders
- Sub-view switching works
- Tables show correct sums per group
- `npm run build` passes

---

## Feature 2: Dashboard Commerciale

### Task 6 — Create useDashboardCommerciale store

**What:** New Zustand store for the commercial dashboard. Contains `fetchAll(userId)` that runs 4 parallel queries: my events, my activities, zone summary, recent contacts.

**Files to create:**
- `src/hooks/useDashboardCommerciale.js`

**Code changes (key queries):**
```js
export const useDashboardCommercialeStore = create((set, get) => ({
  myEvents: [],
  myActivities: [],
  zoneSummary: null,
  recentContacts: [],
  loading: false,

  fetchAll: async (userId, ruolo, profile) => {
    set({ loading: true })
    const isManager = ruolo === 'area_manager'
    const [events, activities, zone, contacts] = await Promise.all([
      get().fetchMyEvents(userId, isManager),
      get().fetchMyActivities(userId),
      get().fetchZoneSummary(userId, isManager, profile),
      get().fetchRecentContacts(userId),
    ])
    set({ myEvents: events, myActivities: activities, zoneSummary: zone, recentContacts: contacts, loading: false })
  },

  fetchMyEvents: async (userId, isManager) => {
    const field = isManager ? 'manager_user_id' : 'promotore_id'
    const { data } = await supabase
      .from('events')
      .select('id, titolo, data_inizio, data_fine, stato, tipo_evento, created_at')
      .eq(field, userId)
      .in('stato', ['proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso'])
      .order('data_inizio')
      .limit(10)
    return data || []
  },

  fetchMyActivities: async (userId) => {
    const { data } = await supabase
      .from('event_activities')
      .select('*, evento:events!event_activities_event_id_fkey(id, titolo)')
      .eq('assegnato_a', userId)
      .in('stato', ['da_fare', 'in_corso'])
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(10)
    return data || []
  },

  fetchZoneSummary: async (userId, isManager, profile) => {
    const now = new Date()
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    // For area_manager: get zone users first
    let userIds = [userId]
    if (isManager && profile?.zone_id) {
      const { data: zoneUsers } = await supabase
        .from('users').select('id').eq('zone_id', profile.zone_id).eq('ruolo', 'commerciale')
      userIds = [userId, ...(zoneUsers || []).map(u => u.id)]
    }

    const [events, newContacts] = await Promise.all([
      supabase.from('events').select('stato')
        .in('promotore_id', userIds)
        .gte('data_inizio', qStart.toISOString()),
      supabase.from('contacts').select('id', { count: 'exact', head: true })
        .eq('proprietario_id', userId)
        .gte('created_at', oneMonthAgo.toISOString()),
    ])

    const eventiByStato = (events.data || []).reduce((acc, e) => {
      acc[e.stato] = (acc[e.stato] || 0) + 1; return acc
    }, {})

    return { eventiByStato, contattiNuovi: newContacts.count || 0 }
  },

  fetchRecentContacts: async (userId) => {
    const { data } = await supabase
      .from('contacts')
      .select('id, nome, cognome, tipo_contatto, created_at')
      .eq('proprietario_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    return data || []
  },
}))
```

**Dependencies:** None (independent feature).

**Verification:**
- `npm run build` passes
- Store exports correctly, actions callable

---

### Task 7 — Dashboard Commerciale sub-components

**What:** Create 5 section components for the commercial dashboard. Each is a self-contained card section.

**Files to create:**
- `src/components/dashboard/QuickActions.jsx`
- `src/components/dashboard/MyEventsSection.jsx`
- `src/components/dashboard/MyActivitiesSection.jsx`
- `src/components/dashboard/ZoneSummary.jsx`
- `src/components/dashboard/RecentContacts.jsx`

**Code changes per component:**

**QuickActions.jsx:**
- Two large buttons in `grid grid-cols-2 gap-3`
- "Proponi evento" links to `/eventi/nuovo` (primary variant, min-h-[56px])
- "Aggiungi contatto" links to `/contatti` (secondary variant, min-h-[56px])
- Both have Icon + text

**MyEventsSection.jsx:**
- Receives `events` array as prop
- Splits into `prossimi` (data_inizio >= today, max 5) and `inAttesa` (stato === 'proposto')
- Each event is a `Link` card to `/eventi/:id` with titolo, formatDateRange, StatusBadge
- Proposti show "In attesa da X giorni" using `differenceInDays(new Date(), new Date(e.created_at))`
- Uses `formatDateRange` from date-utils, `StatusBadge`, `STATO_EVENTO`, `STATO_EVENTO_COLORE`
- Empty state message if no events

**MyActivitiesSection.jsx:**
- Receives `activities` array as prop
- Uses `urgencyGroup()` logic (extract from DashboardOperativa into a shared util or inline)
- Shows only overdue (red), today (yellow), in3days (blue) — max 5 total
- Each activity is a Link card to `/eventi/:eventId`
- "Vedi tutte" button linking to `/mie-attivita`
- Reuse similar card style from DashboardOperativa

**ZoneSummary.jsx:**
- Receives `zoneSummary` object as prop
- Displays: count eventi per stato this quarter, contatti nuovi this month
- Simple stat cards in a grid
- Uses `STATO_EVENTO` labels

**RecentContacts.jsx:**
- Receives `contacts` array as prop
- Compact list, each row is a Link to `/contatti/:id`
- Shows nome + cognome, tipo_contatto badge, "aggiunto X giorni fa" using formatDate
- Empty state if no contacts

**Dependencies:** Task 6 (needs store data shape), but components can be built in parallel.

**Verification:**
- Each component renders in isolation without errors
- All links point to correct routes
- `npm run build` passes

---

### Task 8 — DashboardCommerciale page + icons

**What:** Create the main dashboard page that assembles all sub-components. Add required icons to `icons.js`.

**Files to create:**
- `src/pages/dashboard/DashboardCommerciale.jsx`

**Files to modify:**
- `src/lib/icons.js` — add `DASHBOARD_ICONS` section with icons for quick actions (plus, user-plus or similar), zone summary. Import from lucide-react as needed (e.g. `CalendarPlus`, `UserPlus`, `TrendingUp`, `BarChart3`).

**Code changes (DashboardCommerciale.jsx):**
```jsx
export function DashboardCommerciale() {
  const profile = useAuthStore(s => s.profile)
  const { myEvents, myActivities, zoneSummary, recentContacts, loading } = useDashboardCommercialeStore(/* selectors */)
  const fetchAll = useDashboardCommercialeStore(s => s.fetchAll)

  useEffect(() => {
    if (profile?.id) fetchAll(profile.id, profile.ruolo, profile)
  }, [profile?.id])

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard' }]} />
      <MobileHeader title="Dashboard" />
      <PageHeader
        title={`Ciao, ${profile?.nome || ''}`}
        subtitle="La tua area di lavoro"
      />
      <div className="px-6 md:px-8 space-y-6 pb-8">
        {loading ? <LoadingSkeleton lines={8} /> : (
          <>
            <QuickActions />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MyEventsSection events={myEvents} />
              <MyActivitiesSection activities={myActivities} />
            </div>
            <ZoneSummary zoneSummary={zoneSummary} />
            <RecentContacts contacts={recentContacts} />
          </>
        )}
      </div>
    </div>
  )
}
```

**Dependencies:** Tasks 6, 7.

**Verification:**
- Component renders with mock/real data
- Layout matches spec: quick actions top, events/activities side by side on desktop, stacked on mobile
- `npm run build` passes

---

### Task 9 — Wire DashboardCommerciale into DashboardRouter

**What:** Modify `DashboardRouter.jsx` to show `DashboardCommerciale` for roles `commerciale` and `area_manager` instead of redirecting to `/eventi`.

**Files to modify:**
- `src/pages/dashboard/DashboardRouter.jsx`

**Code changes:**
```jsx
// Add import
import { DashboardCommerciale } from './DashboardCommerciale'

// Replace the final Navigate fallback:
// Before:  return <Navigate to="/eventi" replace />
// After:
if (ruolo === 'commerciale' || ruolo === 'area_manager') {
  return <DashboardCommerciale />
}
return <Navigate to="/eventi" replace />
```

Also update Sidebar navItems: change the Riepilogo item to include `commerciale` and `area_manager` roles, so they see the Dashboard link in nav.

**Files to modify:**
- `src/components/layout/Sidebar.jsx` — update `navItems[0].roles` to `['admin', 'direzione', 'ufficio', 'commerciale', 'area_manager']`

**Dependencies:** Task 8.

**Verification:**
- Login as commerciale -> lands on DashboardCommerciale instead of /eventi
- Login as area_manager -> same
- Login as direzione -> still DashboardStrategica
- Login as ufficio -> still DashboardOperativa
- Sidebar shows "Riepilogo" for all roles
- `npm run build` passes

---

## Feature 3: KPI Dashboard with recharts

### Task 10 — Install recharts

**What:** Add recharts as a production dependency.

**Command:**
```bash
npm install recharts react-is
```

> **Nota:** recharts requires `react-is` as a peer dependency.

**Files modified (automatically):**
- `package.json`
- `package-lock.json`

**Dependencies:** None.

**Verification:**
- `npm run build` passes
- `recharts` and `react-is` appear in package.json dependencies
- No version conflicts

---

### Task 11 — Add chart color constants

**What:** Add hex color maps to `constants.js` for use in recharts SVG charts (Tailwind classes don't work in SVG). Add tipo evento chart colors.

**Files to modify:**
- `src/lib/constants.js`

**Code changes:**
```js
// Hex colors for recharts (Tailwind classes don't work in SVG fills)
export const CHART_COLORS = {
  mikai: '#3296dc',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  blue: '#3b82f6',
  emerald: '#10b981',
  gray: '#9ca3af',
  purple: '#8b5cf6',
  amber: '#f59e0b',
  orange: '#f97316',
}

export const STATO_EVENTO_CHART_COLOR = {
  proposto: CHART_COLORS.yellow,
  confermato: CHART_COLORS.blue,
  in_preparazione: CHART_COLORS.mikai,
  pronto: CHART_COLORS.green,
  in_corso: CHART_COLORS.emerald,
  concluso: CHART_COLORS.gray,
  cancellato: CHART_COLORS.red,
  rifiutato: CHART_COLORS.red,
}

export const TIPO_EVENTO_CHART_COLOR = {
  workshop: CHART_COLORS.mikai,    // #3296dc
  corso: CHART_COLORS.blue,        // #3b82f6
  congresso: CHART_COLORS.purple,  // #8b5cf6
  convegno: CHART_COLORS.amber,     // #f59e0b
  cadaver_lab: CHART_COLORS.emerald, // #10b981
  live_surgery: CHART_COLORS.red,  // #ef4444
}
```

**Dependencies:** None.

**Verification:**
- `npm run build` passes
- All keys match existing `STATO_EVENTO` and `TIPO_EVENTO` keys

---

### Task 12 — Create useAnalyticsStore

**What:** New Zustand store for cross-domain KPI queries. Contains `fetchKpiData(periodStart, periodEnd)` that runs 6 queries in parallel via Promise.all.

**Files to create:**
- `src/hooks/useAnalytics.js`

**Code changes (key queries):**
```js
export const useAnalyticsStore = create((set, get) => ({
  eventiPerStato: {},
  eventiPerTipo: {},
  budgetBreakdown: [],
  confermaRate: { confermati: 0, totale: 0 },
  attivitaInRitardo: { count: 0, trend: 0 },
  materialeFuori: { count: 0, items: [] },
  loading: false,

  fetchKpiData: async (periodStart, periodEnd) => {
    set({ loading: true })
    const [stati, tipi, budgets, conferme, ritardi, materiali] = await Promise.all([
      get().queryEventiPerStato(periodStart, periodEnd),
      get().queryEventiPerTipo(periodStart, periodEnd),
      get().queryBudgetBreakdown(periodStart, periodEnd),
      get().queryConfermaRate(periodStart, periodEnd),
      get().queryAttivitaInRitardo(periodStart, periodEnd),
      get().queryMaterialeFuori(),
    ])
    set({ eventiPerStato: stati, eventiPerTipo: tipi, budgetBreakdown: budgets,
          confermaRate: conferme, attivitaInRitardo: ritardi, materialeFuori: materiali, loading: false })
  },

  queryEventiPerStato: async (start, end) => {
    const { data } = await supabase.from('events').select('stato')
      .gte('data_inizio', start).lte('data_inizio', end)
    return (data || []).reduce((acc, e) => { acc[e.stato] = (acc[e.stato] || 0) + 1; return acc }, {})
  },

  queryEventiPerTipo: async (start, end) => {
    const { data } = await supabase.from('events').select('tipo_evento')
      .gte('data_inizio', start).lte('data_inizio', end)
    return (data || []).reduce((acc, e) => { acc[e.tipo_evento] = (acc[e.tipo_evento] || 0) + 1; return acc }, {})
  },

  queryBudgetBreakdown: async (start, end) => {
    // 3 parallel queries: budget_previsto from events, approvato from preventivi, effettivo from preventivi
    const [eventsRes, prevRes, effRes] = await Promise.all([
      supabase.from('events').select('data_inizio, budget_previsto')
        .gte('data_inizio', start).lte('data_inizio', end),
      supabase.from('event_preventivi')
        .select('importo, evento:events!event_preventivi_event_id_fkey(data_inizio)')
        .eq('stato', 'approvato')
        .gte('evento.data_inizio', start).lte('evento.data_inizio', end),
      supabase.from('event_preventivi')
        .select('importo_effettivo, evento:events!event_preventivi_event_id_fkey(data_inizio)')
        .not('importo_effettivo', 'is', null)
        .gte('evento.data_inizio', start).lte('evento.data_inizio', end),
    ])
    // Group all 3 by month (format 'yyyy-MM'), merge into array of { mese, previsto, approvato, effettivo }
    // Use date-fns format with 'yyyy-MM' for grouping
    // Return sorted array
  },

  queryConfermaRate: async (start, end) => {
    const { data } = await supabase.from('event_participants')
      .select('stato_iscrizione, evento:events!event_participants_event_id_fkey(data_inizio)')
      .gte('evento.data_inizio', start).lte('evento.data_inizio', end)
    const parts = data || []
    const confermati = parts.filter(p => ['confermato', 'presente'].includes(p.stato_iscrizione)).length
    return { confermati, totale: parts.length }
  },

  queryAttivitaInRitardo: async (start, end) => {
    // Current period
    const { data: current } = await supabase.from('event_activities')
      .select('id')
      .in('stato', ['da_fare', 'in_corso'])
      .eq('obbligatoria', true)
      .lt('deadline', new Date().toISOString())
    // Count for current period events only (filter client-side or use inner join)
    // Trend: compare with previous period of same length
    const periodMs = new Date(end) - new Date(start)
    const prevStart = new Date(new Date(start) - periodMs).toISOString()
    const prevEnd = start
    // Simplified: just count current overdue
    return { count: (current || []).length, trend: 0 }
  },

  queryMaterialeFuori: async () => {
    const { data: fuori } = await supabase.from('materials')
      .select('id, nome, codice_inventario, posizione_attuale')
      .neq('posizione_attuale', 'in_magazzino').eq('attivo', true)
    if (!fuori?.length) return { count: 0, items: [] }
    // Get last uscita movement for each
    const ids = fuori.map(m => m.id)
    const { data: movements } = await supabase.from('material_movements')
      .select('material_id, data_movimento')
      .in('material_id', ids).eq('tipo', 'uscita')
      .order('data_movimento', { ascending: false })
    // For each material, find most recent uscita
    const lastOut = {}
    for (const m of (movements || [])) {
      if (!lastOut[m.material_id]) lastOut[m.material_id] = m.data_movimento
    }
    const items = fuori.map(m => ({
      ...m,
      giorniFuori: lastOut[m.id] ? Math.floor((Date.now() - new Date(lastOut[m.id])) / 86400000) : null,
    })).sort((a, b) => (b.giorniFuori || 0) - (a.giorniFuori || 0)).slice(0, 5)
    return { count: fuori.length, items }
  },
}))
```

**Dependencies:** Task 1 (for importo_effettivo column in budget query).

**Verification:**
- `npm run build` passes
- Store exports correctly
- `fetchKpiData` with a date range returns populated objects

---

### Task 13 — TimeRangeFilter + KpiCard components

**What:** Create the shared TimeRangeFilter chip selector and KpiCard wrapper.

**Files to create:**
- `src/components/dashboard/TimeRangeFilter.jsx`
- `src/components/dashboard/KpiCard.jsx`

**Code changes:**

**TimeRangeFilter.jsx:**
- Props: `value` (object: `{ type, start, end }`), `onChange`
- 4 chip buttons: "Mese", "Trimestre", "Anno", "Personalizzato"
- Chip style matches DashboardOperativa category filters (min-h-[48px], rounded-lg)
- When "Personalizzato" selected, show two DatePicker inputs inline
- Date calculation helpers:
  - Mese: `startOfMonth(now)` to `endOfMonth(now)` using date-fns
  - Trimestre: start of current quarter to end of quarter
  - Anno: Jan 1 to Dec 31 of current year
- Default: "Trimestre" (matches existing currentQuarterBudget logic)
- Mobile: `overflow-x-auto flex gap-2` for horizontal scroll

**KpiCard.jsx:**
- Props: `title`, `value`, `subtitle`, `valueColor`, `children` (chart slot)
- Layout: white card with title at top, large value number, subtitle below, optional children area for charts
- Standard card style: `bg-white rounded-xl border border-gray-200 p-4`

**Dependencies:** None (pure UI components).

**Verification:**
- TimeRangeFilter renders, clicking chips fires onChange with correct dates
- KpiCard renders title + value correctly
- `npm run build` passes

---

### Task 14 — Chart components (6 KPI charts)

**What:** Create the 6 chart/KPI display components using recharts. Each receives data + period as props, queries handled by parent.

**Files to create:**
- `src/components/dashboard/EventiPerStatoChart.jsx`
- `src/components/dashboard/EventiPerTipoChart.jsx`
- `src/components/dashboard/BudgetBreakdownChart.jsx`
- `src/components/dashboard/ConfermaPartecipantiKpi.jsx`
- `src/components/dashboard/AttivitaInRitardoKpi.jsx`
- `src/components/dashboard/MaterialeFuoriKpi.jsx`

**Code changes per component:**

**EventiPerStatoChart.jsx:**
- Receives `data` as `{ [stato]: count }` object
- Converts to array: `Object.entries(data).map(([stato, count]) => ({ stato, count }))`
- `ResponsiveContainer` > `PieChart` > `Pie` with `innerRadius={60}` `outerRadius={100}` (donut)
- Each `Cell` fill from `STATO_EVENTO_CHART_COLOR[entry.stato]`
- `Tooltip` with formatter showing `STATO_EVENTO[name]` label + count
- `Legend` with Italian labels
- Accessibility: hidden `<table className="sr-only">` with data rows
- Height: `h-64` on mobile, contained in KpiCard

**EventiPerTipoChart.jsx:**
- Receives `data` as `{ [tipo]: count }` object
- `BarChart` with `layout="vertical"`, `XAxis type="number"`, `YAxis type="category"` with `TIPO_EVENTO` labels
- Single `Bar` with colors from `TIPO_EVENTO_CHART_COLOR`
- `Tooltip` with Italian labels
- Accessibility table

**BudgetBreakdownChart.jsx:**
- Receives `data` as array of `{ mese, previsto, approvato, effettivo }`
- `BarChart` (grouped) with 3 `Bar` series
- Colors: mikai (previsto), green (approvato), blue/red (effettivo — red if > approvato)
- `XAxis` shows month labels (format 'MMM' using date-fns Italian locale)
- `Tooltip` with currency formatting
- Full width layout
- Also used in CostiPage "Per mese" sub-view (Task 5)

**ConfermaPartecipantiKpi.jsx:**
- Receives `{ confermati, totale }` props
- Large percentage number: `Math.round((confermati / totale) * 100) || 0`
- Subtitle: `"X/Y confermati"`
- Uses existing `ProgressIndicator` component below the number
- Wrapped in KpiCard

**AttivitaInRitardoKpi.jsx:**
- Receives `{ count, trend }` props
- Large number, colored red if > 0, green if 0
- Trend indicator: up arrow (red) if trend > 0, down arrow (green) if trend < 0, dash if 0
- Uses Icon for arrows (e.g. `TrendingUp`, `TrendingDown` from lucide)
- Wrapped in KpiCard

**MaterialeFuoriKpi.jsx:**
- Receives `{ count, items }` props (items = top 5 with giorniFuori)
- Large number at top
- Below: compact list of top 5 items with nome + giorniFuori
- Items with giorniFuori > 14 highlighted in red text
- Wrapped in KpiCard

**Dependencies:** Tasks 10, 11, 12.

**Verification:**
- Each chart renders correctly with sample data
- Donut shows proper colors per stato
- Budget chart shows 3 bar series per month
- Mobile: charts scale to full width
- Accessibility tables present
- `npm run build` passes

---

### Task 15 — Integrate KPI charts into DashboardStrategica

**What:** Modify `DashboardStrategica.jsx` to add TimeRangeFilter and 6 KPI sections above the existing "Coda approvazioni" and "Prossimi eventi" sections. Maintain all existing functionality.

**Files to modify:**
- `src/pages/dashboard/DashboardStrategica.jsx`

**Code changes:**
- Import all new components + `useAnalyticsStore`
- Add `timeRange` state (default: trimestre corrente), computed from `TimeRangeFilter`
- Add `useEffect` that calls `useAnalyticsStore.fetchKpiData(periodStart, periodEnd)` when timeRange changes
- Read KPI data from store with selectors
- Layout (inside existing `<>` fragment, before "Coda approvazioni"):
  ```
  <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <EventiPerStatoChart data={eventiPerStato} />
    <EventiPerTipoChart data={eventiPerTipo} />
  </div>
  <BudgetBreakdownChart data={budgetBreakdown} />
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <ConfermaPartecipantiKpi {...confermaRate} />
    <AttivitaInRitardoKpi {...attivitaInRitardo} />
    <MaterialeFuoriKpi {...materialeFuori} />
  </div>
  ```
- **KEEP the existing 4 summary KPI cards** (attivi, in attesa, con ritardi, budget trimestre) at the top of DashboardStrategica as a quick-glance row. Do NOT remove them.
- **ADD the new recharts visualizations BELOW** the existing KPI cards row. The TimeRangeFilter and 6 chart sections go between the existing KPI cards and the "Coda approvazioni" section.
- Role-based visibility: budget charts only for `direzione`/`admin`, materiale only if has warehouse permissions
- Existing coda approvazioni and prossimi eventi sections remain unchanged below

**Dependencies:** Tasks 12, 13, 14.

**Verification:**
- Login as direzione -> see TimeRangeFilter + 6 KPI sections + existing sections
- Changing time range reloads all KPI data
- Charts render with real data
- Mobile: stacked layout, charts full width
- Existing approval queue and upcoming events still functional
- `npm run build` passes

---

### Task 16 — Wire BudgetBreakdownChart into CostiPage "Per mese"

**What:** Replace the placeholder "Per mese" sub-view in CostiPage (Task 5) with the actual `BudgetBreakdownChart` component created in Task 14.

**Files to modify:**
- `src/pages/costi/CostiPage.jsx`

**Code changes:**
- Import `BudgetBreakdownChart`
- In the "Per mese" sub-view, transform the `fetchCostiAnalysis` data into the `{ mese, previsto, approvato, effettivo }` array format expected by the chart
- Group by month using `format(parseISO(item.evento.data_inizio), 'yyyy-MM')`, then sum importo/importo_effettivo per month
- Pass the transformed data to `<BudgetBreakdownChart data={monthlyData} />`

**Dependencies:** Tasks 5, 14.

**Verification:**
- Navigate to `/costi` -> "Analisi costi" tab -> "Per mese" -> chart renders
- Month bars show correct sums matching table views
- `npm run build` passes

---

## Feature 4: Material Utilization Report

### Task 17 — Extend useMaterialsStore with analytics queries

**What:** Add `fetchMaterialAnalytics` and `fetchUpcomingBookings` actions to the existing materials store. Add `materialAnalytics` and `upcomingBookings` state keys.

**Files to modify:**
- `src/hooks/useMaterials.js`

**Code changes:**
```js
// New state
materialAnalytics: null,
upcomingBookings: [],

// New action
fetchMaterialAnalytics: async () => {
  set({ loading: true })
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const [usage, movements, fuori, assignments] = await Promise.all([
    supabase.from('event_materials').select('material_id, product_id')
      .gte('created_at', oneYearAgo.toISOString()),
    supabase.from('material_movements')
      .select('material_id, tipo, data_movimento, data_rientro_prevista')
      .in('tipo', ['uscita', 'rientro'])
      .gte('data_movimento', oneYearAgo.toISOString())
      .order('data_movimento'),
    supabase.from('materials')
      .select('id, nome, codice_inventario, posizione_attuale')
      .neq('posizione_attuale', 'in_magazzino').eq('attivo', true),
    supabase.from('event_materials')
      .select('material_id, product_id, data_inizio_utilizzo, data_fine_utilizzo')
      .neq('stato', 'rifiutato')
      .not('data_inizio_utilizzo', 'is', null)
      .not('data_fine_utilizzo', 'is', null)
      .order('data_inizio_utilizzo'),
  ])

  // Client-side aggregation: compute frequency, avg days out, on-time return rate, conflicts
  // Using computeMaterialMetrics helper function
  const analytics = computeMaterialMetrics(
    usage.data || [], movements.data || [], fuori.data || [], assignments.data || []
  )
  set({ materialAnalytics: analytics, loading: false })
  return analytics
},

fetchUpcomingBookings: async () => {
  const { data } = await supabase
    .from('event_materials')
    .select('material_id, product_id, data_inizio_utilizzo, data_fine_utilizzo, material:materials(nome, codice_inventario), product:products(nome, codice), evento:events(titolo)')
    .gte('data_fine_utilizzo', new Date().toISOString())
    .neq('stato', 'rifiutato')
    .order('data_inizio_utilizzo')
    .limit(20)
  set({ upcomingBookings: data || [] })
  return data || []
},
```

**Helper function `computeMaterialMetrics`** (in same file or extracted to `src/lib/material-analytics.js` if > 50 lines):
- **frequency:** reduce usage.data by `product_id ?? material_id` -> count (use `product_id` as primary identifier, fallback to `material_id` for legacy rows)
- **avgDaysOut:** pair uscita/rientro movements per material_id chronologically, compute differenceInDays, average
- **onTimeRate:** for uscite with data_rientro_prevista, check if corresponding rientro.data_movimento <= data_rientro_prevista
- **conflicts:** for each material_id, sort assignments by start date, count overlapping pairs (a.end > b.start)
- Returns: `{ frequency: {}, avgDaysOut: {}, onTimeRate: {}, conflicts: {}, fuori: [], topUsed: [] }`

**Dependencies:** None.

**Verification:**
- `npm run build` passes
- `fetchMaterialAnalytics` returns populated analytics object
- `fetchUpcomingBookings` returns sorted list

---

### Task 18 — Report Materiale page + sub-components

**What:** Create the report page and its 4 sub-components. Page has tabs/sections for each view.

**Files to create:**
- `src/pages/report/ReportMaterialePage.jsx`
- `src/components/report/TopMaterialiChart.jsx`
- `src/components/report/MaterialeFuoriList.jsx`
- `src/components/report/MetricheMaterialeTable.jsx`
- `src/components/report/ProssimePrenotazioni.jsx`

**Code changes:**

**ReportMaterialePage.jsx:**
- Fetches analytics and bookings on mount via `useMaterialsStore`
- Layout: Breadcrumb + PageHeader + 4 sections stacked vertically
- Uses `Tabs` for navigation between the 4 views, OR shows all 4 stacked (per spec — shows all views)
- All sections wrapped in cards

**TopMaterialiChart.jsx:**
- Receives `topUsed` array (top 10 by frequency)
- Horizontal `BarChart` from recharts with `layout="vertical"`
- Y-axis: material names, X-axis: count
- Bar fill: `CHART_COLORS.mikai`
- Accessibility table

**MaterialeFuoriList.jsx:**
- Receives `fuori` array (materials currently out)
- Card list, each card shows: nome, codice_inventario, posizione (using `POSIZIONE_MATERIALE` label), data uscita, data rientro prevista
- Overdue items: `border-l-4 border-l-red-400` + "In ritardo di X giorni" in red
- Count badge in section title

**MetricheMaterialeTable.jsx:**
- Receives analytics data: merged array with frequency, avgDaysOut, onTimeRate, conflicts per material
- Responsive: table on desktop, card list on mobile
- Columns: Materiale | Uso/anno | Gg medi fuori | Rientro puntuale % | Conflitti
- Sortable: clicking header toggles ascending/descending sort for that column
- Color coding: onTimeRate < 70% red, > 90% green, between = yellow
- Uses `useState` for sortBy and sortDir

**ProssimePrenotazioni.jsx:**
- Receives `bookings` array
- Compact list: date range + material name + event title
- Uses `formatDateRange` from date-utils
- Link on event title to `/eventi/:id` (if event data available)

**Dependencies:** Tasks 10 (recharts), 11 (chart colors), 17 (store data).

**Verification:**
- Each component renders with sample data
- MetricheMaterialeTable sorting works
- MaterialeFuoriList highlights overdue items
- Charts render correctly
- Mobile layout: cards instead of table rows
- `npm run build` passes

---

### Task 19 — Route + navigation for Report Materiale

**What:** Add the `/report/materiale` route in App.jsx and the "Report Materiale" sidebar nav item.

**Files to modify:**
- `src/App.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/lib/icons.js` (add report icon if needed)

**Code changes:**

**App.jsx:**
```jsx
import { ReportMaterialePage } from './pages/report/ReportMaterialePage'

// Inside routes, after /materiale/:id:
<Route path="/report/materiale" element={<ReportMaterialePage />} />
```

**Sidebar.jsx:**
- Add nav item after the "Magazzino" entry:
```js
{ to: '/report/materiale', label: 'Report Materiale', icon: NAV_ICONS.report, permissions: ['gestione_magazzino', 'gestione_spedizioni'] },
```

**icons.js:**
- Add `report` to `NAV_ICONS` (e.g. `BarChart3` or `FileBarChart` from lucide-react)

**Dependencies:** Task 18.

**Verification:**
- Navigate to `/report/materiale` -> page loads with data
- Sidebar shows "Report Materiale" only for users with warehouse/shipping permissions
- Breadcrumb shows correctly
- `npm run build` passes
- Login as commerciale -> "Report Materiale" NOT visible in sidebar

---

## Final Verification

After all 19 tasks are complete:

1. **Build check:** `npm run build` — must pass with zero errors
2. **Role-based smoke test:**
   - Login as `direzione` -> DashboardStrategica with charts, time filter, all KPI
   - Login as `commerciale` -> DashboardCommerciale with events, activities, zone summary
   - Login as `ufficio` -> DashboardOperativa (unchanged), can access Report Materiale
   - Login as `area_manager` -> DashboardCommerciale with zone-wide data
3. **Consuntivo flow:**
   - Create event -> add preventivo -> approve -> fill consuntivo -> verify delta colors
   - Check CostiPage "Analisi costi" tab -> 3 sub-views render with data
4. **Material report:**
   - Visit `/report/materiale` -> 4 sections render with data
   - Table sorting works
   - Charts interactive (tooltip on hover/touch)
5. **Mobile:**
   - All new pages render correctly on 375px width
   - Charts scale to full width
   - No horizontal scroll
6. **Accessibility:**
   - Charts have sr-only data tables
   - All buttons have labels
   - Color never sole indicator

---

## Task Summary

| # | Feature | Task | Files | Type |
|---|---------|------|-------|------|
| 1 | Consuntivo | DB migration: consuntivo fields | 1 SQL | Create |
| 2 | Consuntivo | Extend useCostsStore | 1 JS | Modify |
| 3 | Consuntivo | ConsuntivoSection component | 1 JSX | Create |
| 4 | Consuntivo | Integrate into EventCostiTab | 1 JSX | Modify |
| 5 | Consuntivo | CostiPage "Analisi costi" tab | 1 JSX | Modify |
| 6 | Commerciale | useDashboardCommerciale store | 1 JS | Create |
| 7 | Commerciale | 5 sub-components | 5 JSX | Create |
| 8 | Commerciale | DashboardCommerciale page + icons | 1 JSX + 1 JS | Create + Modify |
| 9 | Commerciale | Wire into DashboardRouter + Sidebar | 2 JSX | Modify |
| 10 | KPI Dashboard | Install recharts | package.json | Modify |
| 11 | KPI Dashboard | Chart color constants | 1 JS | Modify |
| 12 | KPI Dashboard | useAnalyticsStore | 1 JS | Create |
| 13 | KPI Dashboard | TimeRangeFilter + KpiCard | 2 JSX | Create |
| 14 | KPI Dashboard | 6 chart components | 6 JSX | Create |
| 15 | KPI Dashboard | Integrate into DashboardStrategica | 1 JSX | Modify |
| 16 | KPI Dashboard | Wire chart into CostiPage | 1 JSX | Modify |
| 17 | Report Materiale | Extend useMaterialsStore | 1 JS | Modify |
| 18 | Report Materiale | Report page + 4 sub-components | 5 JSX | Create |
| 19 | Report Materiale | Route + Sidebar nav | 3 files | Modify |

**Total: 19 tasks, 23 new files, 11 modified files**

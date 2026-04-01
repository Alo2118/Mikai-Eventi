# Eventi Mikai — Development Rules

## Project Overview

**Mikai** is a medical device company (~50 people) in the orthopedic/trauma surgery sector (SIOT, SICM, FESSH, EFORT, ALOTO markets). **Eventi** is their internal event management SPA — handles 40-50 events/year including workshops, surgical courses, congresses, cadaver labs, and live surgery.

### What the app does
- **Event lifecycle:** Propose → Approve → Prepare → Execute → Close
- **Material logistics:** Demo kit tracking, warehouse management, shipping, conflict detection
- **Approval workflows:** 2-level (Area Manager for small budgets, Direzione for larger ones)
- **Contacts directory:** Centralized rubrica with ownership (proprietario), zone-based visibility (RLS), type-based forms
- **People management:** Staff assignment + participant tracking per event, with confirmation states
- **Event program:** Configurable sub-activities (pranzo, sessioni, ecc.) with fornitore and confirmation. Program templates per event type (giorno+orario), one-click instantiation
- **Logistics:** Hotel + transport tracking per person (staff & participants), with booking states
- **Costs & Quotes:** Preventivi with approval flow (in_attesa → approvato/rifiutato/in_revisione), budget comparison
- **Notifications:** In-app real-time notifications (Supabase Realtime), automatic triggers on event/activity/preventivo state changes, deadline reminders, escalation, email digest
- **Documents:** File upload per event (Supabase Storage), drag&drop, preview, download, type categorization
- **Packing list:** Generate from approved materials, checkbox tracking, manual items, print support
- **Export:** Excel export on all list pages (eventi, contatti, materiale, costi, logistica), PDF dossier per event
- **Analytics:** KPI dashboard with recharts (events by state/type, budget breakdown, participant confirmation rate, overdue activities, material out), consuntivo vs preventivo tracking, material utilization report, role-based dashboards (strategica/operativa/commerciale)
- **MedTech compliance:** Track interactions with healthcare professionals (regulatory requirement, future phase)

### Company hierarchy (maps to app roles)
- **Direzione:** CEO (Giovanni), Direttore Commerciale (Enrica) — final approval on events
- **Area Manager:** Regional coordinators (Nord/Centro/Sud) — can approve under budget threshold
- **Commerciali/Agenti:** Field sales reps — propose events, manage local logistics
- **Ufficio:** Back-office staff (Federica=organizzazione, Nicola=marketing/demo, Ivan=spedizioni, Chiara=ordini/pagamenti)

The system works by **roles, not people** — if someone leaves, the replacement inherits the role.

### Target users
Sales reps, area managers, back-office staff with **highly variable digital literacy**. The UI must work for someone who only uses WhatsApp — no training assumed.

### Project phases

| Phase | Status | Scope |
|-------|--------|-------|
| **Phase 1** | Done | Scaffold, DB schema (23 tables + RLS), auth, Mikai theme |
| **Phase 2** | Done | Core UI: event list/detail/wizard/calendar, approval 2-level |
| **Phase 3** | Done | Material: inventory, requests, conflict detection, movements, gadgets, catalog picker |
| **Catalogo** | Done | 3-step e-commerce selection (Brand → Body Section → Product), 4 new DB tables |
| **Materiale Redesign** | Done | Granular permissions, editable material list, visual catalog, venue directory, admin CRUD |
| **Phase 4** | Done | People & Logistics: contacts directory, event staff/participants, sub-activities, hotel/transport, quotes with approval, costs |
| **Phase 4b** | Done | Bulk import (paste from spreadsheet), transport details (mezzo/codice/orario/autista), tavoli corso, logistics redesign (checkbox selection + bulk modals + grouping), hotel details, agente participant type |
| **Design System** | Done | UI components: Modal (unified, accessible), FormField, ProgressIndicator, ChipFilter, EventChecklistView. Summary bars in tabs, tab status dots, INPUT_STYLE constants. Specs: `docs/superpowers/specs/2026-03-23-design-system-spec.md` |
| **Phase 5A** | Done | Gap completion: tab status dots (6 tabs), summary bars, EventChecklistView integration, template admin (cycle detection, topological sort, segmented controls), material position UI (warehouse/agent selectors) |
| **Phase 5B** | Done | Notifications: in-app notifications with Realtime, NotificationBell + dropdown, NotifichePage with filters, DB triggers (event/activity/preventivo), Edge Functions (deadline-checker, overdue-returns, email-digest), pg_cron schedules, notification preferences |
| **Phase 5C** | Done | Documents & Export: EventDocumentiTab (drag&drop upload, preview, download), Excel export on 5 list pages (exceljs), packing list (generate/toggle/print), dossier PDF generator (jsPDF), print CSS |
| **Phase 5D** | Done | Analytics: KPI dashboard (recharts), consuntivo vs preventivo, material utilization report, dashboard commerciale |
| **Phase 6A** | Done | CI/CD: GitHub Actions workflow (build + deploy to GitHub Pages on push to main) |
| **Phase 6B** | Done | PWA: vite-plugin-pwa, manifest, service worker, OfflineIndicator, InstallPrompt |
| **Phase 6C** | Done | Compliance: HCP profiles, ToV tracking (Sunshine Act), interazioni HCP, audit trail expanded, ComplianceDashboard, AuditTrailPage, EventComplianceTab |
| **Optimization** | Done | Code splitting (React.lazy, 31 lazy routes, -79% initial bundle), vendor chunks (react/supabase/recharts/date-fns/zustand), centralized formatCurrency/formatCurrencyDecimals/formatPercentage in format-utils, useExportHandler hook (DRY 7 pages), date-fns fully centralized in date-utils (14 new helpers), Icon.jsx full 26-map lookup, GlobalSearch queries moved to useGlobalSearchStore, touch targets fixed (48px min), 6 unused components removed |
| **UX Overhaul** | Done | Tab Persone+Logistica merged, material type icons, availability check, shipping workflow (packing list per collo, spedizione evento-level), deadline fields (preparazione/spedizione/consegna/partecipanti), gate blockers in Preparazione, deep-link notifications, default tab by event state, responsive mobile cards, centralized UI style constants (CARD_STYLE/FORM_CONTAINER_STYLE/SUMMARY_BAR_STYLE), 36+ files standardized, EmptyState with icons, KPI alert colors, ConfirmDialog on approve, BottomBar 5-item + AltroPage, LogisticaTimeline grouped by event |
| **Hardening** | Done | 40+ bugs fixed (orphaned records, stale store data, missing CASCADE/SET NULL on FKs), event edit form completed (tipo_evento, modalita, desk, certificato, ora_inizio), material type icons per-product, program templates (giorno+orario, multi-day, admin CRUD, one-click apply), template admin CRUD (create/delete templates), reactive readiness alerts (eventMaterials moved to Zustand store), person removal cascades hotel/transport/tavoli cleanup |

### Readiness Engine (cross-phase, implemented)
The Event Readiness Engine is a cross-cutting system that solves coordination failures. Spec: `docs/superpowers/specs/2026-03-19-readiness-engine-design.md` (all sections approved and implemented).

Core concepts:
- **Template checklist** per tipo evento — activities with configurable deadlines (-Xgg) and dependencies
- **Template programma** per tipo evento — sub-activities with giorno+orario, multi-day support, one-click apply
- **Convergence dashboard** per evento — shows all parallel activities, who's responsible, what's late
- **Gates** block event state advancement if mandatory activities are incomplete
- **Role dashboards** — each role sees their cross-event priorities at login
- **Active inventory** — tracks material position with alerts for overdue returns

Key business rules:
- Approval is pragmatic (anyone with `approva_eventi` can approve, including self-approval)
- Activities run in parallel, not sequential — convergence dashboard, not linear workflow
- Warehouses: Monteviale (main) + Genova (secondary) + material with agents in the field
- Shipping address is independent from event venue (can be: hotel, fermo deposito, agent office, or pickup in person)
- Template assigns activities to roles/permissions, then person self-assigns or is assigned manually

---

## Infrastructure & Deployment

### Supabase (Backend)
- **Project ID:** `ncjpbbvlucquopyihios`
- **URL:** `https://ncjpbbvlucquopyihios.supabase.co`
- **Auth:** Email/password. Admin user: `nicola@mikai.it`
- **Database:** PostgreSQL with 45+ tables, RLS on every table, 60+ migrations
- **Storage:** `event-documents` private bucket for file uploads (10MB max, PDF/DOCX/XLSX/JPG/PNG)
- **Edge Functions:** 3 Deno functions (deadline-checker, overdue-returns-checker, email-digest)
- **Realtime:** Enabled on `notifications` table for live push
- **Environment vars:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (never committed)
- **CLI vars:** `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` in `.env` (for `supabase db push`)
- **Supabase CLI:** installed via npx (`npx supabase`), project linked. Use `SUPABASE_ACCESS_TOKEN` env var.

### GitHub Pages (Deploy)
- **PWA SPA** deployed on GitHub Pages with service worker (vite-plugin-pwa), manifest, offline indicator
- **Base path:** `/Mikai-Eventi/` (configured in `vite.config.js`)
- **SPA routing:** `public/404.html` redirects all paths to `index.html` via query string rewrite; `index.html` restores the original URL via History API
- **Deploy process:** Automated via GitHub Actions (`.github/workflows/deploy.yml`)
  - **Trigger:** push to `main` branch
  - **Steps:** checkout → setup-node 20 → npm ci → build (with secrets) → deploy to GitHub Pages
  - **Secrets required:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in repository settings
  - **Setup:** Repository Settings → Pages → Source: "GitHub Actions"

### Local development
```bash
npm install        # Install dependencies
npm run dev        # Start Vite dev server (http://localhost:5173/Eventi/)
npm run build      # Production build to dist/
npm run preview    # Preview production build locally
```

### Supabase CLI (migrations)
```bash
# Push new migrations to remote DB
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"

# List migration status
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase migration list -p "$SUPABASE_DB_PASSWORD"
```

**Migration naming:** `YYYYMMDDHHMMSS_description.sql` (timestamp format, required by Supabase CLI).
**Enum extensions:** `ALTER TYPE ... ADD VALUE` must be in a **separate migration** from policies that reference the new values (PostgreSQL limitation — new enum values aren't visible in the same transaction).

---

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Framework | React | 19.x |
| Build | Vite | 6.x |
| Styling | TailwindCSS | v4 (Vite plugin) |
| State | Zustand | 5.x |
| Backend/Auth | Supabase | 2.x |
| Routing | React Router DOM | 7.x |
| Dates | date-fns | 4.x (locale: `it`) |
| Icons | lucide-react | 0.577+ |
| Excel export | exceljs | 4.x (MIT, dynamic import) |
| Charts | recharts | 2.x (PieChart, BarChart, ResponsiveContainer) |
| PDF generation | jsPDF + jspdf-autotable | 2.5.x / 3.8.x (dynamic import) |
| PWA | vite-plugin-pwa | 1.x (Workbox, autoUpdate) |
| Deploy | GitHub Pages | base: `/Mikai-Eventi/`, CI/CD via GitHub Actions |

**Language:** UI text and labels always in **Italian** (natural language, zero jargon).
**Brand color:** `mikai-400` = `#3296dc`. Full scale defined in `src/index.css` @theme.

---

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable primitives (Button, Icon, Tabs, Toast, Modal, ExportButton, NotificationBell, NotificationCard, NotificationDropdown, OfflineIndicator, InstallPrompt, GlobalSearch, etc.)
│   ├── layout/       # App shell (with Realtime init + PWA), Sidebar (with bell + compliance), BottomBar (with badge), MobileHeader, Breadcrumb
│   ├── eventi/       # Event domain components (tabs: Info, Preparazione, Materiale, Persone, Programma, Logistica, Costi, Documenti, Compliance + EventChecklistView, EventPackingList)
│   ├── materiale/    # Material domain components
│   ├── contatti/     # Contact components (ContactPicker, ContactForm)
│   └── notifiche/    # NotificationPreferences
├── pages/
│   ├── auth/         # Login
│   ├── eventi/       # EventiList, EventiDetail, EventiWizard, EventiCalendar
│   ├── materiale/    # MaterialeList, MaterialeDetail
│   ├── contatti/     # ContattiList, ContattiDetail
│   ├── notifiche/    # NotifichePage (full list + filters + preferences)
│   ├── compliance/   # ComplianceDashboard, TovList, TovForm, TovDetail, HcpList, HcpDetail
│   ├── costi/        # CostiPage (cross-event quotes + analisi costi)
│   ├── logistica/    # LogisticaPage (cross-event logistics)
│   ├── report/       # ReportMaterialePage (material utilization analytics)
│   └── admin/        # AdminBrand, AdminProdotti, AdminSedi, AdminUtenti, AdminSottoAttivita, AuditTrailPage, etc.
├── hooks/            # Zustand stores (useAuth, useEvents, useMaterials, useContacts, useStaff, useParticipants, useActivities, useSubActivities, useLogistics, useCosts, useAdmin, useTavoli, useNotifications, useDocuments, usePackingList, useCompliance, useAuditLog, useAnalytics, useDashboardCommerciale, useVenues, useGlobalSearch) + custom hooks (useExportHandler)
├── lib/              # Utilities (constants, date-utils, format-utils, icons, supabase client, export-utils, generate-dossier)
└── main.jsx          # Entry point
public/
├── 404.html          # GitHub Pages SPA redirect
└── icons/            # PWA icons (192, 512, 512-maskable)
.github/
└── workflows/deploy.yml  # CI/CD: build + deploy to GitHub Pages
docs/superpowers/
├── specs/            # Design specs (brainstorming output): YYYY-MM-DD-<topic>-design.md
└── plans/            # Implementation plans (writing-plans output): YYYY-MM-DD-<topic>-plan.md
supabase/
├── migrations/       # SQL migrations (timestamp format), sequential and idempotent
└── functions/        # Edge Functions (Deno): deadline-checker, overdue-returns-checker, email-digest
```

### File ownership rules
- **`src/lib/constants.js`** — Enums, labels, color maps, **UI style constants** (`CARD_STYLE`, `FORM_CONTAINER_STYLE`, `INPUT_STYLE`, etc.). NO icons, NO emoji.
- **`src/lib/icons.js`** — Central icon registry. The ONLY file that imports from `lucide-react`.
- **`src/components/ui/Icon.jsx`** — Icon wrapper. All components use `<Icon>`, never raw Lucide imports.
- **`src/lib/date-utils.js`** — All date formatting AND date computation. Uses `date-fns` with Italian locale (`it`). The ONLY file that imports from `date-fns`.
- **`src/lib/format-utils.js`** — Non-date formatting utilities (formatFileSize, formatCurrency, formatCurrencyDecimals, formatPercentage). NOT in date-utils.
- **`src/lib/export-utils.js`** — Excel export with dynamic import of exceljs. exportToExcel + exportToExcelMultiSheet.
- **`src/lib/generate-dossier.js`** — PDF dossier generation with dynamic import of jsPDF.
- **`src/index.css`** — Tailwind import + Mikai color @theme + @media print styles. No utility classes here.
- **`src/hooks/useExportHandler.js`** — Reusable Excel export hook. Used by 7 list pages. Multi-sheet exports (LogisticaPage) use export-utils directly.
- **`src/App.jsx`** — All route definitions with `React.lazy()` + `Suspense` for code splitting. The only file with a default export.

---

## Architecture Conventions

### Components

**Naming:** PascalCase filenames matching the named export (`EventCard.jsx` → `export function EventCard`).

**One component per file.** Small internal helpers (like `InfoRow` in `EventInfoTab`) are ok in the same file if they are only used there.

**Composition over configuration.** Prefer composing small components over megacomponents with many props. A component that takes more than 8 props should be decomposed.

**Named exports only.** `export function Button()`, never `export default`. The sole exception is `App.jsx` (Vite entry point).

**Props pattern:**
```jsx
// Destructure props. Spread remaining only when wrapping native elements.
export function Button({ children, variant = 'primary', size = 'md', ...props }) {
```

### State Management (Zustand)

**One store per domain:** `useAuthStore`, `useEventsStore`, `useMaterialsStore`, `useGadgetsStore`.

**Store naming:** file = `useEvents.js`, export = `useEventsStore`, selector usage = `useEventsStore(s => s.events)`.

**Store structure:**
```js
export const useEventsStore = create((set, get) => ({
  // Data
  events: [],
  loading: false,
  error: null,

  // Derived data: compute in components via selectors, not in store

  // Actions: async functions that call Supabase and update state
  fetchEvents: async () => { ... },
}))
```

**Selection pattern** — always use selectors to minimize re-renders:
```jsx
// GOOD — only re-renders when events changes
const events = useEventsStore(s => s.events)
const loading = useEventsStore(s => s.loading)

// BAD — re-renders on any store change
const { events, loading } = useEventsStore()
```

**UI state stays local.** Form values, modal open/close, local selections → `useState`. Only shared/persistent data goes in Zustand.

### Data Layer (Supabase)

**All Supabase calls live in Zustand stores** (`hooks/`), never in components directly.

**Query pattern — fluent builder with conditional filters:**
```js
let query = supabase.from('events').select('*').order('data_inizio', { ascending: false })
if (stato) query = query.eq('stato', stato)
if (search) query = query.ilike('titolo', `%${search}%`)
```

**FK join pattern — Supabase relationship aliases:**
```js
// Use !fk_constraint_name to disambiguate when a table has multiple FKs to the same target
supabase
  .from('events')
  .select(`
    *,
    promotore:users!events_promotore_id_fkey(id, nome, cognome),
    manager:users!events_manager_user_id_fkey(id, nome, cognome)
  `)
```
Always alias joins with readable names (`promotore`, `manager`, not `users`).

**Error handling:** Always return `{ data, error }` from store actions. Let the component decide how to display errors (toast, inline, redirect).

**RLS:** Row-level security is enforced at DB level. The frontend hides UI elements based on role/permissions for UX, but never relies on client-side checks for security.

### Routing

**All routes defined in `App.jsx`.** No dynamic route registration. All page components are lazy-loaded via `React.lazy()` with a `Suspense` fallback showing `LoadingSkeleton`.

**Protected routes** wrap content in `<ProtectedRoute>` which checks auth session.

**URL structure:** `/domain` for list, `/domain/:id` for detail, `/domain/nuovo` for create.

---

## Icon System (Centralized)

**Hard rule: NEVER use emoji Unicode as icons.** NEVER import `lucide-react` directly in components — not even "just this once".

### Three-layer architecture

1. **`src/lib/icons.js`** — Maps semantic names to Lucide components. Organized by category:
   - `TIPO_EVENTO_ICONS` — event type icons
   - `STATO_EVENTO_ICONS` — event state icons
   - `STATUS_COLOR_ICONS` — color-to-icon mapping for StatusBadge
   - `MODALITA_ICONS` — participation mode icons
   - `NAV_ICONS` — navigation icons (sidebar + bottom bar)
   - `ACTION_ICONS` — action icons (approve, reject, add, back, check, close, search, edit...)
   - `MATERIALE_ICONS` — material/logistics icons (package, truck, brand types...)
   - `WIZARD_STEP_ICONS` — wizard step icons
   - `TOAST_ICONS` — notification feedback icons
   - `FEEDBACK_ICONS` — alert/warning/info icons
   - `POSIZIONE_ICONS` — material position icons
   - `NOTIFICA_ICONS` — notification type icons + bell variants
   - `DOCUMENTO_ICONS` — document type icons + actions (upload, download, delete, preview, print, dossier)
   - `ADMIN_ICONS` — admin section icons (brand, distretti, prodotti, sedi, zone, utenti...)
   - `COMPLIANCE_ICONS` — compliance section icons (hcp, tov, interazione, audit...)
   - `CONTATTI_ICONS` — contact type icons
   - `COSTI_ICONS` — cost/quote icons
   - `CATALOGO_ICONS` — catalog browser icons (cart, filter, search...)
   - `DASHBOARD_ICONS` — dashboard-specific icons
   - `TAVOLI_ICONS` — course table icons
   - `TRASPORTO_ICONS` — transport type icons
   - `ATTIVITA_STATO_ICONS` — activity state icons
   - `CATEGORIA_ICONS` — activity category icons
   - `SOTTO_ATTIVITA_ICONS` — sub-activity type icons
   - `LOGISTICA_PERSONE_ICONS` — logistics person type icons
   - `PWA_ICONS` — PWA install/offline icons

   All 26 maps are included in `Icon.jsx`'s flat lookup for string-based name resolution.

2. **`src/components/ui/Icon.jsx`** — Wrapper component:
   ```jsx
   <Icon name="calendar" size={24} />           // by name from flat lookup
   <Icon icon={NAV_ICONS.eventi} size={24} />   // by direct component reference
   ```
   Automatically sets `aria-hidden="true"`.

3. **`src/lib/constants.js`** — Labels and color maps only. Zero icon references.

### Adding a new icon
1. Add the Lucide import in `icons.js` (in the correct import group)
2. Add the mapping to the appropriate `*_ICONS` object
3. Use `<Icon icon={...} />` in the component
4. Never import Lucide directly in a component file

---

## UI Component Library (`src/components/ui/`)

These primitives are available and should be reused — never rebuild from scratch.

### Button
```jsx
<Button variant="primary|secondary|danger|ghost" size="sm|md|lg" loading={bool} disabled={bool}>
```
Always `min-h-[48px]`. Loading shows spinner + disables. Use `<Icon>` inside for icon+text buttons.

### Icon
See **Icon System** section above for full details and usage patterns.

### Toast
```jsx
import { useToastStore } from '../ui/Toast'
const addToast = useToastStore(s => s.add)
addToast('Evento approvato!', 'success')        // types: success, error, warning
```
Auto-dismiss after 4 seconds. Shows icon + message. Positioned fixed bottom-right.

### ConfirmDialog
```jsx
<ConfirmDialog
  open={showDialog}
  title="Rifiuta evento"
  message="Sei sicuro?"
  confirmLabel="Rifiuta"
  onConfirm={handleConfirm}
  onCancel={() => setShowDialog(false)}
  danger                                         // red confirm button
/>
```
Use for all destructive actions (reject, cancel, delete).

### Tabs
```jsx
<Tabs tabs={[{ id: 'info', label: 'Info' }, ...]} activeTab={tab} onChange={setTab} />
```

### Other primitives
| Component | Usage |
|-----------|-------|
| `SearchInput` | Debounced search (300ms). Props: `value`, `onChange`, `placeholder` |
| `DatePicker` | Wraps `<input type="date">`. Props: `label`, `value`, `onChange`, `min`, `max`, `required` |
| `StatusBadge` | Color-coded badge with icon. Props: `stato`, `labels`, `colors` |
| `PageHeader` | Page title + subtitle + action buttons. Props: `title`, `subtitle`, `actions` (plural!) |
| `LoadingSkeleton` | Animated pulse lines. Props: `lines` (default 3) |
| `EmptyState` | Centered message + optional CTA. Props: `title`, `description`, `action` |
| `Breadcrumb` | Desktop-only navigation trail. Props: `items` (array of `{ label, to? }`) |
| `ExportButton` | Secondary button with spreadsheet icon. Props: `onClick`, `loading`, `label` |
| `AdminTable` | Simple admin CRUD table with column headers + clickable rows |
| `GlobalSearch` | Cmd+K search modal. Searches events, contacts, materials via `useGlobalSearchStore` |
| `NotificationBell` | Bell icon + unread badge. Desktop: toggles dropdown. Mobile: navigates to /notifiche |
| `NotificationCard` | Notification display with icon, title, message, time. Props: `notification`, `compact` |
| `NotificationDropdown` | Desktop dropdown showing last 10 notifications + "Vedi tutte" link |

---

## Date Handling

All date formatting goes through **`src/lib/date-utils.js`** using `date-fns` with Italian locale.

**Formatting functions:**

| Function | Output | Example |
|----------|--------|---------|
| `formatDate(str)` | `d MMM yyyy` | `17 mar 2026` |
| `formatDateRange(start, end)` | `d MMM yyyy — d MMM yyyy` | `17 mar 2026 — 19 mar 2026` |
| `formatDateTime(str)` | `d MMM yyyy 'alle' HH:mm` | `17 mar 2026 alle 14:30` |
| `formatRelativeTime(str)` | relative (date-fns) | `3 minuti fa`, `ieri` |

**Calendar/computation helpers:**

| Function | Purpose |
|----------|---------|
| `getMonthDays(date)` | Array of days for calendar grid (Mon-start weeks) |
| `isSameMonthAs(day, ref)` | Check if day belongs to reference month |
| `isTodayDate(date)` | Check if date is today |
| `getWeekdayLabels()` | `['Lun', 'Mar', 'Mer', ...]` |
| `addOneMonth(date)` / `subtractOneMonth(date)` | Month navigation |
| `getMonthIndex(date)` / `getFullYear(date)` | Extract month (0-11) / year |
| `todayISO()` | Today as `YYYY-MM-DD` string |
| `nowISO()` | Current instant as full ISO string |
| `toISO(value)` | Converts date value to ISO string (null-safe) |
| `daysFromToday(isoStr)` | Positive = overdue days |
| `subtractDays(isoStr, n)` | Returns ISO string or null |
| `getMonthRange()` / `getQuarterRange()` / `getYearRange()` | Returns `[startISO, endISO]` |

**Currency/number formatting (in `format-utils.js`):**

| Function | Output | Example |
|----------|--------|---------|
| `formatCurrency(value)` | `N €` (0-2 decimals) | `1.234,56 €` |
| `formatCurrencyDecimals(value)` | `€ N` (always 2 dec) | `€ 1.234,56` |
| `formatPercentage(value, dec)` | `N%` | `12,5%` |
| `formatFileSize(bytes)` | human-readable | `2,3 MB` |

**Rules:**
- All dates stored in DB as ISO strings (`YYYY-MM-DD` or `TIMESTAMPTZ`)
- All date display AND computation goes through `date-utils.js` — never import `date-fns` in components
- **No inline `new Date().toISOString()`** — use `nowISO()` for timestamps, `todayISO()` for date-only, `toISO(value)` for converting form values
- All currency formatting goes through `format-utils.js` — never use inline `toLocaleString` or `Intl.NumberFormat`
- Timezone: server uses UTC, display uses Italian locale formatting (no timezone conversion needed for date-only fields)

---

## UI/UX Design Rules

### Idiot-proof design principles

This is not optional. Every component, every screen must follow these rules.

| Rule | Implementation |
|------|---------------|
| **Touch target minimum** | `min-h-[48px] min-w-[48px]` on all interactive elements |
| **Font minimum** | 16px base (`text-base`). Prevents iOS zoom on input focus |
| **Strong visual feedback** | Selected state = check icon + filled background + thick border. Never border-only |
| **Explicit confirmations** | Destructive actions: `<ConfirmDialog>`. Success: toast + redirect or success page |
| **Wayfinding always visible** | Desktop: Breadcrumb. Mobile: MobileHeader with back arrow + subtitle |
| **Progress indication** | Wizards: continuous progress bar + icon steps + labels. Never numbered circles only |
| **Labels over icons** | Icon-only buttons must have `aria-label`. Prefer icon + text when space allows |
| **Disabled state explained** | When a button is disabled, show WHY (hint text below) |
| **No tech jargon** | All text in natural Italian. "Invia proposta" not "Submit". "Annulla" not "Cancel" |
| **Error messages are human** | "Non siamo riusciti a caricare gli eventi. Riprova." not "Error 500" |

### Mobile-first responsive

- Design for mobile first, enhance for desktop with `md:` breakpoint
- Bottom nav (`BottomBar`) on mobile, Sidebar on `md:+`
- Grid: `grid-cols-1 md:grid-cols-2` (never more than 3 columns)
- Padding: `px-4 md:px-8`
- Status flows: vertical on mobile, horizontal on desktop

### Color conventions

| Semantic | Color | Usage |
|----------|-------|-------|
| Primary action | `mikai-400/500` | Buttons, links, active states |
| Success/approved | `green-*` | Approved badges, confirm actions |
| Warning/pending | `yellow-*` | Pending states, attention banners |
| Danger/rejected | `red-*` | Reject, cancel, errors, conflicts |
| Neutral | `gray-*` | Borders, secondary text, disabled |
| Active/in progress | `emerald-*` | In-progress states |

### UI Style Constants (mandatory)

**Hard rule: NEVER hardcode card/form/summary class strings.** Always use the constants from `constants.js`:

| Constant | Value | When to use |
|----------|-------|-------------|
| `CARD_STYLE` | `bg-white rounded-xl border border-gray-200 p-4` | Any white card container |
| `CARD_HOVER_STYLE` | `...p-4 hover:shadow-md transition-all` | Clickable/interactive cards |
| `CARD_ITEM_STYLE` | `rounded-xl border border-gray-200 p-4` | Card items without bg-white |
| `FORM_CONTAINER_STYLE` | `bg-gray-50 rounded-xl p-4` | Inline forms, edit containers |
| `SUMMARY_BAR_STYLE` | `bg-mikai-50 border border-mikai-200 rounded-xl px-4 py-3` | Summary/toolbar bars |
| `GROUP_HEADING_STYLE` | `bg-gray-100 px-4 py-2 rounded-lg font-medium text-sm text-gray-700` | Group section headers |
| `INPUT_STYLE` | Full input classes | All text inputs |
| `SELECT_STYLE` | Full select classes | All select elements |
| `TEXTAREA_STYLE` | Full textarea classes | All textareas |

**Usage pattern — append extra classes via concatenation:**
```jsx
import { CARD_STYLE, CARD_HOVER_STYLE } from '../../lib/constants'

<div className={CARD_STYLE + ' space-y-3'}>           // card with inner spacing
<div className={CARD_HOVER_STYLE + ' cursor-pointer'}> // clickable card
<div className={'block ' + CARD_HOVER_STYLE}>           // prefix classes
```

Event cards add a **color band** (`w-1.5`) on the left side to indicate status at a glance.

### Event detail tab pattern (cross-component consistency)

All tab components inside EventiDetail MUST use these same patterns:

| Property | Standard | Example |
|----------|----------|---------|
| **Outer spacing** | `space-y-6` | `<div className="space-y-6">` |
| **Section heading** | `<h3 className="font-semibold text-lg">` | Never h2, never text-xl/text-base, never font-bold |
| **Cards** | `CARD_STYLE` constant | Never hardcode `bg-white rounded-xl border...` |
| **Forms** | `FORM_CONTAINER_STYLE` constant | Never hardcode `bg-gray-50 rounded-xl...` |
| **Summary bars** | `SUMMARY_BAR_STYLE` constant | Never hardcode `bg-mikai-50 border...` |
| **ProgressIndicator** | Use `<ProgressIndicator>` component | Never manual progress bars |
| **Empty states** | Use `<EmptyState>` component | Never manual `<p>` or `<div>` for empty |
| **Button gaps** | `gap-3` | Never `gap-2` for button groups |
| **Card list spacing** | `space-y-3` | Never `space-y-2` for card lists |
| **Icon color (interactive)** | `text-gray-400` | Never `text-gray-300` (poor contrast) |
| **Touch targets** | `min-h-[48px]` | Never `min-h-[36px]` on interactive elements |

When adding or modifying a tab, check neighboring tabs for pattern alignment.

### Form pattern

- All inputs: `min-h-[48px]`, `text-base`, `focus:ring-2 focus:ring-mikai-400`
- Labels: separate `<label>` with required marker (`text-red-500 *`)
- Validation: client-side with visual feedback (red border + message with `role="alert"`)
- Wizards: step-by-step, never long scrolling forms
- Date inputs: use `<DatePicker>` component which wraps native `<input type="date">`

---

## Accessibility

- Semantic HTML: `<nav>`, `<main>`, `<button>`, `<form>`, `<label>`, `<dl>`
- `aria-label` on every icon-only button
- `aria-hidden="true"` on decorative icons (handled by `<Icon>` component automatically)
- `role="alert"` on error messages
- `role="status"` on loading indicators
- Focus ring visible on all interactive elements (`focus:ring-2 focus:ring-offset-2`)
- Color is never the only differentiator — always pair with text or icon

---

## Performance

- **Route-level code splitting:** All 31 page components are lazy-loaded via `React.lazy()` in `App.jsx`. Initial bundle ~291 KB (86 KB gzip).
- **Vendor chunks:** Separated via `manualChunks` in `vite.config.js` — react (50 KB), supabase (176 KB), recharts (375 KB), date-fns (28 KB), zustand (tiny). Cached independently from app code.
- **Dynamic imports for heavy libs:** exceljs and jsPDF are dynamically imported only when export/dossier is triggered.
- **Zustand selector pattern** to minimize re-renders (see State Management above).
- **Images:** Not used in current app. If added: WebP, lazy loaded, with explicit dimensions.

---

## Database & Migrations

- Migrations in `supabase/migrations/` numbered sequentially (`001_core.sql`, `002_events.sql`...) + timestamp format (`20260324120000_...`)
- Each migration is idempotent where possible (use `IF NOT EXISTS`, `CREATE OR REPLACE`)
- All functions must set `search_path = public` (see migration 014 fix)
- RLS policies enforced on every table. Frontend does NOT rely on client-side auth checks for security
- Seed data in `012_seed.sql` — uses hex-valid UUID prefixes (`aaaa`, `bbbb`, `cccc`)
- **Never modify existing migrations.** Always create a new sequential one.
- **Column name verification (mandatory).** Before writing any `.insert()`, `.update()`, `.select()`, `.order()`, `.eq()`, or `.gte()/.lte()` call, verify that every field name matches the actual DB column name from the migration files. Supabase/PostgREST silently ignores unknown fields on INSERT/UPDATE (data loss) and returns 400 on unknown fields in SELECT/ORDER/FILTER. Common traps: `created_at` vs `data_richiesta`, `foto_url` vs `immagine_url`, `codice` vs `codice_inventario`, old column names after a RENAME. When a table is evolved (new column replaces old one), verify the old column is nullable or dropped — NOT NULL on a superseded column causes INSERT failures.
- **Compliance tables** (Phase 6C): `hcp_professionisti`, `trasferimenti_valore`, `interazioni_hcp` — RLS via `has_compliance_permission()` helper
- **Audit triggers**: `log_audit_action()` generic trigger on ToV, HCP, contacts, documents, preventivi, material_requests, permissions
- **Supabase Realtime** enabled on `notifications` table — used for live notification push to clients
- **Supabase Storage** bucket `event-documents` — private, 10MB max, authenticated RLS
- **Edge Functions** in `supabase/functions/` — Deno runtime, use `Deno.serve()`, env vars via `Deno.env.get()`
- **pg_cron** schedules for automated tasks (deadline checks, overdue returns, email digest, 90-day cleanup)

---

## Coding Standards

### General

- **Prefer editing existing files** over creating new ones
- **Centralize shared values:** if a color, icon, label, or config appears in 2+ places, extract it
- **No dead code.** Remove unused imports, variables, components. No `// removed` comments.
- **No over-engineering.** Solve the current problem. Don't build for hypothetical future needs.
- **Functions < 50 lines.** If longer, extract sub-functions.
- **Files < 300 lines.** If longer, split into focused modules.

### JavaScript/React

- Functional components only. No class components.
- Hooks at the top of the component, unconditionally (React rules of hooks).
- Destructure props in function signature.
- Early returns for guard clauses: `if (loading) return <LoadingSkeleton />`.
- Event handlers named `handle*`: `handleSubmit`, `handleApprove`.
- Boolean variables: `loading`, `canApprove`, `showForm`. No `is` prefix — keep it short.
- Wrap the app in an `<ErrorBoundary>` to catch render crashes (TODO: not yet implemented).

### Tailwind

- Use Tailwind utility classes exclusively. No custom CSS except `@theme` in `index.css`.
- Responsive: `mobile-default md:desktop-override`.
- No `!important`. If specificity is an issue, the component structure is wrong.
- Consistent spacing scale: `gap-2`, `gap-3`, `gap-4`, `space-y-3`, `space-y-4`.
- Border radius: `rounded-lg` for inputs/buttons, `rounded-xl` for cards/containers.

### Naming conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `EventCard.jsx` |
| Hook files | camelCase with `use` prefix | `useEvents.js` |
| Store exports | camelCase with `use...Store` | `useEventsStore` |
| Utilities | kebab-case | `date-utils.js` |
| Constants | SCREAMING_SNAKE_CASE | `TIPO_EVENTO` |
| Icon maps | SCREAMING_SNAKE + `_ICONS` suffix | `TIPO_EVENTO_ICONS` |
| CSS/theme vars | kebab-case | `--color-mikai-400` |
| DB tables/columns | snake_case (Italian) | `tipo_evento`, `data_inizio` |
| Env vars | `VITE_` prefix + SCREAMING_SNAKE | `VITE_SUPABASE_URL` |

---

## Adding a New Domain (Checklist)

When adding a new domain (e.g. `contatti`, `logistica`, `costi`):

1. **Store:** Create `src/hooks/use{Domain}.js` with standard Zustand pattern (data, loading, error, fetch/create/update actions)
2. **Pages:** Create `src/pages/{domain}/{Domain}List.jsx` and `{Domain}Detail.jsx`
3. **Components:** Create `src/components/{domain}/` with domain-specific cards, filters, forms
4. **Routes:** Add routes in `src/App.jsx` inside the `<ProtectedRoute>` wrapper
5. **Navigation:** Add item to `navItems` in `Sidebar.jsx` (with role filter) and optionally to `BottomBar.jsx`
6. **Icons:** Add any new icons to `src/lib/icons.js` in the appropriate category
7. **Constants:** Add any new enums/labels to `src/lib/constants.js`
8. **Breadcrumbs:** Add `<Breadcrumb>` in the list page, pass parent + current in detail pages

---

## Security

- **Secrets:** NEVER commit `.env` files. Use `.env.example` as template (committed, contains placeholder values only).
- **Env var prefix:** All client-side env vars must start with `VITE_` (Vite requirement). Never expose non-`VITE_` vars.
- **Supabase keys:** Only the anon key in frontend. Service role key NEVER in client code.
- **RLS first:** All data access rules enforced at Supabase RLS level, not in frontend JS.
- **Input sanitization:** Supabase client handles parameterized queries. Never build raw SQL strings.
- **No eval or innerHTML.** React handles escaping by default. Don't bypass it.
- **XSS prevention:** Never inject unsanitized user content into the DOM.

---

## Git & Workflow

- **Branch:** `main` is protected. Work on `master` or feature branches, PR to `main`.
- **Commits:** concise messages in English. Format: `Add/Fix/Update <what> — <why>`.
- **Migrations:** always a new sequential file, never edit existing ones.
- **No force push** to `main`. Ever.
- **Build check:** always run `npm run build` before committing to catch errors early.

---

## Skills & Agents — When to Use

### Skills (mandatory triggers)

| Skill | When to invoke |
|-------|---------------|
| **brainstorming** | BEFORE any new feature, new page, or behavioral change. Explore intent and design before writing code. |
| **writing-plans** | After brainstorming produces an approved spec. Creates step-by-step implementation plan. |
| **executing-plans** | When you have a written plan to execute. Follows the plan step-by-step with verification. |
| **systematic-debugging** | When encountering any bug, test failure, or unexpected behavior. Investigate root cause before proposing fixes. |
| **verification-before-completion** | Before claiming work is done. Run `npm run build` at minimum. Evidence before assertions. |
| **simplify** | After writing a logical chunk of code. Reviews for reuse, quality, and efficiency. |
| **requesting-code-review** | After completing a major feature or before merging. |
| **receiving-code-review** | When receiving review feedback. Verify suggestions technically before implementing. |
| **finishing-a-development-branch** | When implementation is complete. Guides merge/PR/cleanup decision. |
| **dispatching-parallel-agents** | When facing 2+ independent tasks that can run concurrently. |

Note: **test-driven-development** skill requires a test framework (vitest or similar). Not yet configured in this project — add it before using TDD.

### Agents (parallel workers)

| Agent | When to dispatch |
|-------|-----------------|
| **Explore** | Deep codebase research across multiple files. Use when Glob/Grep isn't enough. |
| **feature-dev:code-architect** | Designing feature architecture — analyzes patterns, produces blueprint. |
| **feature-dev:code-explorer** | Tracing execution paths, mapping layers, understanding existing features. |
| **feature-dev:code-reviewer** | Reviewing code for bugs, security, quality after completing a feature. |
| **code-simplifier** | After writing/modifying code. Simplifies while preserving functionality. |

### Decision flow

```
New feature request?
  → brainstorming → writing-plans → executing-plans → simplify → verification

Bug report?
  → systematic-debugging → (fix) → verification-before-completion

Code written?
  → simplify → code-reviewer → verification-before-completion

Ready to merge?
  → requesting-code-review → finishing-a-development-branch
```

### Rules

- **Always brainstorm before building.** Even "simple" features. The design can be short, but must exist.
- **Always verify before claiming done.** Run `npm run build` at minimum.
- **Use parallel agents** when tasks are independent. Don't serialize what can run concurrently.
- **Never skip systematic-debugging.** Don't guess at fixes — investigate root cause first.
- **Code review after every major step**, not just at the end.
- **Cross-component consistency in analyses.** When analyzing codebase quality, always dispatch a dedicated agent that **compares sibling components** (all tabs in the same detail page, all list pages, all admin pages). Extract wrapper classes, spacing, heading styles, card patterns — then flag differences. Analyzing files in isolation misses visual misalignment between components that share the same context.

---

## What NOT to do

These are explicit anti-patterns for this project:

- **No emoji in UI** — use `<Icon>` from the centralized system
- **No direct Lucide imports** in components — always through `Icon.jsx` + `icons.js`
- **No Supabase calls in components** — always through Zustand stores in `hooks/`
- **No English in the UI** — all user-facing text in Italian
- **No scroll-heavy forms** — use wizard pattern (step-by-step)
- **No color-only status indicators** — always pair color with icon/text
- **No tiny tap targets** — 48px minimum, always
- **No silent failures** — every error must surface to the user via toast or inline message
- **No CSS-in-JS, styled-components, or CSS modules** — Tailwind only
- **No inline date formatting** — always use `date-utils.js`
- **No inline `new Date().toISOString()`** — use `todayISO()`, `nowISO()`, or `toISO()` from `date-utils.js`
- **No direct date-fns imports** in components — always through `date-utils.js`
- **No inline currency formatting** — always use `formatCurrency`/`formatCurrencyDecimals` from `format-utils.js`
- **No duplicated export logic** — use `useExportHandler` hook for Excel exports
- **No unused dependencies** — if a package is not imported anywhere, remove it from `package.json`
- **No hardcoded card/form class strings** — always use `CARD_STYLE`, `CARD_HOVER_STYLE`, `FORM_CONTAINER_STYLE`, `SUMMARY_BAR_STYLE` from `constants.js`
- **No unverified column names in Supabase queries** — always cross-check field names against migration files before writing `.insert()`, `.update()`, `.select()`, `.order()`, `.eq()` calls. Silent data loss from mismatched names is extremely hard to debug.

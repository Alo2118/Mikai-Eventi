# Eventi Mikai — Development Rules

## Project Overview

**Mikai** is a medical device company (~50 people) in the orthopedic/trauma surgery sector. **Eventi** is their internal event management SPA — handles 40-50 events/year including workshops, surgical courses, congresses, cadaver labs, and live surgery.

### What the app does
- **Event lifecycle:** Propose → Approve → Prepare → Execute → Close
- **Material logistics:** Demo kit tracking, warehouse management, shipping, conflict detection
- **Approval workflows:** 2-level (Area Manager for small budgets, Direzione for larger ones)
- **Contacts directory:** Centralized rubrica with ownership, zone-based visibility (RLS)
- **People management:** Staff + participant tracking per event, with confirmation states
- **Event program:** Sub-activities with fornitore/confirmation. Templates per event type (giorno+orario)
- **Logistics:** Hotel + transport tracking per person, with booking states
- **Costs & Quotes:** Preventivi with approval flow, budget comparison
- **Notifications:** In-app real-time (Supabase Realtime), triggers, deadline reminders, email digest
- **Documents:** File upload per event (Supabase Storage), drag&drop, preview, download
- **Packing list, Export (Excel/PDF), Analytics (recharts), MedTech compliance (HCP/ToV)**

### Company hierarchy (maps to app roles)
- **Direzione:** CEO (Giovanni), Direttore Commerciale (Enrica) — final approval
- **Area Manager:** Regional coordinators (Nord/Centro/Sud) — approve under budget threshold
- **Commerciali/Agenti:** Field sales reps — propose events, manage local logistics
- **Ufficio:** Back-office staff (Federica=organizzazione, Nicola=marketing/demo, Ivan=spedizioni, Chiara=ordini/pagamenti)

The system works by **roles, not people** — replacements inherit the role.

### Target users
Sales reps, area managers, back-office with **highly variable digital literacy**. UI must work for someone who only uses WhatsApp — no training assumed.

### Project status
All phases (1–6C), Optimization, UX Overhaul, and Hardening are **Done**. 45+ DB tables, 60+ migrations, 31 lazy routes. Readiness Engine spec: `docs/superpowers/specs/2026-03-19-readiness-engine-design.md`.

Key business rules:
- Approval is pragmatic (anyone with `approva_eventi` can approve, including self-approval)
- Activities run in parallel — convergence dashboard, not linear workflow
- Warehouses: Monteviale (main) + Genova (secondary) + material with agents in the field
- Shipping address is independent from event venue
- Template assigns activities to roles/permissions, then person self-assigns or is assigned manually

---

## Infrastructure & Deployment

### Supabase (Backend)
- **Project ID:** `ncjpbbvlucquopyihios` — **URL:** `https://ncjpbbvlucquopyihios.supabase.co`
- **Auth:** Email/password. Admin: `nicola@mikai.it`
- **Database:** PostgreSQL, RLS on every table
- **Storage:** `event-documents` private bucket (10MB max)
- **Edge Functions:** 3 Deno functions (deadline-checker, overdue-returns-checker, email-digest)
- **Realtime:** Enabled on `notifications` table
- **Env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env` (never committed). CLI: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`
- **Supabase CLI:** `npx supabase`, project linked

### GitHub Pages (Deploy)
- **Base path:** `/Mikai-Eventi/` — **SPA routing:** `public/404.html` redirect trick
- **CI/CD:** `.github/workflows/deploy.yml` — push to `main` → build → deploy
- **Secrets:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in repository settings

### Commands
```bash
npm run dev          # Dev server (localhost:5173/Eventi/)
npm run build        # Production build
# Push migrations:
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"
```

**Migration naming:** `YYYYMMDDHHMMSS_description.sql`.
**Enum extensions:** `ALTER TYPE ... ADD VALUE` must be in a **separate migration** from policies that reference the new values.

---

## Tech Stack

React 19 + Vite 6 + TailwindCSS v4 + Zustand 5 + Supabase 2 + React Router DOM 7 + date-fns 4 (locale `it`) + lucide-react + exceljs (dynamic) + recharts 2 + jsPDF (dynamic) + vite-plugin-pwa.

**Language:** UI text always in **Italian** (natural, zero jargon).
**Brand color:** `mikai-400` = `#3296dc`. Full scale in `src/index.css` @theme.

---

## File Ownership Rules

- **`constants.js`** — Enums, labels, color maps, UI style constants. NO icons, NO emoji.
- **`icons.js`** — Central icon registry (26 category maps). The ONLY file that imports `lucide-react`.
- **`Icon.jsx`** — Icon wrapper. All components use `<Icon>`, never raw Lucide imports.
- **`date-utils.js`** — All date formatting AND computation. The ONLY file that imports `date-fns`.
- **`format-utils.js`** — formatFileSize, formatCurrency, formatCurrencyDecimals, formatPercentage.
- **`export-utils.js`** — Excel export (dynamic exceljs). `useExportHandler.js` hook for 7 list pages.
- **`generate-dossier.js`** — PDF dossier (dynamic jsPDF).
- **`App.jsx`** — All routes with `React.lazy()` + `Suspense`. Only file with default export.

---

## Architecture Conventions

### Components
- **PascalCase** filenames = named export. One component per file. **Named exports only** (except `App.jsx`).
- **Composition over configuration.** Max 8 props before decomposing.
- Destructure props in function signature. Spread remaining only when wrapping native elements.

### State Management (Zustand)
- One store per domain: file = `useEvents.js`, export = `useEventsStore`
- **Always use selectors:** `useEventsStore(s => s.events)` — never destructure the whole store
- UI state stays local (`useState`). Only shared/persistent data in Zustand.

### Data Layer (Supabase)
- **All Supabase calls in Zustand stores**, never in components
- FK joins: always alias (`promotore:users!events_promotore_id_fkey(...)`)
- Return `{ data, error }` from store actions. Component decides display.
- RLS enforced at DB level. Frontend hides UI for UX, not security.

### Routing
- All routes in `App.jsx`, lazy-loaded. URL: `/domain`, `/domain/:id`, `/domain/nuovo`
- Protected routes via `<ProtectedRoute>` wrapper.

---

## Icon System

**NEVER use emoji Unicode as icons. NEVER import `lucide-react` directly in components.**

1. **`icons.js`** — 26 category maps (TIPO_EVENTO_ICONS, ACTION_ICONS, NAV_ICONS, etc.)
2. **`Icon.jsx`** — `<Icon name="calendar" />` or `<Icon icon={NAV_ICONS.eventi} />`. Auto `aria-hidden`.
3. **`constants.js`** — Labels and colors only. Zero icon references.

To add: import in `icons.js` → add to appropriate map → use `<Icon icon={...} />`.

---

## UI Components (`src/components/ui/`)

Reuse these — never rebuild: **Button** (variant/size/loading), **Toast** (`useToastStore(s => s.add)('msg', 'success')`), **ConfirmDialog** (destructive actions), **Tabs**, **SearchInput**, **DatePicker**, **StatusBadge**, **PageHeader**, **LoadingSkeleton**, **EmptyState**, **Breadcrumb**, **ExportButton**, **AdminTable**, **GlobalSearch** (Cmd+K), **NotificationBell/Card/Dropdown**, **Modal**.

---

## Date & Format Rules

- All dates through `date-utils.js` — never import `date-fns` in components
- **No inline `new Date().toISOString()`** — use `todayISO()`, `nowISO()`, `toISO(value)`
- All currency through `format-utils.js` — never inline `toLocaleString`
- DB stores ISO strings. Display uses Italian locale.

---

## UI/UX Design Rules

### Core principles
| Rule | Implementation |
|------|---------------|
| **Touch target minimum** | `min-h-[48px] min-w-[48px]` on all interactive elements |
| **Font minimum** | 16px base (`text-base`) |
| **Strong visual feedback** | Selected = check icon + filled bg + thick border. Never border-only |
| **Explicit confirmations** | Destructive: `<ConfirmDialog>`. Success: toast |
| **No tech jargon** | Natural Italian. "Invia proposta" not "Submit" |
| **Error messages are human** | "Non siamo riusciti a caricare gli eventi. Riprova." |
| **Disabled = explained** | Show WHY a button is disabled |

### Mobile-first
- Mobile default, `md:` for desktop. BottomBar mobile, Sidebar desktop.
- Grid: `grid-cols-1 md:grid-cols-2`. Padding: `px-4 md:px-8`.

### Colors
Primary=`mikai-400/500`, Success=`green-*`, Warning=`yellow-*`, Danger=`red-*`, Neutral=`gray-*`, Active=`emerald-*`.

### UI Style Constants (mandatory)

**NEVER hardcode card/form/summary class strings.** Use from `constants.js`:
- `CARD_STYLE` / `CARD_HOVER_STYLE` / `CARD_ITEM_STYLE` — card containers
- `FORM_CONTAINER_STYLE` — inline forms
- `SUMMARY_BAR_STYLE` — summary/toolbar bars
- `GROUP_HEADING_STYLE` — group section headers
- `INPUT_STYLE` / `SELECT_STYLE` / `TEXTAREA_STYLE` — form inputs

Append extra classes via concatenation: `CARD_STYLE + ' space-y-3'`

### Event detail tab consistency

All tabs MUST use: `space-y-6` outer, `<h3 className="font-semibold text-lg">` headings, style constants for cards/forms/summaries, `<EmptyState>` for empty, `gap-3` for button groups, `space-y-3` for card lists, `text-gray-400` for interactive icons, `min-h-[48px]` touch targets.

---

## Accessibility

Semantic HTML, `aria-label` on icon-only buttons, `aria-hidden` on decorative icons (auto via `<Icon>`), `role="alert"` on errors, `role="status"` on loading, focus rings visible, color never the only differentiator.

---

## Database & Migrations

- Never modify existing migrations. Always create a new one.
- Idempotent where possible (`IF NOT EXISTS`, `CREATE OR REPLACE`)
- All functions: `search_path = public`
- **Column name verification (mandatory):** Before writing `.insert()/.update()/.select()/.order()/.eq()`, verify field names against migrations. PostgREST silently ignores unknown fields on INSERT/UPDATE (data loss).
- Compliance tables: RLS via `has_compliance_permission()`. Audit triggers on key tables.
- pg_cron for automated tasks. Edge Functions in `supabase/functions/` (Deno).

---

## Coding Standards

### General
- Prefer editing existing files. Centralize shared values. No dead code. No over-engineering.
- Functions < 50 lines. Files < 300 lines.

### JavaScript/React
- Functional components only. Hooks at top, unconditionally.
- Early returns for guards. Handlers named `handle*`. Booleans: `loading`, `canApprove` (no `is` prefix).

### Tailwind
- Utility classes only. Responsive: `mobile-default md:desktop-override`. No `!important`.
- `rounded-lg` for inputs/buttons, `rounded-xl` for cards/containers.

### Naming
Components=PascalCase, Hooks=`use*`, Stores=`use*Store`, Utils=kebab-case, Constants=SCREAMING_SNAKE, DB=snake_case Italian, Env=`VITE_*`.

---

## Security

- NEVER commit `.env`. Only anon key in frontend. RLS first.
- No eval, no innerHTML, no raw SQL strings.

---

## Git & Workflow

- `main` is protected. Work on `master`/feature branches, PR to `main`.
- Concise English commits: `Add/Fix/Update <what> — <why>`.
- Always `npm run build` before committing. No force push to `main`.

---

## Skills & Agents

### Mandatory skill triggers
- **brainstorming** → before any new feature/page/behavior change
- **writing-plans** → after approved spec
- **executing-plans** → when you have a plan to execute
- **systematic-debugging** → any bug/unexpected behavior (investigate before fixing)
- **verification-before-completion** → before claiming done (`npm run build` minimum)
- **simplify** → after writing a logical chunk of code

### Decision flow
```
New feature → brainstorming → writing-plans → executing-plans → simplify → verification
Bug → systematic-debugging → fix → verification
Code written → simplify → code-reviewer → verification
Merge → requesting-code-review → finishing-a-development-branch
```

### Rules
- Always brainstorm before building. Always verify before claiming done.
- Use parallel agents when tasks are independent.
- **Cross-component consistency:** always compare sibling components in analyses.

---

## What NOT to do

- No emoji in UI — use `<Icon>`. No direct Lucide imports. No Supabase calls in components.
- No English in UI. No scroll-heavy forms (use wizards). No color-only indicators.
- No tiny tap targets (<48px). No silent failures. No CSS-in-JS.
- No inline date/currency formatting. No direct date-fns imports.
- No hardcoded card/form class strings. No unverified column names in Supabase queries.
- No duplicated export logic — use `useExportHandler`.

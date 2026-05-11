# Raggruppamenti tab "Rientri" (Logistica) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere alla tab Rientri della pagina Logistica un selettore di raggruppamento (per urgenza / per evento / per responsabile / lista piatta) con scelta persistita in `localStorage`.

**Architecture:** Tutto frontend. Una funzione pura `groupReturns(returns, groupBy)` in `src/lib/logistics-utils.js` trasforma l'array piatto di `overdueReturns` (già fornito da `useMaterialAnalyticsStore.fetchOverdueReturns`) in un array di gruppi `{ key, label, sublabel?, count, accent?, items }`. `src/pages/logistica/LogisticaRientri.jsx` aggiunge un selettore a chip, persiste la scelta come in `EventiWizard` (try/catch su `localStorage`), e renderizza i gruppi con un header per gruppo. Nessuna modifica a DB, store, fetch, o `LogisticaPage.jsx`.

**Tech Stack:** React 19, Zustand 5 (solo lettura store esistente), TailwindCSS v4, `date-utils.js` (`daysFromToday`, `formatDate`). Nessun test runner nel progetto → verifica = `npm run build` verde + checklist manuale su dev server.

**Spec di riferimento:** `docs/superpowers/specs/2026-05-11-rientri-raggruppamenti-design.md`

---

## File Structure

| File | Responsabilità |
|---|---|
| `src/lib/logistics-utils.js` (modifica) | Aggiunge la costante `GROUP_RIENTRI` (4 opzioni) e la funzione pura `groupReturns(returns, groupBy)`. Aggiunge un import da `./date-utils`. |
| `src/pages/logistica/LogisticaRientri.jsx` (riscrittura) | Selettore a chip + persistenza `localStorage` + rendering a gruppi (header + card). `RientroCard` riceve la prop `hideContext`. Resta < 300 righe. |

Nessun altro file cambia.

---

### Task 1: `GROUP_RIENTRI` + `groupReturns` in `logistics-utils.js`

**Files:**
- Modify: `src/lib/logistics-utils.js`

**Contesto per chi implementa:** `src/lib/logistics-utils.js` oggi inizia direttamente con `export const GROUP_MAIN = [...]` (nessun import in cima). Va aggiunto in testa al file: `import { daysFromToday, formatDate } from './date-utils'`. `daysFromToday(isoDate)` ritorna `Math.max(0, differenceInDays(now, date))` → per una data passata è un intero ≥ 0 = giorni di ritardo. `formatDate(iso)` formatta in locale italiano (`gg/mm/aaaa`).

Forma di un elemento di `returns` (le due sorgenti che `fetchOverdueReturns` mette nello stesso array):
- serializzato: `{ id: <uuid>, materiale: {id, nome, codice_inventario, posizione_attuale}, evento: {id, titolo, data_fine}|null, responsabile: {id, nome, cognome}|null, data_rientro_prevista: <iso> , ... }`
- quantity-based: `{ id: 'em-<n>', event_material_id, materiale: {id, nome, codice_inventario}|null, evento: {id, titolo, data_fine, stato}|null, data_rientro_prevista: <iso>, source: 'event_material' }` — **niente `responsabile`**.

- [ ] **Step 1: Aggiungere l'import in cima a `src/lib/logistics-utils.js`**

In testa al file, prima di `export const GROUP_MAIN`:

```js
import { daysFromToday, formatDate } from './date-utils'
```

- [ ] **Step 2: Aggiungere `GROUP_RIENTRI` e `groupReturns` in fondo a `src/lib/logistics-utils.js`**

Appendere alla fine del file:

```js
// --- Raggruppamenti tab "Rientri" (Logistica) ---

export const GROUP_RIENTRI = [
  { id: 'urgenza', label: 'Per urgenza' },
  { id: 'evento', label: 'Per evento' },
  { id: 'responsabile', label: 'Per responsabile' },
  { id: 'flat', label: 'Lista piatta' },
]

function daysOverdue(item) {
  return item && item.data_rientro_prevista ? daysFromToday(item.data_rientro_prevista) : 0
}

function byDaysOverdueDesc(a, b) {
  return daysOverdue(b) - daysOverdue(a)
}

function compareIso(a, b) {
  const da = a || ''
  const db = b || ''
  return da < db ? -1 : da > db ? 1 : 0
}

// Trasforma l'array piatto di overdueReturns in gruppi { key, label, sublabel?, count, accent?, items }.
// Funzione pura: non muta `returns`. Con array vuoto/non-array → [].
export function groupReturns(returns, groupBy) {
  const items = Array.isArray(returns) ? returns.slice() : []
  if (items.length === 0) return []

  if (groupBy === 'urgenza') {
    const alta = items.filter(i => daysOverdue(i) >= 7).sort(byDaysOverdueDesc)
    const bassa = items.filter(i => daysOverdue(i) < 7).sort(byDaysOverdueDesc)
    const groups = []
    if (alta.length) groups.push({ key: '_urg_alta', label: 'Molto in ritardo (7+ giorni)', accent: 'red', count: alta.length, items: alta })
    if (bassa.length) groups.push({ key: '_urg_bassa', label: 'In ritardo (meno di 7 giorni)', accent: 'yellow', count: bassa.length, items: bassa })
    return groups
  }

  if (groupBy === 'evento') {
    const map = new Map()
    let senzaEvento = null
    for (const it of items) {
      const ev = it.evento
      if (!ev || !ev.id) {
        if (!senzaEvento) senzaEvento = { key: '_no_evento', label: 'Senza evento', sublabel: null, count: 0, items: [], _dataFine: null }
        senzaEvento.items.push(it)
        continue
      }
      let g = map.get(ev.id)
      if (!g) {
        g = {
          key: `ev-${ev.id}`,
          label: ev.titolo || 'Evento senza titolo',
          sublabel: ev.data_fine ? `Concluso il ${formatDate(ev.data_fine)}` : null,
          count: 0,
          items: [],
          _dataFine: ev.data_fine || null,
        }
        map.set(ev.id, g)
      }
      g.items.push(it)
    }
    const groups = Array.from(map.values()).sort((a, b) => compareIso(a._dataFine, b._dataFine))
    if (senzaEvento) groups.push(senzaEvento)
    for (const g of groups) { g.items.sort(byDaysOverdueDesc); g.count = g.items.length; delete g._dataFine }
    return groups
  }

  if (groupBy === 'responsabile') {
    const map = new Map()
    let senzaResp = null
    for (const it of items) {
      const r = it.responsabile
      if (!r || (r.id == null && !r.nome && !r.cognome)) {
        if (!senzaResp) senzaResp = { key: '_no_resp', label: 'Senza responsabile', count: 0, items: [] }
        senzaResp.items.push(it)
        continue
      }
      const mapKey = r.id != null ? `resp-${r.id}` : `resp-${r.nome || ''} ${r.cognome || ''}`
      let g = map.get(mapKey)
      if (!g) {
        g = { key: mapKey, label: `${r.nome || ''} ${r.cognome || ''}`.trim() || 'Responsabile', count: 0, items: [] }
        map.set(mapKey, g)
      }
      g.items.push(it)
    }
    const groups = Array.from(map.values()).sort((a, b) => (b.items.length - a.items.length) || a.label.localeCompare(b.label, 'it'))
    if (senzaResp) groups.push(senzaResp)
    for (const g of groups) { g.items.sort(byDaysOverdueDesc); g.count = g.items.length }
    return groups
  }

  // 'flat' e qualsiasi valore sconosciuto → gruppo unico senza header, ordinato per data rientro prevista ↑
  const sorted = items.sort((a, b) => compareIso(a.data_rientro_prevista, b.data_rientro_prevista))
  return [{ key: '_all', label: null, count: sorted.length, items: sorted }]
}
```

- [ ] **Step 3: Verificare che il build resti verde**

Run: `npm run build`
Expected: termina con `✓ built in …` e nessun errore (il blocco PWA dopo va bene).

- [ ] **Step 4: Commit**

```bash
git add src/lib/logistics-utils.js
git commit -m "feat: groupReturns helper + GROUP_RIENTRI for Rientri tab grouping"
```

---

### Task 2: Selettore + rendering a gruppi in `LogisticaRientri.jsx`

**Files:**
- Modify: `src/pages/logistica/LogisticaRientri.jsx` (riscrittura completa del file)

**Contesto per chi implementa:** Il file attuale (~90 righe) mostra una lista piatta di `RientroCard`. Va sostituito interamente col contenuto sotto. Note di stile del progetto rispettate qui: `<Icon>` mai Lucide diretto; `min-h-[48px]` sui target touch; `GROUP_HEADING_STYLE` da `constants.js` per gli header; pattern `localStorage` con try/catch identico a `EventiWizard`; selettore a chip nello stile di `LogisticaPeopleFilters` (`flex rounded-lg bg-gray-100 p-0.5`, chip attiva `bg-white shadow-sm text-gray-900`). `GROUP_HEADING_STYLE` vale `'bg-gray-100 px-4 py-2 rounded-lg font-medium text-sm text-gray-700'`. Icone disponibili: `FEEDBACK_ICONS.warning` (TriangleAlert) e `MATERIALE_ICONS.rientro` (RotateCcw) — già importate oggi nel file.

- [ ] **Step 1: Sostituire interamente `src/pages/logistica/LogisticaRientri.jsx` con:**

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialAnalyticsStore } from '../../hooks/useMaterialAnalytics'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { MATERIALE_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { GROUP_HEADING_STYLE } from '../../lib/constants'
import { GROUP_RIENTRI, groupReturns } from '../../lib/logistics-utils'
import { formatDate, daysFromToday } from '../../lib/date-utils'

const GROUPBY_KEY = 'eventi.logistica.rientri.groupBy'
const VALID_GROUPBY = GROUP_RIENTRI.map(g => g.id)

function loadGroupBy() {
  try {
    const raw = localStorage.getItem(GROUPBY_KEY)
    return VALID_GROUPBY.includes(raw) ? raw : 'urgenza'
  } catch {
    return 'urgenza'
  }
}

function saveGroupBy(value) {
  try {
    localStorage.setItem(GROUPBY_KEY, value)
  } catch {
    // localStorage non disponibile — ignora silenziosamente
  }
}

function RientroCard({ movement, hideContext, onNavigate }) {
  const { materiale, evento, responsabile, data_rientro_prevista } = movement
  const giorni = daysFromToday(data_rientro_prevista)
  const urgente = giorni >= 7

  return (
    <button
      type="button"
      onClick={() => onNavigate(`/eventi/${evento?.id}`)}
      className={`w-full text-left rounded-xl border p-4 hover:shadow-md transition-all min-h-[48px] ${
        urgente ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon
            icon={urgente ? FEEDBACK_ICONS.warning : MATERIALE_ICONS.rientro}
            size={20}
            className={urgente ? 'text-red-500 mt-0.5 shrink-0' : 'text-yellow-500 mt-0.5 shrink-0'}
          />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-base truncate">
              {materiale?.nome || 'Materiale sconosciuto'}
            </p>
            {materiale?.codice_inventario && (
              <p className="text-sm text-gray-500">{materiale.codice_inventario}</p>
            )}
            {hideContext !== 'evento' && (
              <p className="text-sm text-gray-500 truncate mt-0.5">{evento?.titolo || '—'}</p>
            )}
            {hideContext !== 'responsabile' && responsabile && (
              <p className="text-sm text-gray-500 mt-0.5">
                Presso: {responsabile.nome} {responsabile.cognome}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-sm font-bold ${urgente ? 'text-red-600' : 'text-yellow-600'}`}>
            +{giorni} gg
          </span>
          <span className="text-sm text-red-600 font-medium">in ritardo</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Rientro previsto: {formatDate(data_rientro_prevista)}
      </p>
    </button>
  )
}

function GroupHeader({ group }) {
  const accentText =
    group.accent === 'red' ? 'text-red-600' : group.accent === 'yellow' ? 'text-yellow-600' : 'text-gray-700'
  const accentIcon =
    group.accent === 'red' ? FEEDBACK_ICONS.warning : group.accent === 'yellow' ? MATERIALE_ICONS.rientro : null

  return (
    <div className={`${GROUP_HEADING_STYLE} flex items-center justify-between gap-2`}>
      <span className={`flex items-center gap-2 min-w-0 ${accentText}`}>
        {accentIcon && <Icon icon={accentIcon} size={16} className="shrink-0" />}
        <span className="font-medium truncate">{group.label}</span>
        {group.sublabel && <span className="text-gray-500 font-normal truncate">· {group.sublabel}</span>}
      </span>
      <span className="shrink-0 text-gray-600 font-semibold">{group.count}</span>
    </div>
  )
}

export function LogisticaRientri() {
  const overdueReturns = useMaterialAnalyticsStore(s => s.overdueReturns)
  const loading = useMaterialAnalyticsStore(s => s.overdueLoading)
  const fetchOverdueReturns = useMaterialAnalyticsStore(s => s.fetchOverdueReturns)
  const navigate = useNavigate()
  const [groupBy, setGroupBy] = useState(loadGroupBy)

  useEffect(() => { fetchOverdueReturns() }, [])
  useEffect(() => { saveGroupBy(groupBy) }, [groupBy])

  if (loading) return <div className="px-4 md:px-8 py-4"><LoadingSkeleton lines={4} /></div>

  if (overdueReturns.length === 0) {
    return (
      <EmptyState
        title="Nessun rientro in ritardo"
        description="Tutti i materiali sono rientrati in magazzino nei tempi previsti."
      />
    )
  }

  const groups = groupReturns(overdueReturns, groupBy)
  const hideContext = groupBy === 'evento' ? 'evento' : groupBy === 'responsabile' ? 'responsabile' : null

  return (
    <div className="px-4 md:px-8 py-4 space-y-4">
      <p className="text-sm text-gray-500">
        {overdueReturns.length} materiale{overdueReturns.length !== 1 ? 'i' : ''} con rientro scaduto
      </p>
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Raggruppa i rientri">
        <span className="text-sm text-gray-400">Raggruppa per:</span>
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {GROUP_RIENTRI.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupBy(g.id)}
              aria-pressed={groupBy === g.id}
              className={`px-3 py-1 rounded-md text-sm font-medium min-h-[48px] md:min-h-0 transition-colors ${
                groupBy === g.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.key} className="space-y-3">
            {group.label !== null && <GroupHeader group={group} />}
            {group.items.map(m => (
              <RientroCard key={m.id} movement={m} hideContext={hideContext} onNavigate={navigate} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificare che il build resti verde**

Run: `npm run build`
Expected: `✓ built in …`, nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/pages/logistica/LogisticaRientri.jsx
git commit -m "feat: group selector + grouped rendering in Logistica Rientri tab"
```

---

### Task 3: Verifica finale (build + convenzioni + smoke manuale)

**Files:** nessuna modifica attesa; correggere inline solo se un check fallisce.

- [ ] **Step 1: Build di produzione**

Run: `npm run build`
Expected: `✓ built in …`, exit 0.

- [ ] **Step 2: Check convenzioni di progetto**

```bash
git grep -nE "from ['\"]lucide-react['\"]" -- src/pages/logistica/LogisticaRientri.jsx src/lib/logistics-utils.js
git grep -nE "new Date\(\)\.toISOString|\.toLocaleString" -- src/pages/logistica/LogisticaRientri.jsx src/lib/logistics-utils.js
git grep -nE "bg-white rounded-xl border|bg-gray-50 .*rounded" -- src/pages/logistica/LogisticaRientri.jsx
```
Expected: la prima e la seconda non restituiscono nulla (nessun import Lucide diretto, nessuna formattazione data/valuta inline). La terza può non restituire nulla; se restituisce qualcosa che NON sia una `RientroCard` legittima (le card hanno la loro classe condizionale), valutare se va sostituito con `CARD_STYLE` — in questo file le card hanno uno stile condizionale rosso/bianco e vanno bene così.

- [ ] **Step 3: Smoke test manuale (dev server)**

Run: `npm run dev` poi aprire `http://localhost:5173/Eventi/` → Logistica → tab **Rientri**. Verificare:
1. Selettore "Raggruppa per:" con 4 chip; default attivo = "Per urgenza".
2. "Per urgenza": header "Molto in ritardo (7+ giorni)" (testo rosso + icona) e/o "In ritardo (meno di 7 giorni)" (giallo); dentro ogni gruppo le card sono ordinate dalla più in ritardo.
3. "Per evento": un header per evento (titolo + "Concluso il gg/mm/aaaa"), eventi più vecchi in cima; nelle card NON compare il titolo evento.
4. "Per responsabile": un header per persona; le righe quantity-based (senza responsabile) finiscono nel gruppo "Senza responsabile" in fondo; nelle card NON compare "Presso:".
5. "Lista piatta": nessun header, ordine per data rientro prevista crescente (come prima della modifica).
6. Cambiare raggruppamento → ricaricare la pagina → la scelta è ripristinata.
7. Se non ci sono rientri scaduti: empty state invariato ("Nessun rientro in ritardo").
8. A11y rapido: la chip attiva ha `aria-pressed="true"`, focus ring visibile col tab, le chip sono alte ≥ 48px su mobile (DevTools responsive 375px).

- [ ] **Step 4: Commit (solo se Step 2/3 hanno richiesto correzioni)**

```bash
git add -A
git commit -m "fix: address conventions/smoke findings in Rientri grouping"
```

---

## Self-Review (compilata)

- **Spec coverage:** Selettore 4 opzioni → Task 2 Step 1. Persistenza `localStorage` → Task 2 (`loadGroupBy`/`saveGroupBy`, chiave `eventi.logistica.rientri.groupBy`). `groupReturns` + `GROUP_RIENTRI` → Task 1. Rendering header con accent/sublabel/count → Task 2 (`GroupHeader`). `hideContext` su `RientroCard` → Task 2. Caso vuoto / loading invariati → Task 2. Verifica build + manuale → Task 3. Fuori scope (terza fascia, filtri, modifiche a fetch/export) rispettato.
- **Scostamento minore dalla spec:** etichetta della fascia bassa = "In ritardo (meno di 7 giorni)" invece di "(1–6 giorni)" — più robusta nel caso limite di 0 giorni interi di ritardo; semantica identica.
- **Placeholder scan:** nessun TBD/TODO/“gestire edge case” senza codice — tutto il codice è esplicito.
- **Type consistency:** `groupReturns` ritorna sempre `{ key, label, count, items }` con `sublabel?`/`accent?` opzionali; `LogisticaRientri` legge esattamente quei campi (`group.key`, `group.label`, `group.count`, `group.items`, `group.sublabel`, `group.accent`). `hideContext` ∈ {`'evento'`,`'responsabile'`,`null`} sia dove viene calcolato sia dentro `RientroCard`. `VALID_GROUPBY` derivato da `GROUP_RIENTRI` → nessun valore hardcoded divergente.

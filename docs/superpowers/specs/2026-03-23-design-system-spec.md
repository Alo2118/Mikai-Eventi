# Design System & UX Centralizzata — Spec

**Date:** 2026-03-23
**Status:** Draft
**Context:** L'app ha 65+ componenti JSX costruiti in 4 fasi. L'audit rivela pattern solidi (icone, colori, touch targets) ma inconsistenze in modali, form, input styling. La ricerca UX su software simili (Cvent, Monday.com, Airtable, Gmail) identifica pattern operativi collaudati da adottare. Questa spec definisce gli interventi su 3 livelli: componenti base, layout/navigazione, mobile.

---

## Blocco 1: Componenti Base (Design System)

### 1.1 Modal unificato

**Problema:** 4 implementazioni diverse (ConfirmDialog, BulkImportModal, LogisticaBulkModals/ModalShell, TrasportoCopyDialog). Overlay 40% vs 50%, larghezze diverse, no accessibilità (role="dialog", aria-modal, focus trap).

**Soluzione:** Nuovo componente `Modal` in `src/components/ui/Modal.jsx`.

```jsx
<Modal open={bool} onClose={fn} size="sm|md|lg|xl|full" title="..." subtitle="...">
  {children}
</Modal>
```

| Size | Max width | Uso tipico |
|------|-----------|-----------|
| `sm` | max-w-sm (384px) | ConfirmDialog |
| `md` | max-w-md (448px) | Form semplici (Hotel, Tavolo) |
| `lg` | max-w-lg (512px) | Form complessi (Trasporto) |
| `xl` | max-w-xl (576px) | — |
| `full` | max-w-6xl | BulkImport, tabelle grandi |

**Caratteristiche:**
- Overlay: `bg-black/40` (standard unico)
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` dal titolo
- Focus trap: use `focus-trap-react` library (~4KB) — hand-rolling focus trap is 60-100 lines of edge-case-heavy DOM code. Install as dependency.
- Scroll lock body quando aperto
- Header: titolo + subtitle opzionale + close X button (48px)
- Footer slot opzionale: `<Modal footer={<Button>...</Button>}>` — for confirm/cancel buttons, multi-step navigation, etc. ConfirmDialog uses footer for its Conferma/Annulla buttons. BulkImportModal uses footer for step-specific actions.
- Body: `overflow-y-auto max-h-[80vh]` con padding `px-5 py-4`
- Mobile: `max-w-full mx-4` (sempre margine laterale)
- **Z-index scale** (define once, use everywhere): `z-40` overlays/backdrops, `z-50` modals/dialogs, `z-60` toasts, `z-70` critical alerts. Currently ConfirmDialog=z-50 and Toast is fixed — verify no conflicts.

**Migrazione:** Refactorare ConfirmDialog, LogisticaBulkModals, BulkImportModal, TrasportoCopyDialog per usare `<Modal>` come wrapper. ConfirmDialog retains its existing external prop API (`title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, `danger`) — internally wraps `<Modal>` and constructs the footer JSX itself. No call sites change.

### 1.2 FormField — Input wrapper unificato

**Problema:** 10+ file definiscono INPUT_CLASS diversi (py-2 vs py-3, px-2 vs px-3 vs px-4). Label a volte text-sm, a volte text-base. Nessun wrapper riusabile per label + input + errore + asterisco.

**Soluzione:** Nuovo componente `FormField` in `src/components/ui/FormField.jsx`.

```jsx
<FormField label="Nome hotel" required error="Campo obbligatorio">
  <input type="text" value={v} onChange={fn} placeholder="..." />
</FormField>
```

**Caratteristiche:**
- Label: `text-sm font-medium text-gray-700 mb-1` (standard unico)
- Asterisco required: `<span className="text-red-500 ml-0.5">*</span>`
- Errore: `<p className="text-sm text-red-600 mt-1" role="alert">{error}</p>`
- FormField is a **layout wrapper** (label + error chrome), NOT a style injector. Children apply `INPUT_STYLE`/`SELECT_STYLE` themselves via the imported constants. No cloneElement magic.

**Costante globale:** Aggiungere a `src/lib/constants.js`:

```js
// Each constant is a full, independent string literal — no concatenation.
// Tailwind v4 static analysis requires complete class tokens visible in source.
export const INPUT_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
export const INPUT_ERROR_STYLE = 'w-full px-4 py-3 text-base border border-red-400 rounded-lg min-h-[48px] focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none bg-red-50'
export const SELECT_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none bg-white'
export const TEXTAREA_STYLE = 'w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[80px] resize-none focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none'
```

**Exception:** `BulkImportGrid` keeps its own tighter padding (`px-2 py-2`) — dense spreadsheet cells justified exception.

**Visual regression note:** Existing modal forms (LogisticaBulkModals, TrasportoForm) use `py-2 px-3`. Migrating to `py-3 px-4` increases size — verify layout in `max-w-lg` modals on mobile before merging.

Poi rimuovere tutte le costanti INPUT/SELECT/CELL sparse nei file (except BulkImportGrid).

### 1.3 StatusPill — Indicatore di stato interattivo

**Problema:** Oggi gli stati nelle tabelle sono: dropdown `<select>` (Logistica vecchia), StatusBadge (read-only), o testo plain. Inconsistente e i dropdown sono scomodi su mobile.

**Pattern di riferimento:** Monday.com — pill colorate cliccabili che mostrano lo stato con icona + testo, click apre un mini-picker.

**Soluzione:** Nuovo componente `StatusPill` in `src/components/ui/StatusPill.jsx`.

```jsx
<StatusPill
  stato="confermato"
  labels={STATO_PRENOTAZIONE}
  colors={STATO_PRENOTAZIONE_COLORE}
  editable={canEdit}
  onChange={newStato => updateHotel(id, { stato: newStato })}
/>
```

**Caratteristiche:**
- Read-only: uguale a StatusBadge (icona + testo + colore)
- Editable: click apre un piccolo popover con le opzioni, click su un'opzione cambia lo stato
- Touch-friendly: min-h-[48px] tap zone when editable (visual height can be smaller via centered content + padding), opzioni nel popover min-h-[48px]. Compliant with CLAUDE.md 48px minimum rule.
- Chiude su click fuori o Escape
- **Portaled popover:** Uses `createPortal` to `document.body` with `getBoundingClientRect`-based positioning to prevent clipping inside overflow-hidden table cells

**Dove si usa:** ogni cella stato nelle tabelle (hotel, trasporto, materiale, preventivi, iscrizioni).

### 1.4 ProgressIndicator — Barra di avanzamento

**Pattern di riferimento:** Monday.com "Battery" widget — barra orizzontale con contatore che mostra completamento per dimensione.

**Soluzione:** Nuovo componente `ProgressIndicator` in `src/components/ui/ProgressIndicator.jsx`.

```jsx
<ProgressIndicator label="Hotel" current={18} total={25} color="blue" onClick={fn} />
```

**Caratteristiche:**
- Barra orizzontale: 100% width, altezza 8px, `rounded-full`
- Testo: `label: current/total` a sinistra, percentuale a destra
- Colore: semantic (green se 100%, yellow se >50%, red se <50%) o fisso
- `onClick` opzionale: click filtra la lista per mostrare solo i mancanti
- Compatto: max 40px altezza totale

**Dove si usa:**
- Logistica: 4 barre (Tavoli, Hotel, Andata, Ritorno) in cima alla tab
- Persone: 2 barre (Staff confermati, Partecipanti confermati)
- Preparazione: barra attività completate
- Materiale: barra richieste confermate

### 1.5 DataTable — Tabella operativa con selezione

**Problema:** AdminTable esiste per CRUD admin, ma le tabelle operative (Logistica, Contatti, Materiale) sono tutte custom con pattern diversi. La Logistica ha checkbox + toolbar, ma non è riusabile.

**Soluzione:** Nuovo componente `DataTable` in `src/components/ui/DataTable.jsx`.

```jsx
<DataTable
  columns={[
    { id: 'nome', label: 'Persona', render: (row) => <span>{row.cognome} {row.nome}</span> },
    { id: 'hotel', label: 'Hotel', render: (row) => <StatusPill ... /> },
  ]}
  rows={people}
  rowKey={row => `${row.type}-${row.id}`}
  selectable={canEdit}
  selectedKeys={selected}
  onSelectionChange={setSelected}
  groupBy={groupBy}
  groupLabel={group => group.label}
  emptyMessage="Nessuna persona"
/>
```

**Caratteristiche:**
- Colonne definite dichiarativamente con `render` function + optional `sortable: true` per abilitare sort click-on-header
- Checkbox di selezione opzionale (header + righe)
- Raggruppamento opzionale (groupBy prop)
- Header con group separators
- Righe con hover e highlight selezione
- Mobile: colonne si nascondono con priorità (prime 2 sempre visibili, le altre collapse in dettaglio espandibile)

**File size note:** DataTable will be split into sub-files to stay under 300 lines: `DataTable.jsx` (column rendering + selection, ≤200L) + internal `DataTableGroup.jsx` (group separators) + `DataTableMobileRow.jsx` (expandable mobile row).

**Note:** DataTable uses `id` for column keys (not `key` as in AdminTable). AdminTable is not being replaced — it remains for admin CRUD screens. DataTable targets operational tables (Logistica, Contatti, cross-event views).

### 1.6 ActionToolbar — Barra azioni su selezione

**Pattern di riferimento:** Gmail floating action bar — appare quando c'è una selezione, mostra le azioni disponibili.

**Soluzione:** Nuovo componente `ActionToolbar` in `src/components/ui/ActionToolbar.jsx`.

```jsx
<ActionToolbar
  count={selected.size}
  actions={[
    { label: 'Imposta hotel', onClick: () => setModal('hotel') },
    { label: 'Imposta andata', onClick: () => setModal('andata') },
  ]}
  onClear={() => setSelected(new Set())}
/>
```

**Caratteristiche:**
- Appare con slide-down quando `count > 0`
- Sfondo `mikai-50`, bordo `mikai-200`, rounded-xl
- Contatore selezione a sinistra, bottoni azione a destra
- "Deseleziona" button per svuotare
- `sticky top-0 z-10` per rimanere visibile durante scroll

---

## Blocco 2: Layout e Navigazione

### 2.1 Summary Bar per tab evento

Ogni tab dell'evento mostra in cima indicatori di completamento con `ProgressIndicator`.

| Tab | Indicatori |
|-----|-----------|
| Persone | Staff confermati: X/Y · Partecipanti confermati: X/Y |
| Tavoli | Tavoli: N · Materiale assegnato: X/Y |
| Logistica | Tavoli: X/Y · Hotel: X/Y · Andata: X/Y · Ritorno: X/Y |
| Costi | Preventivi approvati: X/Y · Budget: €X / €Y |
| Preparazione | Attività completate: X/Y |

La summary bar è un pattern, non un componente — ogni tab calcola i suoi numeri e usa `ProgressIndicator`.

**Data flow for tab status dots:** Tab status values are computed in `EventiDetail.jsx` directly from existing Zustand stores (`useLogisticsStore`, `useParticipantsStore`, `useStaffStore`, `useTavoliStore`, `useCostsStore`), NOT passed up from child tab components. This avoids prop drilling. Example: `logisticaStatus = hotels.every(h => h.stato === 'confermato') ? 'complete' : hotels.length > 0 ? 'warning' : 'incomplete'`.

### 2.2 Tab con indicatori di stato

Il componente `Tabs` attuale mostra solo label. Aggiungere supporto per un **dot di stato** opzionale su ogni tab.

```jsx
<Tabs tabs={[
  { id: 'persone', label: 'Persone', status: 'complete' },
  { id: 'logistica', label: 'Logistica', status: 'warning' },
  { id: 'costi', label: 'Costi', status: 'incomplete' },
]} />
```

Status mapping (add to `constants.js`):

```js
export const TAB_STATUS_COLOR = {
  complete:   'green',   // all items done
  warning:    'yellow',  // some items pending
  incomplete: 'red',     // critical items missing
  // undefined/missing = no dot (preserves current Tabs behavior)
}
```

Dot colorato accanto al label del tab. L'utente vede a colpo d'occhio quali tab richiedono attenzione. `status` prop is optional — omitting it preserves current rendering.

### 2.3 Pagine lista standardizzate

Tutte le pagine lista (EventiList, ContattiList, MaterialeList, CostiPage) devono seguire lo stesso layout:

```
[Breadcrumb]
[PageHeader: titolo + subtitle + azioni]
[FilterBar: search + filtri specifici del dominio]
[Lista: card grid o DataTable]
[EmptyState se vuota]
```

Oggi questo pattern è già seguito informalmente ma con variazioni. Standardizzare il componente `FilterBar` con un pattern comune:

```jsx
<FilterBar>
  <SearchInput ... />
  <FilterSelect label="Tipo" options={TIPO_CONTATTO} value={tipo} onChange={setTipo} />
  <FilterSelect label="Zona" options={zones} value={zona} onChange={setZona} />
</FilterBar>
```

### 2.4 DetailPanel — DEFERRED

**Deferred to post-production review.** The Modal component covers the same need. The user base ("uses WhatsApp, no training assumed") is more familiar with centered modals than slide-in panels. Revisit after production use shows whether a slide panel is actually needed. The Modal API (`open/onClose/title/footer/children`) is compatible with a future DetailPanel — no breaking changes needed.

---

## Blocco 3: Mobile

### 3.1 CardView per liste — DEFERRED

**Deferred.** The DataTable mobile collapse pattern (extra columns hidden, expandable row detail) addresses the same need without a separate view mode. A table/card toggle adds state management complexity (persist preference? per page? per user?) for marginal gain. Revisit after DataTable mobile collapse is tested in production.

### 3.2 Filtri rapidi mobile

Su mobile i filtri multi-select sono scomodi. Usare **chip toggle**:

```
[Tutti] [Senza hotel] [Senza trasporto] [Incompleti]
```

Scroll orizzontale, tap attiva/disattiva. Sostituisce i dropdown filtro su mobile.

### 3.3 Vista checklist evento (giorno dell'evento)

Nuova vista accessibile dalla tab Persone o da un link in Logistica:

```
Corso MMC — 16 apr 2026
21 partecipanti · 15 presenti

[Search: ___________]

☐ El Ezzo Omar — Tavolo 1
☑ Cinelli Virginia — Tavolo 1
☑ Masci Giulia — Tavolo 2
☐ Speziale Tommaso — Tavolo 2
```

- Checkbox grande (48px) per segnare "presente"
- Aggiorna `stato_iscrizione` → `presente` / `assente`
- Contatore in tempo reale in cima
- Search per trovare velocemente una persona
- Funziona offline (TODO Phase 6, per ora richiede connessione)

---

## Ordine di implementazione

| Step | Componente | Dipendenze |
|------|-----------|-----------|
| 0 | Install `focus-trap-react` dependency | Nessuna. Run: `npm install focus-trap-react` |
| 1 | `INPUT_STYLE` constants + `FormField` | Nessuna |
| 2 | `Modal` unificato | Step 0 |
| 3 | Migrazione modali esistenti → `Modal` | Step 2 |
| 4 | `StatusPill` | Nessuna |
| 5 | `ProgressIndicator` | Nessuna |
| 6 | `ActionToolbar` | Nessuna |
| 7 | `DataTable` con selezione | Step 6 |
| 8 | Summary bar nelle tab | Step 5 |
| 9 | Tab con status dot | Step 8 (status values from Zustand in EventiDetail) |
| 10 | `FilterBar` standardizzato | Nessuna |
| 11 | Filtri chip mobile | Nessuna |
| 12 | Vista checklist evento | Nessuna |

Steps 0-6 sono i componenti base (Blocco 1).
Steps 7-10 sono layout/navigazione (Blocco 2).
Steps 11-12 sono mobile (Blocco 3).

**Deferred to post-production:** DetailPanel (slide-in), CardView toggle (table/card). Both can be added later without breaking changes.

---

## Migrazione componenti esistenti

I nuovi componenti non rompono nulla — si introducono gradualmente:

1. **Modal:** i modali esistenti continuano a funzionare. Li migramo uno alla volta.
2. **FormField:** i form esistenti continuano a funzionare. Si introduce FormField nei nuovi form e si migrano i vecchi.
3. **StatusPill:** sostituisce StatusBadge in contesti tabulari/griglia dove il valore può essere editabile. StatusBadge resta per contesti di display (header pagine, card liste). Quando `editable={false}`, StatusPill delega internamente a StatusBadge per evitare due render path identici.
4. **DataTable:** sostituisce le tabelle custom (Logistica, admin). Le tabelle vecchie restano fino alla migrazione.
5. **INPUT_STYLE:** una volta definita, cerca-e-sostituisci le costanti locali.

---

## Pre-implementation checks

Before starting implementation:
1. **Verify `updateHotel`/`updateTrasporto`** in `useLogistics.js` — confirm they update local state optimistically without re-fetching the full logistics payload. If they do refetch, fix before wiring StatusPill.onChange. (Current code: they DO update local state correctly via `.map()` — confirmed OK.)
2. **Install `focus-trap-react`** — Step 0 in the implementation order.

---

## Out of scope

- Dark mode
- Internazionalizzazione (l'app è solo in italiano)
- PWA offline (Phase 6)
- Test framework (prerequisito non ancora configurato)
- Refactoring degli store Zustand (funzionano bene)
- Redesign sidebar/bottombar (funzionano, miglioramenti minori)

# Raggruppamenti nella tab "Rientri" (Logistica) — Design

**Data:** 2026-05-11
**Stato:** Approvato
**Scope:** Solo frontend. Nessuna modifica a DB, store, o fetch.

## Contesto

La pagina **Logistica** (`src/pages/logistica/LogisticaPage.jsx`) ha una tab **Rientri**
(`src/pages/logistica/LogisticaRientri.jsx`) che oggi mostra una **lista piatta** dei materiali con
rientro scaduto, ordinata per `data_rientro_prevista` crescente. I dati arrivano da
`useMaterialAnalyticsStore.fetchOverdueReturns` e combinano due sorgenti:

1. **Asset serializzati** — righe di `material_movements` (`tipo = 'uscita'`, con
   `data_rientro_prevista` passata, materiale non `in_magazzino`). Hanno `materiale`
   (`nome`, `codice_inventario`, `posizione_attuale`), `evento` (`id`, `titolo`, `data_fine`),
   `responsabile` (`nome`, `cognome`), `data_rientro_prevista`.
2. **Quantity-based** — righe di `event_materials` (`stato` in `spedito`/`in_preparazione`,
   `data_rientro` nulla, evento già concluso, `effectiveRientroRichiesto` vero). Vengono
   normalizzate a `{ id: 'em-<id>', event_material_id, materiale: {id, nome, codice_inventario},
   evento, data_rientro_prevista: data_fine, source: 'event_material' }`. **Non hanno responsabile.**

Ogni elemento è reso da `RientroCard`, che mostra materiale + codice + evento + "Presso: <responsabile>"
+ "+N gg / in ritardo", ed è un bottone che naviga a `/eventi/:id`. Soglia di evidenza rossa:
`daysFromToday(data_rientro_prevista) >= 7`.

## Obiettivo

Permettere all'utente (Ivan, spedizioni) di **raggruppare** i rientri in ritardo secondo dimensioni
diverse, con la scelta **persistente** tra sessioni.

## Soluzione

### 1. Selettore di raggruppamento

Sopra la lista (sotto la riga "N materiali con rientro scaduto") un **selettore inline a chip**,
etichetta "Raggruppa per:", con 4 opzioni:

| `groupBy` | Etichetta UI | Default |
|---|---|---|
| `urgenza` | Per urgenza | ✅ |
| `evento` | Per evento | |
| `responsabile` | Per responsabile | |
| `flat` | Lista piatta | |

- Stile coerente con i selettori già presenti (`LogisticaPeopleFilters`, `CatalogBrowser`):
  container `bg-gray-100 rounded-lg p-1`, chip selezionata `bg-mikai-400 text-white`, le altre
  `text-gray-600 hover:bg-gray-200`. Touch target `min-h-[48px]` su ogni chip.
- `aria-pressed` sulla chip attiva; il gruppo ha un `aria-label="Raggruppa i rientri"`.

### 2. Persistenza

La scelta è salvata in `localStorage` (chiave `eventi.logistica.rientri.groupBy`), seguendo lo
stesso pattern di `EventiWizard`:

- `useState(() => { try { return readValid(localStorage.getItem(KEY)) } catch { return 'urgenza' } })`
  — `readValid` ritorna il valore solo se ∈ {`urgenza`, `evento`, `responsabile`, `flat`}, altrimenti `'urgenza'`.
- `useEffect(() => { try { localStorage.setItem(KEY, groupBy) } catch {} }, [groupBy])`.

### 3. Logica di raggruppamento — `groupReturns(returns, groupBy)`

Funzione **pura**, in `src/lib/logistics-utils.js` (dove già vivono `GROUP_MAIN`/`GROUP_MORE` per la
tab Persone). Esporta anche la costante `GROUP_RIENTRI` (array `{ id, label }` per le 4 opzioni).

Firma: `groupReturns(returns: ReturnItem[], groupBy: string) => Group[]`
dove `Group = { key: string, label: string|null, sublabel?: string, count: number, accent?: 'red'|'yellow', items: ReturnItem[] }`.

Helper interno `daysOverdue(item) = daysFromToday(item.data_rientro_prevista)` (0 se la data è nulla).

| `groupBy` | Gruppi | Ordine dei gruppi | Ordine item nel gruppo |
|---|---|---|---|
| `urgenza` *(default)* | **"Molto in ritardo (7+ giorni)"** `accent:'red'`; **"In ritardo (1–6 giorni)"** `accent:'yellow'`. Soglia: `daysOverdue >= 7` → red, altrimenti yellow. Gruppi vuoti omessi. | red prima di yellow | `daysOverdue` ↓ |
| `evento` | uno per `evento.id`; `label = evento.titolo`, `sublabel = "Concluso il " + formatDate(evento.data_fine)` (omesso se `data_fine` nulla). Item con `evento` nullo → gruppo `key:'_no_evento'`, `label:"Senza evento"` in fondo. | per `data_fine` ↑ (evento più vecchio prima); il gruppo "Senza evento" sempre ultimo | `daysOverdue` ↓ |
| `responsabile` | uno per `responsabile` (chiave = `responsabile.id` se presente, altrimenti `nome+cognome`); `label = "<nome> <cognome>"`. Item senza `responsabile` (le righe `event_material`) → gruppo `key:'_no_resp'`, `label:"Senza responsabile"` in fondo. | per `count` ↓, poi `label` A→Z; "Senza responsabile" sempre ultimo | `daysOverdue` ↓ |
| `flat` | gruppo unico `{ key:'_all', label:null, items:[...] }` | — | `data_rientro_prevista` ↑ (come oggi) |

Note di robustezza: la funzione non muta `returns`; gestisce `evento`, `responsabile`,
`data_rientro_prevista` nulli senza eccezioni; con `returns` vuoto ritorna `[]`.

### 4. Rendering dei gruppi in `LogisticaRientri`

- Sopra: invariata la riga "N materiale/i con rientro scaduto", poi il selettore (sezione 1).
- Sotto: per ogni `Group`:
  - se `label === null` (caso `flat`): nessun header, solo `<div className="space-y-3">` con le card
    (identico al comportamento attuale).
  - altrimenti: un header con `GROUP_HEADING_STYLE` (da `constants.js`) — `label` a sinistra,
    badge col `count` a destra. Per `accent === 'red'`: testo `text-red-600` + `Icon icon={FEEDBACK_ICONS.warning}`.
    Per `accent === 'yellow'`: testo `text-yellow-600` + `Icon icon={MATERIALE_ICONS.rientro}`.
    `sublabel` (se presente) in `text-sm text-gray-500` sotto il titolo.
  - poi `<div className="space-y-3">` con le `RientroCard` del gruppo.
  - separazione tra gruppi: `space-y-6` sul contenitore esterno.
- Empty state (`overdueReturns.length === 0`) e loading: invariati.
- Le `key` di React: per le card resta `m.id`; per i gruppi si usa `group.key`.

### 5. Ritocchi a `RientroCard`

Nuova prop opzionale `hideContext: 'evento' | 'responsabile' | null` (default `null`):

- `hideContext === 'evento'` → non rende la riga `{evento?.titolo}` (già nell'header del gruppo).
- `hideContext === 'responsabile'` → non rende la riga "Presso: <responsabile>".

`LogisticaRientri` passa `hideContext = (groupBy === 'evento' ? 'evento' : groupBy === 'responsabile' ? 'responsabile' : null)`.
Tutto il resto della card (colore urgente basato su `daysFromToday >= 7`, "+N gg", "in ritardo",
codice inventario, click → `/eventi/:id`) resta invariato.

## Impatto sui file

| File | Modifica |
|---|---|
| `src/lib/logistics-utils.js` | + `GROUP_RIENTRI`, + `groupReturns(returns, groupBy)` |
| `src/pages/logistica/LogisticaRientri.jsx` | + selettore + persistenza localStorage + rendering a gruppi; `RientroCard` riceve `hideContext`. Passa da ~90 a ~180 righe (< 300) |

Nessun'altra modifica. `LogisticaPage.jsx` invariato.

## Verifica

Il progetto non ha test runner: verifica = `npm run build` (deve restare verde) + check manuale su
dev server (`npm run dev`, `http://localhost:5173/Eventi/`):

1. Tab Rientri con dati: i 4 raggruppamenti producono header e ordinamenti come da tabella sezione 3.
2. Cambio raggruppamento → reload pagina: la scelta è ripristinata da `localStorage`.
3. Card sotto "Per evento" non mostrano il titolo evento; sotto "Per responsabile" non mostrano "Presso:".
4. Caso lista vuota: empty state invariato.
5. Caso con righe `event_material` (senza responsabile): finiscono nel gruppo "Senza responsabile".
6. A11y: chip con `aria-pressed`, focus ring visibile, touch target ≥ 48px.

## Fuori scope (YAGNI)

- Niente terza fascia di urgenza ("critico 30+ giorni") — due fasce coincidono con la soglia
  `urgente` già esistente.
- Niente filtri (solo raggruppamento).
- Nessun cambiamento a `fetchOverdueReturns` o all'export Excel della pagina Logistica.

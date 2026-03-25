# Phase 5D — Analytics & Dashboard Avanzate

**Autore:** Claude (design spec)
**Data:** 2026-03-24
**Stato:** Bozza — in attesa di approvazione sezione per sezione

---

## Indice

1. [Panoramica](#1-panoramica)
2. [Feature 1: KPI Dashboard Enhancement](#2-feature-1-kpi-dashboard-enhancement)
3. [Feature 2: Consuntivo vs Preventivo](#3-feature-2-consuntivo-vs-preventivo)
4. [Feature 3: Report Utilizzo Materiale](#4-feature-3-report-utilizzo-materiale)
5. [Feature 4: Dashboard Commerciale](#5-feature-4-dashboard-commerciale)
6. [Schema delle dipendenze](#6-schema-delle-dipendenze)
7. [Libreria grafici](#7-libreria-grafici)
8. [Migrazione database](#8-migrazione-database)
9. [File da creare/modificare](#9-file-da-creare-modificare)

---

## 1. Panoramica

Phase 5D porta analytics visive e dashboard personalizzate per ruolo nell'app Eventi Mikai. Oggi le dashboard (Strategica per direzione, Operativa per ufficio) mostrano KPI numerici semplici e liste. Questa fase aggiunge:

- **Grafici interattivi** nella Dashboard Strategica (donut, barre orizzontali, barre impilate)
- **Consuntivo vs preventivo** per singolo evento e cross-evento
- **Report utilizzo materiale** con metriche di frequenza, tempi fuori magazzino, conflitti
- **Dashboard Commerciale** personalizzata per il ruolo commerciale/area_manager (oggi redirect su `/eventi`)

### Principi guida

| Principio | Applicazione |
|-----------|-------------|
| Zero training | I grafici devono essere leggibili senza legenda complessa. Tooltip al tocco. |
| Mobile-first | I grafici si ridimensionano a `100%` larghezza su mobile. No scroll orizzontale. |
| Lightweight | Una sola libreria grafici: `recharts` (~45KB gzipped). Nessun D3 diretto. |
| Role-based | Ogni ruolo vede solo i KPI rilevanti. Il commerciale non vede budget aggregati. |
| Idiot-proof | Colori + testo sempre. Mai colore solo. Numeri grandi sopra i grafici. |

### Impatto sulle dashboard attuali

| Dashboard | Ruolo | Oggi | Dopo Phase 5D |
|-----------|-------|------|---------------|
| `DashboardStrategica` | direzione, admin | 4 KPI card + coda approvazioni + prossimi eventi | +6 KPI con grafici, filtri temporali, budget breakdown |
| `DashboardOperativa` | ufficio | Attivita per urgenza, filtri categoria | Invariata (nessuna modifica) |
| `DashboardCommerciale` | commerciale, area_manager | Non esiste (redirect `/eventi`) | Nuova: i miei eventi, le mie attivita, contatti recenti, azioni rapide |
| Report Materiale | tutti con perm. `gestione_magazzino` | Non esiste | Nuova pagina `/report/materiale` |

---

## 2. Feature 1: KPI Dashboard Enhancement

### 2.1 Obiettivo

Arricchire `DashboardStrategica` con grafici interattivi e filtri temporali, mantenendo le sezioni esistenti (coda approvazioni, prossimi eventi con semafori).

### 2.2 KPI da aggiungere

#### KPI 1: Eventi per stato

- **Tipo grafico:** Donut chart (PieChart di recharts con `innerRadius`)
- **Dati:** Count di eventi raggruppati per `stato`, filtrati per periodo selezionato
- **Colori:** Mappati da `STATO_EVENTO_COLORE` in constants.js (yellow, blue, mikai, green, emerald, gray, red)
- **Interazione:** Click su segmento filtra la lista sotto. Tooltip mostra count + label.
- **Posizione:** Prima riga, colonna sinistra (50% desktop, 100% mobile)

```
Query Supabase:
  supabase.from('events').select('stato')
    .gte('data_inizio', periodStart)
    .lte('data_inizio', periodEnd)

Calcolo client-side:
  const grouped = events.reduce((acc, e) => {
    acc[e.stato] = (acc[e.stato] || 0) + 1
    return acc
  }, {})
```

#### KPI 2: Eventi per tipo (mese/trimestre)

- **Tipo grafico:** Horizontal bar chart (BarChart di recharts con `layout="vertical"`)
- **Dati:** Count di eventi raggruppati per `tipo_evento`, filtrati per periodo
- **Colori:** Un colore fisso per tipo (da definire in constants, derivato dai TIPO_EVENTO esistenti)
- **Posizione:** Prima riga, colonna destra (50% desktop, 100% mobile)

```
Query: stessa di KPI 1 ma con select('tipo_evento')
Calcolo: raggruppamento per tipo_evento, sort discendente per count
```

#### KPI 3: Budget — previsto vs approvato vs effettivo

- **Tipo grafico:** Stacked/grouped bar chart (BarChart di recharts)
- **Dati:** Per ogni mese del periodo selezionato, somma di:
  - "Previsto" = `events.budget_previsto`
  - "Approvato" = `SUM(event_preventivi.importo) WHERE stato = 'approvato'`
  - "Effettivo" = `SUM(event_preventivi.importo_effettivo) WHERE importo_effettivo IS NOT NULL`
- **Fonte dati effettivo:** `event_preventivi.importo_effettivo` e la fonte PRIMARIA per i consuntivi (inserito per-preventivo dall'utente). `event_costs` e una tabella legacy/sommario e NON viene usata per questo KPI.
- **Colori:** Mikai-400 (previsto), green-500 (approvato), blue-500 (effettivo)
- **Allarme:** Se effettivo > approvato, barra effettivo diventa red-500
- **Posizione:** Seconda riga, full width

```
Query (2 query parallele — event_costs NON usato):
  1. supabase.from('events')
       .select('data_inizio, budget_previsto')
       .gte('data_inizio', periodStart).lte('data_inizio', periodEnd)

  2. supabase.from('event_preventivi')
       .select('event_id, importo, importo_effettivo, stato, evento:events!event_preventivi_event_id_fkey(data_inizio)')
       .eq('stato', 'approvato')
       .gte('evento.data_inizio', periodStart).lte('evento.data_inizio', periodEnd)

Calcolo client-side:
  - Approvato = SUM(importo) per mese
  - Effettivo = SUM(importo_effettivo) per mese (solo righe con importo_effettivo != null)
  - Raggruppa per mese (format 'MMM yyyy') e somma.
```

#### KPI 4: Tasso conferma partecipanti

- **Tipo grafico:** Large number + ProgressIndicator (componente esistente)
- **Dati:** Cross-event, nel periodo selezionato:
  - Numeratore: partecipanti con `stato_iscrizione IN ('confermato', 'presente')`
  - Denominatore: tutti i partecipanti
- **Formato:** `73%` grande + `146/200 confermati` sotto
- **Posizione:** Terza riga, colonna sinistra

```
Query:
  supabase.from('event_participants')
    .select('stato_iscrizione, event_id, evento:events!event_participants_event_id_fkey(data_inizio)')
    .gte('evento.data_inizio', periodStart).lte('evento.data_inizio', periodEnd)
```

#### KPI 5: Attivita in ritardo cross-evento

- **Tipo grafico:** Large number + trend indicator (freccia su/giu rispetto al periodo precedente)
- **Dati:** Count di `event_activities` dove:
  - `stato IN ('da_fare', 'in_corso')`
  - `deadline < NOW()`
  - `obbligatoria = true`
  - evento nel periodo selezionato
- **Colore:** Red se > 0, green se 0
- **Trend:** Confronto con stesso periodo precedente (es. mese precedente)
- **Posizione:** Terza riga, colonna centrale

```
Query:
  supabase.from('event_activities')
    .select('id, deadline, stato, obbligatoria, evento:events!event_activities_event_id_fkey(data_inizio)')
    .in('stato', ['da_fare', 'in_corso'])
    .eq('obbligatoria', true)
    .lt('deadline', new Date().toISOString())
    .gte('evento.data_inizio', periodStart).lte('evento.data_inizio', periodEnd)
```

#### KPI 6: Materiale fuori magazzino

- **Tipo grafico:** Large number + lista top-5 con giorni fuori
- **Dati:** Count di `materials` dove `posizione_attuale != 'in_magazzino'`
- **Dettaglio:** Per ogni materiale fuori, calcolare giorni da ultimo movimento `tipo = 'uscita'`
- **Allarme:** Se giorni > 14, riga in rosso
- **Posizione:** Terza riga, colonna destra

```
Query:
  supabase.from('materials')
    .select('id, nome, codice_inventario, posizione_attuale')
    .neq('posizione_attuale', 'in_magazzino')
    .eq('attivo', true)

  Per ciascuno, ultimo movimento:
  supabase.from('material_movements')
    .select('data_movimento')
    .eq('material_id', materialId)
    .eq('tipo', 'uscita')
    .order('data_movimento', { ascending: false })
    .limit(1)
```

**Ottimizzazione:** Fare una singola query sui movimenti di uscita per tutti i materiali fuori magazzino, poi raggruppare client-side.

### 2.3 Filtri temporali

Un componente `TimeRangeFilter` posizionato sopra tutti i KPI:

| Opzione | Valore `periodStart` | Valore `periodEnd` |
|---------|----------------------|---------------------|
| Mese corrente | Primo giorno del mese | Ultimo giorno del mese |
| Trimestre corrente | Primo giorno Q | Ultimo giorno Q |
| Anno corrente | 1 gen | 31 dic |
| Range personalizzato | DatePicker "da" | DatePicker "a" |

**Stato:** `useState` locale nel componente `DashboardStrategica`. Default: trimestre corrente (coerente con il `currentQuarterBudget` gia presente).

**UI:**
```
[ Mese ] [ Trimestre ] [ Anno ] [ Personalizzato ]
                                  ┌──────────────────────┐
                                  │ Da: [__________]     │
                                  │ A:  [__________]     │
                                  └──────────────────────┘
```

- Chip buttons con stile identico ai filtri categoria in `DashboardOperativa`
- Il range personalizzato mostra due `<DatePicker>` inline quando selezionato
- Mobile: chips scorribili orizzontalmente (`overflow-x-auto`)

### 2.4 Visibilita per ruolo

| KPI | direzione | admin | ufficio | area_manager | commerciale |
|-----|-----------|-------|---------|--------------|-------------|
| Eventi per stato | Si | Si | No | No | No |
| Eventi per tipo | Si | Si | No | No | No |
| Budget breakdown | Si | Si | No | No | No |
| Tasso conferma | Si | Si | Si | No | No |
| Attivita in ritardo | Si | Si | Si | No | No |
| Materiale fuori | Si | Si | Si* | No | No |

*Solo se ha permesso `gestione_magazzino` o `gestione_spedizioni`.

Questo e gestito nel rendering condizionale di `DashboardStrategica`, non tramite query diverse.

### 2.5 Layout responsive

**Desktop (md:+):**
```
┌─────────────────────────────────────────────────────┐
│ [TimeRangeFilter]                                    │
├────────────────────────┬────────────────────────────┤
│ KPI 1: Donut stati     │ KPI 2: Barre tipi          │
│ (PieChart)             │ (BarChart vertical)         │
├────────────────────────┴────────────────────────────┤
│ KPI 3: Budget mensile (BarChart full width)          │
├───────────┬──────────────┬──────────────────────────┤
│ KPI 4:    │ KPI 5:       │ KPI 6:                    │
│ Conferme  │ In ritardo   │ Mat. fuori                │
│ (number)  │ (number+trend)│ (number+list)            │
├───────────┴──────────────┴──────────────────────────┤
│ [Sezioni esistenti: coda approvazioni, prossimi]     │
└─────────────────────────────────────────────────────┘
```

**Mobile:**
```
[TimeRangeFilter - scroll orizzontale]
[KPI 1: Donut - full width, h-64]
[KPI 2: Barre - full width, h-64]
[KPI 3: Budget - full width, h-72]
[KPI 4] [KPI 5]    (grid-cols-2)
[KPI 6 - full width con lista]
[Coda approvazioni]
[Prossimi eventi]
```

### 2.6 Struttura componenti

```
src/components/dashboard/
├── TimeRangeFilter.jsx          # Chip + date range selector
├── KpiCard.jsx                  # Wrapper: title, value, subtitle, optional chart
├── EventiPerStatoChart.jsx      # PieChart donut
├── EventiPerTipoChart.jsx       # Horizontal BarChart
├── BudgetBreakdownChart.jsx     # Grouped BarChart mensile
├── ConfermaPartecipantiKpi.jsx  # Big number + ProgressIndicator
├── AttivitaInRitardoKpi.jsx     # Big number + trend arrow
└── MaterialeFuoriKpi.jsx        # Big number + top-5 list
```

Ciascun componente riceve `periodStart` e `periodEnd` come props e gestisce la propria query Supabase tramite lo store appropriato.

### 2.7 Store: useAnalyticsStore

Nuovo store `src/hooks/useAnalytics.js` per query aggregate cross-dominio:

```js
export const useAnalyticsStore = create((set, get) => ({
  // KPI data
  eventiPerStato: {},
  eventiPerTipo: {},
  budgetBreakdown: [],
  confermaRate: { confermati: 0, totale: 0 },
  attivitaInRitardo: { count: 0, trend: 0 },
  materialeFuori: { count: 0, items: [] },
  loading: false,

  fetchKpiData: async (periodStart, periodEnd) => {
    set({ loading: true })
    // Esegue tutte le query in parallelo con Promise.all
    const [stati, tipi, budgets, conferme, ritardi, materiali] = await Promise.all([
      get().queryEventiPerStato(periodStart, periodEnd),
      get().queryEventiPerTipo(periodStart, periodEnd),
      get().queryBudgetBreakdown(periodStart, periodEnd),
      get().queryConfermaRate(periodStart, periodEnd),
      get().queryAttivitaInRitardo(periodStart, periodEnd),
      get().queryMaterialeFuori(),
    ])
    set({
      eventiPerStato: stati,
      eventiPerTipo: tipi,
      budgetBreakdown: budgets,
      confermaRate: conferme,
      attivitaInRitardo: ritardi,
      materialeFuori: materiali,
      loading: false,
    })
  },

  // Query individuali (private-ish, chiamate da fetchKpiData)
  queryEventiPerStato: async (start, end) => { /* ... */ },
  queryEventiPerTipo: async (start, end) => { /* ... */ },
  queryBudgetBreakdown: async (start, end) => { /* ... */ },
  queryConfermaRate: async (start, end) => { /* ... */ },
  queryAttivitaInRitardo: async (start, end) => { /* ... */ },
  queryMaterialeFuori: async () => { /* ... */ },
}))
```

**Perche un nuovo store?** Le query analytics sono cross-dominio (eventi + partecipanti + attivita + materiali). Mescolarle negli store esistenti violerebbe la regola "one store per domain".

---

## 3. Feature 2: Consuntivo vs Preventivo

### 3.1 Obiettivo

Permettere di registrare i costi effettivi per ciascun preventivo e visualizzare il confronto previsto/approvato/effettivo, sia per evento sia cross-evento.

### 3.2 Schema attuale

La tabella `event_preventivi` ha `importo` (previsto), `stato` (con approvazione). La tabella `event_costs` ha sia `importo_previsto` che `importo_effettivo` ma e una tabella separata, usata per costi non legati a preventivi.

### 3.3 Modifica database

**Opzione scelta: Aggiungere `importo_effettivo` a `event_preventivi`.**

Motivazione: piu semplice che una tabella separata. Ogni preventivo puo avere un costo effettivo associato. I costi non legati a preventivi restano in `event_costs`.

#### Migrazione

```sql
-- Migration: YYYYMMDDHHMMSS_add_consuntivo_fields.sql

-- Aggiungere importo effettivo ai preventivi
ALTER TABLE event_preventivi
  ADD COLUMN IF NOT EXISTS importo_effettivo decimal,
  ADD COLUMN IF NOT EXISTS n_fattura text,
  ADD COLUMN IF NOT EXISTS data_fattura date,
  ADD COLUMN IF NOT EXISTS note_consuntivo text;
```

Campi aggiunti:
| Colonna | Tipo | Scopo |
|---------|------|-------|
| `importo_effettivo` | decimal | Costo reale a consuntivo |
| `n_fattura` | text | Numero fattura fornitore |
| `data_fattura` | date | Data fattura |
| `note_consuntivo` | text | Note libere sul consuntivo |

### 3.4 UI per singolo evento — EventCostiTab

Aggiungere una sezione "Consuntivo" sotto la sezione Preventivi esistente, visibile solo per preventivi `approvato`:

```
┌─────────────────────────────────────────────────────┐
│ Budget  [barre gia esistenti, invariate]             │
├─────────────────────────────────────────────────────┤
│ Preventivi  [lista gia esistente, invariata]         │
├─────────────────────────────────────────────────────┤
│ Consuntivo                                           │
│                                                      │
│ ┌─ Catering pranzo ────────────────────────────────┐ │
│ │ Previsto:   2.500 €                              │ │
│ │ Approvato:  2.500 €                              │ │
│ │ Effettivo:  [______] €  Fattura: [______]        │ │
│ │ Delta: —                         Data: [______]  │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─ Hotel 10 camere ───────────────────────────────┐ │
│ │ Previsto:   4.000 €                              │ │
│ │ Approvato:  3.800 €                              │ │
│ │ Effettivo:  4.200 €  Fattura: FT-2026-0472      │ │
│ │ Delta: +400 € (+10.5%)  ⚠ Supera approvato     │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ── Riepilogo ──────────────────────────────────────  │
│ Totale previsto:   6.500 €                           │
│ Totale approvato:  6.300 €                           │
│ Totale effettivo:  4.200 € (parziale)                │
│ Ancora da rendicontare: 1 preventivo                 │
└─────────────────────────────────────────────────────┘
```

#### Logica delta e color coding

```js
function deltaColor(approvato, effettivo) {
  if (effettivo == null) return 'gray'   // non ancora compilato
  const delta = effettivo - approvato
  const pct = approvato > 0 ? (delta / approvato) * 100 : 0
  if (pct > 10) return 'red'            // oltre soglia
  if (pct > 0) return 'yellow'          // leggero sforamento
  return 'green'                         // in linea o sotto
}
```

#### Alert automatico

Quando `importo_effettivo` viene salvato e supera `importo` (approvato) del >10%:
- Toast warning: "Attenzione: il costo effettivo supera il preventivo approvato del X%"
- Badge di warning nell'elenco preventivi
- Nessun blocco — e un avviso, non un gate

#### Permessi

- **Visualizzazione consuntivo:** tutti con accesso all'evento
- **Compilazione consuntivo:** utenti con permesso `gestione_costi`
- **Il commerciale** vede il totale ma non puo modificare

### 3.5 UI cross-evento — CostiPage enhancement

La pagina `/costi` (CostiPage) oggi mostra i preventivi in attesa di approvazione. Aggiungere una sezione "Analisi costi" con:

#### Tab "Analisi costi" su CostiPage

```
[ In attesa di approvazione ]  [ Analisi costi ]
```

##### Vista "Analisi costi"

3 sotto-viste selezionabili:

**a) Per fornitore:**
```
┌──────────────────────────────────────────────────┐
│ Fornitore        │ Previsto │ Approvato │ Effett. │
├──────────────────┼──────────┼───────────┼─────────┤
│ Hotel Marriott   │  12.000  │  11.500   │  11.800 │
│ Catering Rossi   │   8.500  │   8.500   │   9.200 │
│ Transfer SpA     │   3.000  │   2.800   │     —   │
└──────────────────┴──────────┴───────────┴─────────┘
```

**b) Per tipo evento:**
```
┌──────────────────────────────────────────────────┐
│ Tipo evento      │ Previsto │ Approvato │ Effett. │
├──────────────────┼──────────┼───────────┼─────────┤
│ Corso            │  45.000  │  42.000   │  38.000 │
│ Congresso        │  30.000  │  28.000   │  26.500 │
│ Workshop         │  15.000  │  14.500   │     —   │
└──────────────────┴──────────┴───────────┴─────────┘
```

**c) Per mese:**
```
Stacked bar chart (recharts) con 3 serie: previsto, approvato, effettivo
X-axis: mesi. Stesso componente BudgetBreakdownChart della dashboard.
```

#### Query per analisi costi

```js
// Per fornitore
// NOTA: fornitore_nome (testo libero) e fornitore_ref (FK a contacts) possono coesistere.
// Per raggruppare correttamente, usare come chiave di gruppo:
//   COALESCE(fornitore_ref.nome + ' ' + fornitore_ref.cognome, fornitore_nome)
// Questo garantisce che un fornitore referenziato da contatto e uno inserito a mano
// non creino duplicati se il nome coincide.
supabase.from('event_preventivi')
  .select('fornitore_nome, fornitore_ref:contacts!event_preventivi_fornitore_ref_fkey(nome, cognome), importo, importo_effettivo, stato')
  .eq('stato', 'approvato')

// Per tipo evento
supabase.from('event_preventivi')
  .select('importo, importo_effettivo, stato, evento:events!event_preventivi_event_id_fkey(tipo_evento)')
  .eq('stato', 'approvato')

// Per mese
supabase.from('event_preventivi')
  .select('importo, importo_effettivo, stato, evento:events!event_preventivi_event_id_fkey(data_inizio)')
  .eq('stato', 'approvato')
```

Raggruppamento e aggregazione avvengono client-side (volume basso: max ~200 preventivi/anno).

### 3.6 Store: estensione useCostsStore

```js
// Nuove azioni in useCostsStore

updateConsuntivo: async (preventivoId, { importo_effettivo, n_fattura, data_fattura, note_consuntivo }) => {
  return get().updatePreventivo(preventivoId, {
    importo_effettivo,
    n_fattura,
    data_fattura,
    note_consuntivo,
  })
},

fetchCostiAnalysis: async (periodStart, periodEnd) => {
  const { data, error } = await supabase
    .from('event_preventivi')
    .select('fornitore_nome, fornitore_ref:contacts!event_preventivi_fornitore_ref_fkey(nome, cognome), importo, importo_effettivo, stato, evento:events!event_preventivi_event_id_fkey(tipo_evento, data_inizio)')
    .eq('stato', 'approvato')
    .gte('evento.data_inizio', periodStart)
    .lte('evento.data_inizio', periodEnd)
  return { data: data || [], error }
},
```

---

## 4. Feature 3: Report Utilizzo Materiale

### 4.1 Obiettivo

Dare visibilita sull'utilizzo reale dei materiali: quali vengono usati di piu, quanto restano fuori magazzino, quanto spesso generano conflitti, e quando sono prenotati.

### 4.2 Pagina dedicata: `/report/materiale`

Nuova pagina accessibile da sidebar per ruoli con `gestione_magazzino` o `gestione_spedizioni`.

### 4.3 Metriche per materiale

Per ciascun materiale attivo, calcolare:

| Metrica | Definizione | Query |
|---------|-------------|-------|
| **Frequenza uso** | N. di `event_materials` associati nell'ultimo anno | `COUNT(event_materials) WHERE COALESCE(product_id, material_id) = X AND created_at > 1 anno fa` (usa `product_id` come identificativo primario, fallback su `material_id` per righe legacy) |
| **Tempo medio fuori magazzino** | Media giorni tra `uscita` e `rientro` nei `material_movements` | Calcolo su coppie uscita/rientro |
| **Tasso rientro puntuale** | % movimenti rientrati entro `data_rientro_prevista` | `rientro.data_movimento <= uscita.data_rientro_prevista` |
| **Conflitti generati** | N. di volte in cui il materiale era gia prenotato quando richiesto | Calcolato da sovrapposizioni in `event_materials` |

### 4.4 Calcolo metriche — logica dettagliata

#### Frequenza uso

> **Nota:** Dopo la migrazione 20260318000017 (materiale redesign), `material_id` e nullable e molte righe hanno `product_id` (catalogo) al posto di `material_id` (inventario fisico legacy). Usare `product_id` come identificativo primario, con fallback su `material_id` per righe legacy.

```js
// Query singola per tutti i materiali — include sia product_id che material_id
const { data } = await supabase
  .from('event_materials')
  .select('material_id, product_id')
  .gte('created_at', oneYearAgo)

// Client-side grouping: usa product_id come chiave primaria, fallback material_id
const frequenza = data.reduce((acc, row) => {
  const key = row.product_id ? `product:${row.product_id}` : `material:${row.material_id}`
  if (!key || key === 'product:null' && key === 'material:null') return acc // skip rows with neither
  acc[key] = (acc[key] || 0) + 1
  return acc
}, {})
```

#### Tempo medio fuori magazzino

```js
// Tutti i movimenti di uscita e rientro
const { data: movimenti } = await supabase
  .from('material_movements')
  .select('material_id, tipo, data_movimento, data_rientro_prevista')
  .in('tipo', ['uscita', 'rientro'])
  .order('data_movimento')

// Per ogni materiale, accoppiare uscite con rientri successivi
// Calcolare differenza in giorni con differenceInDays(date-fns)
```

#### Tasso rientro puntuale

```js
// Movimenti di uscita con data_rientro_prevista
const uscite = movimenti.filter(m => m.tipo === 'uscita' && m.data_rientro_prevista)

// Per ciascuna, trovare il rientro successivo dello stesso materiale
// puntuali = rientro.data_movimento <= uscita.data_rientro_prevista
// tasso = puntuali / totale_uscite_con_previsione
```

#### Conflitti generati

> **Nota:** Dopo la migrazione 20260318000018, `data_inizio_utilizzo` e `data_fine_utilizzo` sono nullable. Filtrare sempre le righe con date NULL prima di calcolare sovrapposizioni.

```js
// Per ogni materiale, trovare event_materials con date sovrapposte
// IMPORTANTE: escludere righe con date NULL (non possono generare conflitti)
const { data: assignments } = await supabase
  .from('event_materials')
  .select('material_id, product_id, data_inizio_utilizzo, data_fine_utilizzo')
  .neq('stato', 'rifiutato')
  .not('data_inizio_utilizzo', 'is', null)
  .not('data_fine_utilizzo', 'is', null)
  .order('data_inizio_utilizzo')

// Client-side: per ogni materiale (raggruppare per product_id o material_id), contare coppie sovrapposte
```

### 4.5 Viste della pagina

#### Vista 1: Top 10 materiali piu utilizzati

```
┌──────────────────────────────────────────────────────────┐
│ Top 10 materiali piu utilizzati (ultimo anno)             │
│                                                          │
│ 1. Kit Demo Anca XL       ████████████████ 18 eventi    │
│ 2. Strumentario Ginocchio  ███████████████ 16 eventi     │
│ 3. Kit Demo Spalla Mini   ██████████████ 14 eventi       │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

Horizontal bar chart con `recharts` BarChart layout="vertical".

#### Vista 2: Materiale attualmente fuori magazzino

```
┌──────────────────────────────────────────────────────────┐
│ Materiale fuori magazzino (7 pezzi)                       │
│                                                          │
│ ┌─ Kit Demo Anca XL ──────────────────────────────────┐ │
│ │ Posizione: Presso evento                            │ │
│ │ Uscita: 15 mar 2026  Rientro previsto: 20 mar 2026 │ │
│ │ ⚠ In ritardo di 4 giorni                           │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─ Strumentario Ginocchio ────────────────────────────┐ │
│ │ Posizione: In transito                              │ │
│ │ Uscita: 22 mar 2026  Rientro previsto: 28 mar 2026 │ │
│ └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Lista card, stessa estetica di quelle usate in `DashboardOperativa`. Materiali in ritardo evidenziati con `border-l-4 border-l-red-400`.

#### Vista 3: Tabella metriche

```
┌───────────────┬──────────┬────────────┬────────────┬───────────┐
│ Materiale     │ Uso/anno │ Gg medi    │ Rientro    │ Conflitti │
│               │          │ fuori      │ puntuale   │           │
├───────────────┼──────────┼────────────┼────────────┼───────────┤
│ Kit Anca XL   │    18    │   5.2 gg   │    78%     │     3     │
│ Strum. Ginoc. │    16    │   4.8 gg   │    92%     │     1     │
│ Kit Spalla M  │    14    │   6.1 gg   │    65%     │     5     │
└───────────────┴──────────┴────────────┴────────────┴───────────┘
```

- Tabella responsive: su mobile, ogni riga diventa una card con le metriche impilate verticalmente
- Ordinamento cliccando sulle intestazioni colonna
- Colori: rientro puntuale < 70% in rosso, > 90% in verde

#### Vista 4: Heatmap prenotazioni (fase futura — opzionale)

Un calendario (griglia mese x materiale) che mostra quando i materiali sono prenotati. Complessita elevata: **differita a Phase 6** a meno che non venga esplicitamente richiesta.

Alternativa piu semplice per Phase 5D: mostrare un elenco "Prossime prenotazioni" con le date di utilizzo programmate dal mese in corso.

```
┌──────────────────────────────────────────────────────────┐
│ Prossime prenotazioni                                     │
│                                                          │
│ 25-27 mar  Kit Demo Anca XL     → Corso Bologna          │
│ 28-30 mar  Strum. Ginocchio     → Workshop Milano         │
│  2-4 apr   Kit Demo Anca XL     → Congresso Roma          │
│  2-4 apr   Kit Demo Spalla Mini → Congresso Roma          │
└──────────────────────────────────────────────────────────┘
```

### 4.6 Struttura componenti

```
src/pages/report/
└── ReportMaterialePage.jsx

src/components/report/
├── TopMaterialiChart.jsx        # Bar chart top 10
├── MaterialeFuoriList.jsx       # Card list fuori magazzino
├── MetricheMaterialeTable.jsx   # Tabella con sort
└── ProssimePrenotazioni.jsx     # Lista prossime prenotazioni
```

### 4.7 Store: estensione useMaterialsStore

```js
// Nuove azioni

fetchMaterialAnalytics: async () => {
  set({ loading: true })
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const [usage, movements, fuori] = await Promise.all([
    supabase.from('event_materials')
      .select('material_id, product_id')
      .gte('created_at', oneYearAgo.toISOString()),
    supabase.from('material_movements')
      .select('material_id, tipo, data_movimento, data_rientro_prevista')
      .in('tipo', ['uscita', 'rientro'])
      .gte('data_movimento', oneYearAgo.toISOString()),
    supabase.from('materials')
      .select('id, nome, codice_inventario, posizione_attuale')
      .neq('posizione_attuale', 'in_magazzino')
      .eq('attivo', true),
  ])

  // Client-side aggregation
  const analytics = computeMaterialMetrics(usage.data, movements.data, fuori.data)
  set({ materialAnalytics: analytics, loading: false })
  return analytics
},

fetchUpcomingBookings: async () => {
  // NOTA: data_inizio_utilizzo e data_fine_utilizzo sono nullable (migrazione 20260318000018)
  // Filtrare le righe con date NULL e usare product_id come identificativo primario
  const { data } = await supabase
    .from('event_materials')
    .select('material_id, product_id, data_inizio_utilizzo, data_fine_utilizzo, material:materials(nome, codice_inventario), product:products(nome, codice), evento:events(titolo)')
    .not('data_inizio_utilizzo', 'is', null)
    .not('data_fine_utilizzo', 'is', null)
    .gte('data_fine_utilizzo', new Date().toISOString())
    .neq('stato', 'rifiutato')
    .order('data_inizio_utilizzo')
    .limit(20)
  return data || []
},
```

### 4.8 Navigazione

- **Sidebar:** Nuova voce "Report Materiale" sotto "Materiale", visibile solo se `hasPermission('gestione_magazzino') || hasPermission('gestione_spedizioni')`
- **Route:** Aggiungere come figlio del layout protetto esistente in App.jsx:
  ```jsx
  // Inside the existing <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
  <Route path="/report/materiale" element={<ReportMaterialePage />} />
  ```
- **Breadcrumb:** `[ Dashboard ] > [ Report Materiale ]`

---

## 5. Feature 4: Dashboard Commerciale

### 5.1 Obiettivo

Dare al commerciale (e area_manager) una homepage personalizzata al login, al posto del redirect a `/eventi`. Mostra informazioni rilevanti per il suo lavoro quotidiano senza grafici complessi.

### 5.2 Routing

Modifica a `DashboardRouter.jsx`:

```jsx
// Attuale:
// return <Navigate to="/eventi" replace />

// Nuovo:
// NOTA: preservare il check esistente per ufficio con solo permessi magazzino
// (warehouse-only mode) che mostra DashboardOperativa. Questo blocco va DOPO
// i check esistenti per direzione/admin e ufficio.
if (ruolo === 'commerciale' || ruolo === 'area_manager') {
  return <DashboardCommerciale />
}
return <Navigate to="/eventi" replace />
```

### 5.3 Layout

```
┌──────────────────────────────────────────────────────────┐
│ Dashboard Commerciale                                     │
│ Ciao, Marco                                               │
├──────────────────────────────────────────────────────────┤
│ Azioni rapide                                             │
│ [  Proponi evento  ]  [  Aggiungi contatto  ]             │
├──────────────────────┬───────────────────────────────────┤
│ I miei eventi        │ Le mie attivita                    │
│                      │                                    │
│ ┌ Prossimi ────────┐ │ ┌ Scadenza oggi ───────────────┐ │
│ │ Corso Bologna    │ │ │ Confermare relatore (Corso BO)│ │
│ │ 28-30 mar 2026   │ │ │ Inviare programma (WS MI)    │ │
│ │ In preparazione  │ │ └──────────────────────────────┘ │
│ └──────────────────┘ │                                    │
│                      │ ┌ Entro 3 giorni ──────────────┐ │
│ ┌ In attesa ───────┐ │ │ Prenotare hotel (Congresso)  │ │
│ │ Workshop Napoli  │ │ └──────────────────────────────┘ │
│ │ Proposto 20 mar  │ │                                    │
│ └──────────────────┘ │                                    │
├──────────────────────┴───────────────────────────────────┤
│ Riepilogo zona                                            │
│                                                          │
│ Eventi Q1 2026: 4 confermati, 1 in attesa                │
│ Partecipanti confermati: 45/62 (73%)                      │
│ Contatti aggiunti questo mese: 8                          │
├──────────────────────────────────────────────────────────┤
│ Contatti recenti                                          │
│ Dr. Rossi (aggiunto 22 mar) · Dr. Bianchi (20 mar)       │
└──────────────────────────────────────────────────────────┘
```

### 5.4 Sezioni

#### 5.4.1 Azioni rapide

Due bottoni grandi (`Button variant="primary"` e `variant="secondary"`) che linkano a:
- `/eventi/nuovo` — wizard creazione evento
- `/contatti/nuovo` — form nuovo contatto (se esiste) o `/contatti` con auto-apertura form

Stile: `grid grid-cols-2 gap-3`, bottoni `min-h-[56px]` con icona + testo.

#### 5.4.2 I miei eventi

Query: `useEventsStore.fetchEvents()` con `roleFilter` gia attivo (il commerciale vede solo i suoi per RLS/store filter).

Visualizzazione:
- **Prossimi:** eventi con `data_inizio >= oggi`, ordinati per data, max 5
- **In attesa:** eventi con `stato = 'proposto'`, ordinati per data creazione

Ogni evento e una card cliccabile (link a `/eventi/:id`) con:
- Titolo, date, stato badge
- Se `proposto`: messaggio "In attesa di approvazione da X giorni"

#### 5.4.3 Le mie attivita

Query: `useActivitiesStore.fetchMyActivities(userId)` — gia implementata.

Raggruppamento con `urgencyGroup()` (funzione gia in `DashboardOperativa`). Mostrare solo:
- Overdue (rosso)
- Oggi (giallo)
- Entro 3 giorni (blu)

Max 5 attivita visibili, poi "Vedi tutte" che porta a DashboardOperativa.

#### 5.4.4 Riepilogo zona

Dati aggregati per il commerciale:
- Count eventi per stato nel trimestre corrente
- Tasso conferma partecipanti sui propri eventi
- Contatti aggiunti nell'ultimo mese

```js
// Contatti aggiunti questo mese (query ad-hoc)
const oneMonthAgo = new Date()
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

supabase.from('contacts')
  .select('id', { count: 'exact', head: true })
  .eq('proprietario_id', userId)
  .gte('created_at', oneMonthAgo.toISOString())
```

#### 5.4.5 Contatti recenti

Ultimi 5 contatti creati dal commerciale:

```js
supabase.from('contacts')
  .select('id, nome, cognome, tipo_contatto, created_at')
  .eq('proprietario_id', userId)
  .order('created_at', { ascending: false })
  .limit(5)
```

Visualizzazione: lista compatta, ogni riga cliccabile verso `/contatti/:id`.

### 5.5 Struttura componenti

```
src/pages/dashboard/
├── DashboardCommerciale.jsx    # Nuovo
├── DashboardRouter.jsx         # Modificato
├── DashboardStrategica.jsx     # Modificato (feature 1)
└── DashboardOperativa.jsx      # Invariato

src/components/dashboard/
├── QuickActions.jsx             # Bottoni azione rapida
├── MyEventsSection.jsx          # I miei eventi (prossimi + pending)
├── MyActivitiesSection.jsx      # Le mie attivita urgenti
├── ZoneSummary.jsx              # Riepilogo zona con counts
└── RecentContacts.jsx           # Ultimi contatti aggiunti
```

### 5.6 Store: useDashboardCommercialeStore

Opzione 1: Nuovo store dedicato.
Opzione 2: Estendere `useAnalyticsStore`.

**Scelta: Opzione 1** — la dashboard commerciale e un dominio a se, con query specifiche per utente.

```js
// src/hooks/useDashboardCommerciale.js

export const useDashboardCommercialeStore = create((set, get) => ({
  myEvents: [],
  myActivities: [],
  zoneSummary: null,
  recentContacts: [],
  loading: false,

  fetchAll: async (userId) => {
    set({ loading: true })
    const [events, activities, zone, contacts] = await Promise.all([
      get().fetchMyEvents(userId),
      get().fetchMyActivities(userId),
      get().fetchZoneSummary(userId),
      get().fetchRecentContacts(userId),
    ])
    set({
      myEvents: events,
      myActivities: activities,
      zoneSummary: zone,
      recentContacts: contacts,
      loading: false,
    })
  },

  fetchMyEvents: async (userId) => {
    const { data } = await supabase
      .from('events')
      .select('id, titolo, data_inizio, data_fine, stato, tipo_evento, created_at')
      .eq('promotore_id', userId)
      .in('stato', ['proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso'])
      .order('data_inizio')
      .limit(10)
    return data || []
  },

  fetchMyActivities: async (userId) => {
    // Riusa la query di useActivitiesStore.fetchMyActivities
    const { data } = await supabase
      .from('event_activities')
      .select('*, evento:events!event_activities_event_id_fkey(id, titolo)')
      .eq('assegnato_a', userId)
      .in('stato', ['da_fare', 'in_corso'])
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(10)
    return data || []
  },

  fetchZoneSummary: async (userId) => {
    const now = new Date()
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const [events, participants, newContacts] = await Promise.all([
      supabase.from('events')
        .select('stato')
        .eq('promotore_id', userId)
        .gte('data_inizio', qStart.toISOString()),
      supabase.from('event_participants')
        .select('stato_iscrizione, evento:events!event_participants_event_id_fkey(promotore_id, data_inizio)')
        .eq('evento.promotore_id', userId)
        .gte('evento.data_inizio', qStart.toISOString()),
      supabase.from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('proprietario_id', userId)
        .gte('created_at', oneMonthAgo.toISOString()),
    ])

    const eventiByStato = (events.data || []).reduce((acc, e) => {
      acc[e.stato] = (acc[e.stato] || 0) + 1
      return acc
    }, {})

    const parts = participants.data || []
    const confermati = parts.filter(p => ['confermato', 'presente'].includes(p.stato_iscrizione)).length

    return {
      eventiByStato,
      partecipantiConfermati: confermati,
      partecipantiTotale: parts.length,
      contattiNuovi: newContacts.count || 0,
    }
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

### 5.7 Area Manager: differenze

L'area_manager vede la stessa dashboard, ma:
- "I miei eventi" filtra per `manager_user_id` invece di `promotore_id`
- "Riepilogo zona" aggrega per zona gestita (tutti i commerciali della sua area)
- Aggiunta sezione: "Eventi dei miei commerciali" — lista eventi proposti dai commerciali nella sua zona, per rapida approvazione

Query zona:
```js
// Ottenere gli user_id dei commerciali nella stessa zona
const { data: zoneUsers } = await supabase
  .from('users')
  .select('id')
  .eq('zone_id', profile.zone_id)
  .eq('ruolo', 'commerciale')

// Poi filtrare eventi per promotore_id IN zoneUsers.map(u => u.id)
```

---

## 6. Schema delle dipendenze

```
Feature 1 (KPI Dashboard)
  ├── recharts (dependency)
  ├── useAnalyticsStore (nuovo)
  ├── TimeRangeFilter (nuovo)
  ├── 6 componenti chart (nuovi)
  └── DashboardStrategica (modifica)

Feature 2 (Consuntivo)
  ├── Migrazione DB (add columns)
  ├── useCostsStore (estensione)
  ├── EventCostiTab (modifica)
  ├── ConsuntivoSection (nuovo)
  └── CostiPage (modifica — nuova tab)

Feature 3 (Report Materiale)
  ├── useMaterialsStore (estensione)
  ├── ReportMaterialePage (nuova pagina)
  ├── 4 componenti report (nuovi)
  ├── App.jsx (nuova route)
  └── Sidebar.jsx (nuova voce nav)

Feature 4 (Dashboard Commerciale)
  ├── useDashboardCommercialeStore (nuovo)
  ├── DashboardCommerciale (nuova pagina)
  ├── 5 componenti sezione (nuovi)
  └── DashboardRouter (modifica)
```

**Ordine di implementazione suggerito:**
1. Feature 2 (Consuntivo) — richiede migrazione DB, punto di partenza
2. Feature 4 (Dashboard Commerciale) — indipendente, niente grafici
3. Feature 1 (KPI Dashboard) — richiede recharts, piu complessa
4. Feature 3 (Report Materiale) — puo riusare recharts da Feature 1

---

## 7. Libreria grafici

### Scelta: recharts

| Criterio | recharts | chart.js + react-chartjs-2 | nivo |
|----------|----------|---------------------------|------|
| Bundle size (gzip) | ~45KB | ~65KB | ~80KB |
| React-native | Si (componenti React) | No (wrapper canvas) | Si |
| Responsive | Si (ResponsiveContainer) | Si | Si |
| Touch support | Si (Tooltip su touch) | Parziale | Si |
| Learning curve | Bassa | Media | Alta |
| Customization | Buona | Buona | Eccellente |

**Installazione:**
```bash
npm install recharts
```

> **Nota:** `recharts` ha una peer dependency su `react-is`. Se non gia presente nel progetto, installare anche `npm install react-is`.

### Pattern di utilizzo standard

```jsx
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

function EventiPerStatoChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-lg mb-3">Eventi per stato</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="stato"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={STATO_COLORS[entry.stato]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} eventi`, STATO_EVENTO[name]]} />
          <Legend formatter={(value) => STATO_EVENTO[value]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### Colori per i grafici

Definire una mappa colori hex in `constants.js` o direttamente nei componenti chart:

```js
// Colori hex per recharts (Tailwind classes non funzionano in SVG)
export const CHART_COLORS = {
  mikai: '#3296dc',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  blue: '#3b82f6',
  emerald: '#10b981',
  gray: '#9ca3af',
  purple: '#a855f7',
  orange: '#f97316',
}

// Mapping stato evento -> colore hex per chart
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

// Mapping tipo evento -> colore hex per chart (KPI 2: eventi per tipo)
export const TIPO_EVENTO_CHART_COLOR = {
  workshop: CHART_COLORS.mikai,
  corso: CHART_COLORS.blue,
  congresso: CHART_COLORS.purple,
  cadaver_lab: CHART_COLORS.emerald,
  live_surgery: CHART_COLORS.red,
  simposio: CHART_COLORS.orange,
  evento_aziendale: CHART_COLORS.yellow,
  altro: CHART_COLORS.gray,
}
```

---

## 8. Migrazione database

### Migrazione 1: Campi consuntivo su event_preventivi

```sql
-- YYYYMMDDHHMMSS_add_consuntivo_fields.sql

ALTER TABLE event_preventivi
  ADD COLUMN IF NOT EXISTS importo_effettivo decimal,
  ADD COLUMN IF NOT EXISTS n_fattura text,
  ADD COLUMN IF NOT EXISTS data_fattura date,
  ADD COLUMN IF NOT EXISTS note_consuntivo text;

-- Indice per report costi (query per fornitore con importo effettivo)
CREATE INDEX IF NOT EXISTS idx_preventivi_consuntivo
  ON event_preventivi(importo_effettivo)
  WHERE importo_effettivo IS NOT NULL;
```

Nessuna altra migrazione necessaria. Le feature 1, 3, 4 lavorano su tabelle esistenti con query di lettura.

---

## 9. File da creare/modificare

### Nuovi file

| File | Feature | Scopo |
|------|---------|-------|
| `src/hooks/useAnalytics.js` | 1 | Store per KPI aggregati cross-dominio |
| `src/hooks/useDashboardCommerciale.js` | 4 | Store per dashboard commerciale |
| `src/components/dashboard/TimeRangeFilter.jsx` | 1 | Selettore periodo temporale |
| `src/components/dashboard/KpiCard.jsx` | 1 | Wrapper card per KPI con titolo/valore/chart |
| `src/components/dashboard/EventiPerStatoChart.jsx` | 1 | Donut chart stati |
| `src/components/dashboard/EventiPerTipoChart.jsx` | 1 | Barre orizzontali tipi |
| `src/components/dashboard/BudgetBreakdownChart.jsx` | 1, 2 | Barre mensili previsto/approvato/effettivo |
| `src/components/dashboard/ConfermaPartecipantiKpi.jsx` | 1 | Big number tasso conferma |
| `src/components/dashboard/AttivitaInRitardoKpi.jsx` | 1 | Big number + trend |
| `src/components/dashboard/MaterialeFuoriKpi.jsx` | 1 | Big number + top-5 list |
| `src/components/dashboard/QuickActions.jsx` | 4 | Bottoni azione rapida |
| `src/components/dashboard/MyEventsSection.jsx` | 4 | I miei eventi |
| `src/components/dashboard/MyActivitiesSection.jsx` | 4 | Le mie attivita urgenti |
| `src/components/dashboard/ZoneSummary.jsx` | 4 | Riepilogo zona |
| `src/components/dashboard/RecentContacts.jsx` | 4 | Contatti recenti |
| `src/components/eventi/ConsuntivoSection.jsx` | 2 | Sezione consuntivo nel tab costi |
| `src/pages/dashboard/DashboardCommerciale.jsx` | 4 | Pagina dashboard commerciale |
| `src/pages/report/ReportMaterialePage.jsx` | 3 | Pagina report materiale |
| `src/components/report/TopMaterialiChart.jsx` | 3 | Bar chart top 10 |
| `src/components/report/MaterialeFuoriList.jsx` | 3 | Lista materiale fuori |
| `src/components/report/MetricheMaterialeTable.jsx` | 3 | Tabella metriche con sort |
| `src/components/report/ProssimePrenotazioni.jsx` | 3 | Lista prenotazioni future |
| `supabase/migrations/YYYYMMDDHHMMSS_add_consuntivo_fields.sql` | 2 | Migrazione DB |

### File da modificare

| File | Feature | Modifica |
|------|---------|---------|
| `src/pages/dashboard/DashboardStrategica.jsx` | 1 | Aggiungere TimeRangeFilter, 6 KPI chart, layout grid |
| `src/pages/dashboard/DashboardRouter.jsx` | 4 | Aggiungere routing per commerciale/area_manager |
| `src/components/eventi/EventCostiTab.jsx` | 2 | Aggiungere sezione Consuntivo sotto Preventivi |
| `src/pages/costi/CostiPage.jsx` | 2 | Aggiungere tab "Analisi costi" |
| `src/hooks/useCosts.js` | 2 | Aggiungere updateConsuntivo, fetchCostiAnalysis |
| `src/hooks/useMaterials.js` | 3 | Aggiungere fetchMaterialAnalytics, fetchUpcomingBookings |
| `src/lib/constants.js` | 1, 2, 3 | Aggiungere CHART_COLORS, STATO_EVENTO_CHART_COLOR, TIPO_EVENTO_CHART_COLOR (definiti in sezione 7) |
| `src/lib/icons.js` | 3, 4 | Aggiungere icone per report e dashboard commerciale |
| `src/App.jsx` | 3 | Aggiungere route /report/materiale |
| `src/components/layout/Sidebar.jsx` | 3 | Aggiungere voce "Report Materiale" |
| `package.json` | 1 | Aggiungere recharts dependency |

### Conteggio file

- **Nuovi:** 23 file (22 JSX/JS + 1 SQL)
- **Modificati:** 11 file
- **Totale:** 34 file

---

## Appendice A: Definizioni KPI precise

| KPI | Formula | Unita | Aggiornamento |
|-----|---------|-------|---------------|
| Eventi per stato | `COUNT(events) GROUP BY stato WHERE data_inizio IN period` | count | On mount + period change |
| Eventi per tipo | `COUNT(events) GROUP BY tipo_evento WHERE data_inizio IN period` | count | On mount + period change |
| Budget previsto | `SUM(events.budget_previsto) WHERE data_inizio IN period` | EUR | On mount + period change |
| Budget approvato | `SUM(event_preventivi.importo) WHERE stato='approvato' AND event IN period` | EUR | On mount + period change |
| Budget effettivo | `SUM(event_preventivi.importo_effettivo) WHERE importo_effettivo IS NOT NULL AND event IN period` (fonte primaria: `event_preventivi`, NON `event_costs`) | EUR | On mount + period change |
| Tasso conferma | `COUNT(participants WHERE stato IN (confermato,presente)) / COUNT(participants) * 100` | % | On mount + period change |
| Attivita in ritardo | `COUNT(activities WHERE stato IN (da_fare,in_corso) AND deadline < NOW() AND obbligatoria)` | count | On mount + period change |
| Trend ritardi | `ritardi_periodo_corrente - ritardi_periodo_precedente` | delta | On mount + period change |
| Materiale fuori | `COUNT(materials WHERE posizione_attuale != 'in_magazzino')` | count | On mount (no period filter) |
| Frequenza uso materiale | `COUNT(event_materials WHERE material_id=X AND created_at > 1y ago)` | count/anno | On page load |
| Tempo medio fuori | `AVG(rientro.data - uscita.data) per material_id` | giorni | On page load |
| Tasso rientro puntuale | `COUNT(rientri puntuali) / COUNT(rientri) * 100` | % | On page load |
| Conflitti materiale | `COUNT(overlapping event_materials per material_id)` | count | On page load |

## Appendice B: Accessibilita grafici

I grafici di recharts sono SVG. Per garantire accessibilita:

1. Ogni chart ha un `<h3>` con il titolo come testo leggibile
2. Sotto ogni chart, un `<table>` nascosto con `sr-only` (screen reader only) che riporta i dati in forma tabellare
3. I tooltip funzionano su focus (keyboard) e touch
4. I colori sono sempre accompagnati da label nel tooltip e nella legenda
5. Il contrast ratio dei colori chart rispetta WCAG AA (gia garantito dalle palette Tailwind)

```jsx
// Pattern accessibilita per ogni chart
<div>
  <h3 className="font-semibold text-lg mb-3">Eventi per stato</h3>
  <ResponsiveContainer ...>
    <PieChart>...</PieChart>
  </ResponsiveContainer>
  {/* Tabella dati per screen reader */}
  <table className="sr-only" role="table" aria-label="Eventi per stato - dati">
    <thead><tr><th>Stato</th><th>Numero eventi</th></tr></thead>
    <tbody>
      {data.map(d => <tr key={d.stato}><td>{STATO_EVENTO[d.stato]}</td><td>{d.count}</td></tr>)}
    </tbody>
  </table>
</div>
```

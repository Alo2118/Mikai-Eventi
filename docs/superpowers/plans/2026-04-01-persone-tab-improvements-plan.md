# Persone Tab Improvements — Implementation Plan

**Data:** 2026-04-01
**Spec:** `docs/superpowers/specs/2026-04-01-persone-tab-improvements-design.md`
**Stato:** Approvato

---

## Ordine di esecuzione

Raggruppiamo in 4 batch. I batch sono sequenziali, ma all'interno di ciascuno i task sono paralleli.

### Batch 1 — DB Migrations (3 migrazioni)
### Batch 2 — Frontend quick wins senza DB (punti 1, 2, 3, 4)
### Batch 3 — Frontend con nuovi dati DB (punti 5, 6, 7, 8)
### Batch 4 — Feature complesse (punti 9, 10, 11)

---

## Batch 1 — Migrazioni DB

### Step 1.1 — Migration: hotel indirizzo + staff note
File: `supabase/migrations/20260401230000_hotel_indirizzo_staff_note.sql`

```sql
-- Add indirizzo to hotel
ALTER TABLE event_hotel ADD COLUMN IF NOT EXISTS indirizzo_hotel text;

-- Add note to staff
ALTER TABLE event_staff ADD COLUMN IF NOT EXISTS note text;
```

### Step 1.2 — Migration: esigenze alimentari su contacts e users
File: `supabase/migrations/20260401230001_esigenze_alimentari.sql`

```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS esigenze_alimentari text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS esigenze_accessibilita text;

ALTER TABLE users ADD COLUMN IF NOT EXISTS esigenze_alimentari text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS esigenze_accessibilita text;
```

### Step 1.3 — Migration: hotel_templates table
File: `supabase/migrations/20260401230002_hotel_templates.sql`

```sql
CREATE TABLE IF NOT EXISTS hotel_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_hotel text NOT NULL,
  indirizzo_hotel text,
  note text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE hotel_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel_templates_select" ON hotel_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hotel_templates_insert" ON hotel_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "hotel_templates_update" ON hotel_templates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "hotel_templates_delete" ON hotel_templates
  FOR DELETE TO authenticated USING (true);
```

### Step 1.4 — Push migrazioni
```bash
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"
```

---

## Batch 2 — Frontend quick wins (nessun cambio DB)

### Step 2.1 — Chip compatti riepilogo (punto 1)

**File:** `src/components/eventi/EventLogisticaTab.jsx`

**Cosa fare:**
Sostituire il titolo "Persone" con una riga che include chip compatti:

```jsx
<div className="flex items-center gap-2 flex-wrap">
  <h3 className="font-semibold text-lg">Persone</h3>
  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
    {people.length} totali
  </span>
  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">
    {confirmedCount} confermati
  </span>
  <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
    {pendingCount} in attesa
  </span>
</div>
```

**Calcoli derivati da aggiungere:**
```js
const confirmedCount = staff.filter(s => s.confermato).length +
  participants.filter(p => ['confermato', 'presente'].includes(p.stato_iscrizione)).length
const pendingCount = people.length - confirmedCount
const withHotel = people.filter(p => getHotel(p)).length
const withFullTransport = people.filter(p => getAndata(p) && getRitorno(p)).length
```

### Step 2.2 — Chip stato cliccabile (punto 2)

**File:** `src/components/eventi/EventLogisticaTab.jsx`

**Cosa fare:**
Sostituire il `<select>` per stato_iscrizione e il bottone `✓/?` per conferma staff con chip colorati cliccabili.

**Partecipante — ciclo click:**
```
invitato (yellow) → confermato (blue) → presente (green) → invitato (yellow)
```

**Staff — ciclo click:**
```
Da confermare (yellow) → Confermato (green) → Da confermare (yellow)
```

**Implementazione inline** (no nuovo componente, il pattern è semplice):
```jsx
// Partecipante
const ISCRIZIONE_CYCLE = { invitato: 'confermato', confermato: 'presente', presente: 'invitato', assente: 'invitato' }
const ISCRIZIONE_CHIP_COLORS = {
  invitato: 'bg-yellow-100 text-yellow-700',
  confermato: 'bg-blue-100 text-blue-700',
  presente: 'bg-green-100 text-green-700',
  assente: 'bg-red-100 text-red-700',
}

<button
  onClick={() => updateParticipant(person.participantId, { stato_iscrizione: ISCRIZIONE_CYCLE[person.statoIscrizione] })}
  className={`px-2 py-1 rounded-full text-xs font-medium min-h-[32px] ${ISCRIZIONE_CHIP_COLORS[person.statoIscrizione]}`}
>
  {STATO_ISCRIZIONE[person.statoIscrizione]}
</button>
```

Applicare sia nella tabella desktop (td Persona) sia nelle card mobile.

### Step 2.3 — Filtri rapidi cumulabili (punto 3)

**File:** `src/components/eventi/EventLogisticaTab.jsx`

**Stato locale:**
```js
const [activeFilters, setActiveFilters] = useState(new Set())
```

**Definizione filtri:**
```js
const FILTER_OPTIONS = [
  { id: 'invitati', label: 'Invitati', filter: p => p.type === 'participant' && p.statoIscrizione === 'invitato' },
  { id: 'confermati', label: 'Confermati', filter: p => (p.type === 'staff' && p.confermato) || (p.type === 'participant' && ['confermato', 'presente'].includes(p.statoIscrizione)) },
  { id: 'no_hotel', label: 'Senza hotel', filter: p => !getHotel(p) },
  { id: 'no_andata', label: 'Senza andata', filter: p => !getAndata(p) },
  { id: 'no_ritorno', label: 'Senza ritorno', filter: p => !getRitorno(p) },
  { id: 'incompleti', label: 'Incompleti', filter: p => !getHotel(p) || !getAndata(p) || !getRitorno(p) },
]
```

**Logica di filtro (AND cumulativo):**
```js
const filteredPeople = activeFilters.size === 0 ? people :
  people.filter(p => [...activeFilters].every(fId => FILTER_OPTIONS.find(f => f.id === fId)?.filter(p)))
```

Il filtro si applica PRIMA del grouping. I chip filtro si renderizzano sotto i chip di raggruppamento con conteggi dinamici.

### Step 2.4 — Raggruppamento per trasporto (punto 4)

**File:** `src/components/eventi/EventLogisticaTab.jsx`

**Aggiungere in GROUP_OPTIONS:**
```js
{ id: 'trasporto', label: 'Per trasporto' }
```

**Logica grouping (dentro `groupedPeople`):**
```js
if (groupBy === 'trasporto') {
  const transportMap = {}
  for (const p of filteredPeople) {
    const andata = getAndata(p)
    const ritorno = getRitorno(p)
    // Gruppo per codice trasporto (unendo andata e ritorno)
    const keys = []
    if (andata?.codice) keys.push(`${andata.codice} ${MEZZO_TRASPORTO[andata.mezzo] || ''} (Andata)`)
    if (ritorno?.codice) keys.push(`${ritorno.codice} ${MEZZO_TRASPORTO[ritorno.mezzo] || ''} (Ritorno)`)
    if (keys.length === 0) {
      // Fallback: raggruppa per mezzo se no codice
      const mezzi = [andata?.mezzo, ritorno?.mezzo].filter(Boolean)
      if (mezzi.length > 0) keys.push(mezzi.map(m => MEZZO_TRASPORTO[m]).join(' / '))
      else keys.push('Senza trasporto')
    }
    const groupKey = keys.join(' + ')
    if (!transportMap[groupKey]) transportMap[groupKey] = []
    transportMap[groupKey].push(p)
  }
  return Object.entries(transportMap)
    .sort(([a], [b]) => a === 'Senza trasporto' ? 1 : b === 'Senza trasporto' ? -1 : a.localeCompare(b))
    .map(([label, people]) => ({ label, people }))
}
```

---

## Batch 3 — Frontend con nuovi dati DB

### Step 3.1 — Alert conflitti (punto 5)

**File:** `src/components/eventi/EventLogisticaTab.jsx` (funzione + render inline)

**Funzione pura `computeAlerts`:**
```js
function computeAlerts(event, people, hotels, trasporti, staff, participants) {
  const alerts = []
  const eventStart = event.data_inizio
  const eventEnd = event.data_fine || event.data_inizio

  // Hotel check-in dopo evento
  hotels.forEach(h => {
    if (h.check_in && eventStart && h.check_in > eventStart) {
      const who = h.user_id ? `${h.user?.cognome} ${h.user?.nome}` : `${h.contact?.cognome} ${h.contact?.nome}`
      alerts.push({ type: 'warning', text: `Hotel check-in di ${who} (${formatDateShort(h.check_in)}) è dopo l'inizio evento (${formatDateShort(eventStart)})` })
    }
  })

  // Trasporto andata dopo evento
  trasporti.filter(t => t.direzione === 'andata' && t.orario).forEach(t => {
    // Compare date portion only
    const arrivalDate = t.orario.slice(0, 10)
    if (arrivalDate > eventStart) {
      alerts.push({ type: 'error', text: `Trasporto andata il ${formatDateShort(arrivalDate)} ma l'evento inizia il ${formatDateShort(eventStart)}` })
    }
  })

  // Confermati senza hotel
  const confirmedWithoutHotel = people.filter(p => {
    const isConfirmed = p.type === 'staff' ? p.confermato : ['confermato', 'presente'].includes(p.statoIscrizione)
    return isConfirmed && !hotels.find(h => p.type === 'staff' ? h.user_id === p.id : h.contact_id === p.id)
  })
  if (confirmedWithoutHotel.length > 0) {
    alerts.push({ type: 'warning', text: `${confirmedWithoutHotel.length} confermati senza hotel` })
  }

  // Nessuno staff confermato
  if (staff.length > 0 && !staff.some(s => s.confermato)) {
    alerts.push({ type: 'error', text: 'Nessuno staff confermato' })
  }

  return alerts
}
```

**Render:** Alert bar con icona FEEDBACK_ICONS.warning/error, dismissable per sessione.

### Step 3.2 — Indirizzo hotel (punto 6)

**Files da modificare:**
1. `src/hooks/useLogistics.js` — Aggiungere `indirizzo_hotel` al select delle hotel queries
2. `src/components/eventi/LogisticaBulkModals.jsx` — Aggiungere campo `indirizzo_hotel` al HotelModal form
3. `src/components/eventi/EventLogisticaTab.jsx` — Mostrare indirizzo nella cella hotel (testo troncato sotto il nome)

**HotelModal update:**
```jsx
<div>
  <label>Indirizzo</label>
  <input className={INPUT_STYLE} value={form.indirizzo_hotel || ''} onChange={...} placeholder="Via Roma 1, Monteviale" />
</div>
```

### Step 3.3 — Esigenze alimentari su contatti/utenti (punto 7)

**Files da modificare:**
1. `src/hooks/useContacts.js` — Aggiungere `esigenze_alimentari, esigenze_accessibilita` al select della fetchContact
2. `src/pages/contatti/ContattiDetail.jsx` — Aggiungere sezione "Esigenze" con 2 textarea
3. `src/hooks/useAuth.js` — Aggiungere i campi al fetch del profilo utente (se la select include `*` è automatico)
4. `src/hooks/useParticipants.js` — Estendere select per includere esigenze dal contatto: `contact:contacts(..., esigenze_alimentari, esigenze_accessibilita)`
5. `src/hooks/useStaff.js` — Estendere select per includere esigenze dallo user: `user:users(..., esigenze_alimentari, esigenze_accessibilita)`
6. `src/components/eventi/EventLogisticaTab.jsx` — Mostrare icona indicatore se persona ha esigenze (icona utensili per alimentari, icona accessibilità) con tooltip

**Icone da aggiungere in `icons.js`:**
```js
import { UtensilsCrossed, Accessibility } from 'lucide-react'
// In una nuova categoria o in LOGISTICA_PERSONE_ICONS:
esigenze_alimentari: UtensilsCrossed,
esigenze_accessibilita: Accessibility,
```

### Step 3.4 — Note visibili con icona + popover (punto 8)

**Files da modificare:**
1. `src/hooks/useStaff.js` — Aggiungere `note` al select (se usa `*` è automatico), aggiungere nel addStaff/updateStaff
2. `src/components/eventi/EventLogisticaTab.jsx` — Accanto al nome, se person.note esiste, mostrare icona cliccabile che apre un popover con testo + edit inline

**People list update:**
```js
// Aggiungere note al mapping
...staff.map(s => ({ ..., note: s.note })),
...participants.map(p => ({ ..., note: p.note })),
```

**UI pattern — popover semplice con stato locale:**
```jsx
const [notePopover, setNotePopover] = useState(null) // personKey

// Accanto al nome:
{person.note && (
  <button onClick={() => setNotePopover(notePopover === key ? null : key)} className="text-gray-400 hover:text-mikai-500 p-1">
    <Icon icon={ACTION_ICONS.note} size={14} />
  </button>
)}
{notePopover === key && (
  <div className="absolute z-10 bg-white border rounded-lg shadow-lg p-3 max-w-[240px]">
    <p className="text-sm text-gray-700">{person.note}</p>
    {canEdit && <textarea ... onBlur={save} />}
  </div>
)}
```

**Icona note da aggiungere in `icons.js`:**
```js
import { StickyNote } from 'lucide-react'
// In ACTION_ICONS:
note: StickyNote,
```

---

## Batch 4 — Feature complesse

### Step 4.1 — Timeline logistica evento (punto 9)

**Nuovo componente:** `src/components/eventi/EventLogisticaEventTimeline.jsx`

**Cosa fa:** Raccoglie tutti gli eventi logistici (check-in, check-out, arrivi, partenze, inizio/fine evento) e li mostra in ordine cronologico raggruppati per giorno.

**Dati in input:** `{ event, hotels, trasporti, people }`

**Struttura timeline entry:**
```js
{ date: 'YYYY-MM-DD', time: 'HH:mm' | null, type: 'checkin'|'checkout'|'andata'|'ritorno'|'evento_inizio'|'evento_fine', icon, label, people: [nomi] }
```

**Logica:**
1. Per ogni hotel → entry check-in (data check_in) + entry check-out (data check_out)
2. Per ogni trasporto andata → entry con orario
3. Per ogni trasporto ritorno → entry con orario
4. Entry inizio evento + fine evento
5. Sort per date → time
6. Group by date
7. Render: giorno come header, entries come righe con icona + ora + testo + lista persone

**Toggle nella UI:** Aggiungere segmented control sopra la tabella: `[Lista | Timeline]`

```jsx
const [viewMode, setViewMode] = useState('lista') // 'lista' | 'timeline'
```

Mostrare la tabella/cards se `viewMode === 'lista'`, il componente timeline se `viewMode === 'timeline'`.

### Step 4.2 — Template hotel espliciti (punto 10)

**Nuovo store:** `src/hooks/useHotelTemplates.js`

```js
export const useHotelTemplatesStore = create((set, get) => ({
  templates: [],
  loading: false,
  fetchTemplates: async () => { ... },
  createTemplate: async (payload) => { ... },
  deleteTemplate: async (id) => { ... },
}))
```

**UI nel HotelModal:**
Aggiungere dropdown "Usa template" sopra il form. Al click, pre-compila `nome_hotel` e `indirizzo_hotel`.

```jsx
<div>
  <label>Template hotel</label>
  <select onChange={e => { const tpl = templates.find(t => t.id === e.target.value); if (tpl) setForm(f => ({ ...f, nome_hotel: tpl.nome_hotel, indirizzo_hotel: tpl.indirizzo_hotel })) }}>
    <option value="">Seleziona template...</option>
    {templates.map(t => <option key={t.id} value={t.id}>{t.nome_hotel}</option>)}
  </select>
</div>
```

**Bottone "Salva come template":** Nel HotelModal, quando l'utente compila nome_hotel, mostrare un link "Salva come template" che crea un record in hotel_templates.

**Admin CRUD:** Opzionale — aggiungere pagina admin `AdminHotelTemplates` per gestire i template. Per ora basta il salvataggio dal modal.

### Step 4.3 — Export foglio singolo persone (punto 11)

**File:** `src/components/eventi/EventLogisticaTab.jsx`

**Bottone:** `<ExportButton>` accanto al titolo "Persone"

**Colonne export:**
```js
const columns = [
  { label: 'Cognome', key: 'cognome' },
  { label: 'Nome', key: 'nome' },
  { label: 'Tipo', key: 'tipo', format: (_, row) => row.type === 'staff' ? 'Staff' : 'Partecipante' },
  { label: 'Ruolo', key: 'ruolo', format: (v, row) => row.type === 'staff' ? RUOLO_EVENTO[v] : TIPO_PARTECIPANTE[v] },
  { label: 'Stato', key: 'stato', format: (_, row) => row.type === 'staff' ? (row.confermato ? 'Confermato' : 'Da confermare') : STATO_ISCRIZIONE[row.statoIscrizione] },
  ...(hasTavoli ? [{ label: 'Tavolo', key: 'tavolo', format: (_, row) => { const t = getPersonTavolo(row, tavoli); return t ? `T${t.numero}` : '' } }] : []),
  { label: 'Hotel', key: 'hotel', format: (_, row) => getHotel(row)?.nome_hotel || '' },
  { label: 'Indirizzo Hotel', key: 'indirizzo', format: (_, row) => getHotel(row)?.indirizzo_hotel || '' },
  { label: 'Check-in', key: 'checkin', format: (_, row) => { const h = getHotel(row); return h?.check_in ? formatDateShort(h.check_in) : '' } },
  { label: 'Check-out', key: 'checkout', format: (_, row) => { const h = getHotel(row); return h?.check_out ? formatDateShort(h.check_out) : '' } },
  { label: 'Andata mezzo', key: 'andata_mezzo', format: (_, row) => { const a = getAndata(row); return a?.mezzo ? MEZZO_TRASPORTO[a.mezzo] : '' } },
  { label: 'Andata codice', key: 'andata_codice', format: (_, row) => getAndata(row)?.codice || '' },
  { label: 'Andata orario', key: 'andata_orario', format: (_, row) => { const a = getAndata(row); return a?.orario ? formatTime(a.orario) : '' } },
  { label: 'Ritorno mezzo', key: 'ritorno_mezzo', format: (_, row) => { const r = getRitorno(row); return r?.mezzo ? MEZZO_TRASPORTO[r.mezzo] : '' } },
  { label: 'Ritorno codice', key: 'ritorno_codice', format: (_, row) => getRitorno(row)?.codice || '' },
  { label: 'Ritorno orario', key: 'ritorno_orario', format: (_, row) => { const r = getRitorno(row); return r?.orario ? formatTime(r.orario) : '' } },
  { label: 'Note', key: 'note' },
  { label: 'Esigenze alimentari', key: 'esigenze', format: (_, row) => row.esigenze_alimentari || '' },
]
```

**Filename:** `Persone_${event.titolo}_${todayISO()}.xlsx`

Riuso di `exportToExcel` da `export-utils.js` + hook `useExportHandler`.

---

## Riepilogo file toccati

| File | Batch | Tipo modifica |
|------|-------|---------------|
| `supabase/migrations/20260401230000_*` | 1 | Nuovi (3 file) |
| `src/components/eventi/EventLogisticaTab.jsx` | 2,3,4 | Major refactor |
| `src/components/eventi/LogisticaBulkModals.jsx` | 3 | Aggiunta campi hotel + template picker |
| `src/components/eventi/EventLogisticaEventTimeline.jsx` | 4 | Nuovo componente |
| `src/hooks/useLogistics.js` | 3 | Aggiunta indirizzo_hotel al select |
| `src/hooks/useStaff.js` | 3 | Note nel select + esigenze user |
| `src/hooks/useParticipants.js` | 3 | Esigenze contact nel select |
| `src/hooks/useContacts.js` | 3 | Esigenze nel select |
| `src/hooks/useHotelTemplates.js` | 4 | Nuovo store |
| `src/lib/icons.js` | 3 | 3 nuove icone (UtensilsCrossed, Accessibility, StickyNote) |
| `src/lib/constants.js` | 2 | Eventuali nuove costanti filtro |
| `src/pages/contatti/ContattiDetail.jsx` | 3 | Sezione esigenze |

---

## Verifica

Dopo ogni batch:
1. `npm run build` — zero errori
2. Test manuale: aggiungere persone, applicare filtri, verificare chip click, export Excel
3. Dopo batch 1: verificare migrazioni con `supabase migration list`

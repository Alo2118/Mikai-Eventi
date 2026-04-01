# Persone Tab Improvements — Design Spec

**Data:** 2026-04-01
**Stato:** Brainstorming
**Contesto:** La tab Persone (EventLogisticaTab) dell'evento gestisce staff, partecipanti, hotel, trasporti e tavoli. Con 11 miglioramenti raggruppati in 3 priorità, l'obiettivo è rendere la gestione persone più efficace per Federica (organizzazione), gli agenti commerciali e i responsabili d'area.

---

## 1. Riepilogo visivo con contatori prominenti

### Problema attuale
Le ProgressIndicator esistenti mostrano barre (Hotel 5/12, Andata 3/12) ma mancano i contatori per conferme e stati iscrizione. Con 30+ persone non è immediato capire a che punto si è.

### Proposta
Aggiungere una **summary bar** (SUMMARY_BAR_STYLE) sopra le progress bar con 4-6 KPI grandi:

```
┌─────────────────────────────────────────────────────────────┐
│  👥 12 persone   ✓ 8 confermati   🏨 5/12 hotel   ✈ 3/12  │
│  (5 staff + 7 partecipanti)     2 assenti          trasporti│
└─────────────────────────────────────────────────────────────┘
```

**Contatori proposti:**
| KPI | Calcolo | Colore |
|-----|---------|--------|
| Totale persone | staff.length + participants.length | neutral |
| Staff confermati | staff.filter(s => s.confermato).length / staff.length | green/yellow |
| Partecipanti confermati | participants con stato 'confermato' o 'presente' / total | green/yellow/red |
| Hotel assegnati | hotels.length / people.length | blue |
| Trasporti completi | persone con BOTH andata + ritorno / people.length | green |
| Tavoli assegnati | (solo se hasTavoli) persone con tavolo / people.length | mikai |

**Implementazione:** Puro frontend, nessun cambio DB. Calcoli derivati dai dati già in store.

**Trade-off:**
- (+) Visione immediata dello stato complessivo
- (+) Utile per Federica che gestisce la logistica di tutti gli eventi
- (-) Occupa spazio verticale — ma su mobile si può fare 2 righe con numeri più compatti

### Decisione richiesta
- Mostrare i contatori come numeri grandi in una summary bar, oppure come chip compatti nella stessa riga del titolo "Persone"?
- Sostituire le ProgressIndicator attuali o affiancarle?

---

## 2. Stato iscrizione inline con chip cliccabili

### Problema attuale
Lo stato iscrizione partecipante è un `<select>` piccolo e brutto. Per lo staff, la conferma è un bottone `✓/?` poco chiaro.

### Proposta
Sostituire entrambi con **chip colorati cliccabili** (stile StatusBadge ma interattivi):

**Partecipanti:** Click sul chip cicla tra gli stati nell'ordine logico:
- `invitato` (yellow) → `confermato` (blue) → `presente` (green)
- Long-press o menu: `assente` (red)

**Staff:** Click togla tra:
- `Da confermare` (yellow) → `Confermato` (green)

**Implementazione:**
- Nuovo componente `ClickableStatusChip` in ui/ oppure variante di StatusBadge con `onClick`
- Nessun cambio DB
- Desktop: click diretto. Mobile: tap diretto (min-h-[48px] sul chip)

**Trade-off:**
- (+) Molto più veloce che aprire un select
- (+) Colorato = leggibilità immediata
- (-) Il ciclo automatico potrebbe portare a errori (clic accidentale) — mitigato dalla reversibilità

### Decisione richiesta
- Ciclo click o mantenere un piccolo dropdown come alternativa?
- L'azione "assente" deve richiedere conferma (è semi-distruttiva)?

---

## 3. Filtri rapidi per stato

### Problema attuale
Con 30+ persone è difficile trovare chi manca di hotel o chi non ha confermato. Il raggruppamento (per tipo/zona/tavolo) non filtra per stato logistico.

### Proposta
Aggiungere una riga di **chip filtro** sotto i raggruppamenti, cumulabili (AND):

```
[Tutti] [Invitati (4)] [Confermati (6)] [Presenti (2)] [❌ Senza hotel (7)] [❌ Senza trasporto (9)]
```

**Filtri proposti:**
| Filtro | Logica |
|--------|--------|
| Invitati | stato_iscrizione === 'invitato' (solo partecipanti) |
| Confermati | stato_iscrizione === 'confermato' OR confermato === true |
| Senza hotel | !getHotel(person) |
| Senza andata | !getAndata(person) |
| Senza ritorno | !getRitorno(person) |
| Incompleti | manca almeno uno tra hotel/andata/ritorno |

**Implementazione:**
- Stato locale `activeFilters` (Set di stringhe)
- Filtro applicato su `people` prima del grouping
- Il conteggio nel chip si aggiorna dinamicamente
- Puro frontend, nessun cambio DB

**Trade-off:**
- (+) Enorme risparmio di tempo per Federica
- (+) I conteggi fungono anche da riepilogo visivo (punto 1)
- (-) Tanti chip possono confondere — limite a 6 max, nascondere quelli con count=0

### Decisione richiesta
- Filtri esclusivi (uno alla volta) o cumulabili (AND)?
- Mostrare filtri sempre o solo quando ci sono > 10 persone?

---

## 4. Raggruppamento per volo/treno

### Problema attuale
Non c'è modo di vedere chi è sullo stesso volo/treno. Federica deve scorrere la lista e confrontare codici a mano per coordinare pickup.

### Proposta
Aggiungere opzione di raggruppamento `Per trasporto` nella riga GROUP_OPTIONS:

```
[Tutti] [Per tavolo] [Per tipo] [Per zona] [Per trasporto]
```

**Logica di raggruppamento:**
1. Raggruppa per `trasporto.codice + trasporto.orario + trasporto.direzione` (es. "FR9432 — 14:30 Andata")
2. Chi non ha trasporto → gruppo "Senza trasporto"
3. Chi ha mezzo "indipendente" o "auto" → gruppo "Autonomi"

**Sotto-header per gruppo:**
```
✈ FR9432 — 14:30 Roma → Vicenza (3 persone)
  │ Rossi Mario — discente
  │ Bianchi Anna — relatore
  │ Verdi Paolo — staff
```

**Implementazione:**
- Nuova entry in GROUP_OPTIONS: `{ id: 'trasporto', label: 'Per trasporto' }`
- Logica di raggruppamento in `groupedPeople` (già pattern consolidato)
- Nessun cambio DB

**Trade-off:**
- (+) Fondamentale per coordinare transfer e pickup
- (+) Permette di vedere a colpo d'occhio se qualcuno è "solo" su un volo
- (-) Se pochi hanno trasporto assegnato, il gruppo "Senza trasporto" sarà enorme

### Decisione richiesta
- Raggruppare per andata e ritorno separatamente o insieme?
- Mostrare questa opzione solo se almeno 2 persone hanno lo stesso codice trasporto?

---

## 5. Conflitti e validazioni (alert bar)

### Problema attuale
Nessun avviso se l'hotel è prenotato per date sbagliate, se il trasporto è dopo la fine dell'evento, o se mancano persone chiave senza logistica a ridosso della deadline.

### Proposta
Aggiungere una **alert bar** (arancione/rossa) sopra la lista quando ci sono problemi:

```
⚠ 3 problemi rilevati:
  • Hotel "Alfa" check-in 20 mar ma l'evento inizia il 18 mar (2 persone)
  • Volo FR9432 il 22 mar ma l'evento finisce il 20 mar
  • 5 partecipanti confermati senza hotel (deadline preparazione: tra 3 giorni)
```

**Validazioni proposte:**
| Check | Severità | Logica |
|-------|----------|--------|
| Hotel check-in dopo data_inizio evento | Warning | hotel.check_in > event.data_inizio |
| Hotel check-out prima data_fine evento | Warning | hotel.check_out < event.data_fine |
| Trasporto andata dopo data_inizio | Error | andata.orario > event.data_inizio |
| Trasporto ritorno prima data_fine | Warning | ritorno.orario < event.data_fine |
| Confermati senza hotel vicino deadline | Warning | stato 'confermato' + !hotel + deadline_preparazione - 7gg |
| Confermati senza trasporto vicino deadline | Warning | come sopra per trasporti |
| Nessuno staff confermato | Error | staff.filter(s => s.confermato).length === 0 |

**Implementazione:**
- Funzione `computeAlerts(event, people, hotels, trasporti)` pura (nessun side effect)
- Componente `PersoneAlertBar` che mostra gli alert con icona + testo
- Dismissable per sessione (stato locale)
- Nessun cambio DB — usa dati già disponibili + campi evento (data_inizio, data_fine, deadline_preparazione)

**Trade-off:**
- (+) Previene errori costosi (hotel sbagliato = spese inutili)
- (+) Automatico, non richiede azione dell'utente
- (-) Potrebbe generare "alert fatigue" se troppi warning — mitigato con dismissibility

### Decisione richiesta
- Mostrare gli alert sempre o solo quando l'evento è in stato `in_preparazione` o successivi?
- Alert collassabile o sempre visibile?

---

## 6. Dettagli hotel aggiuntivi

### Problema attuale
L'hotel ha solo: `nome_hotel`, `check_in`, `check_out`, `stato`, `note`. Mancano indirizzo, telefono, camera, richieste speciali. Federica deve tenere questi dati su fogli Excel separati.

### Proposta
Aggiungere colonne alla tabella `event_hotel`:

```sql
ALTER TABLE event_hotel
  ADD COLUMN indirizzo_hotel text,
  ADD COLUMN telefono_hotel text,
  ADD COLUMN numero_camera text,
  ADD COLUMN richieste_speciali text;  -- allergie, letto singolo/doppio, piano basso, ecc.
```

**UI nel HotelModal (bulk):**
- I campi `nome_hotel`, `indirizzo_hotel`, `telefono_hotel` si applicano in batch (stessi per tutti i selezionati)
- `numero_camera` e `richieste_speciali` sono individuali — non nel bulk modal, ma editabili inline nella tabella

**UI nella tabella persone:**
- Desktop: hover/click sulla cella hotel mostra un popover con tutti i dettagli
- Mobile: espandendo la card, sezione hotel mostra i dettagli extra

**Trade-off:**
- (+) Elimina la necessità di fogli Excel separati
- (+) I dati sono centralizzati e visibili a tutti
- (-) 1 migrazione DB + update store + update modal
- (-) Troppi campi nel bulk modal? → Solo i campi "comuni" (nome, indirizzo, tel, date) in bulk, il resto individuale

### Decisione richiesta
- Aggiungere tutti e 4 i campi o solo indirizzo + telefono?
- Il numero camera è davvero utile nell'app o è meglio lasciarlo nelle note?

---

## 7. Esigenze alimentari e accessibilità

### Problema attuale
Non c'è modo di registrare diete speciali o esigenze di mobilità. Queste info vengono gestite via WhatsApp e spesso dimenticate.

### Proposta

**Opzione A — Campi sulla tabella event_participants / event_staff:**
```sql
ALTER TABLE event_participants ADD COLUMN esigenze_alimentari text;
ALTER TABLE event_participants ADD COLUMN esigenze_accessibilita text;
ALTER TABLE event_staff ADD COLUMN esigenze_alimentari text;
ALTER TABLE event_staff ADD COLUMN esigenze_accessibilita text;
```
Pro: Semplice, per-evento (dieta può cambiare). Contro: Duplicato se la stessa persona va a 5 eventi.

**Opzione B — Campi sulla tabella contacts/users:**
```sql
ALTER TABLE contacts ADD COLUMN esigenze_alimentari text;
ALTER TABLE contacts ADD COLUMN esigenze_accessibilita text;
ALTER TABLE users ADD COLUMN esigenze_alimentari text;
ALTER TABLE users ADD COLUMN esigenze_accessibilita text;
```
Pro: Compilo una volta, vale per tutti gli eventi. Contro: Se cambia la dieta? → Si aggiorna il contatto.

**Opzione C — Ibrido:** Campi su contacts/users come default, override per-evento su participants/staff.

**Raccomandazione:** Opzione B (su contacts/users). Le esigenze alimentari sono della persona, non dell'evento. Se servono eccezioni si usano le note evento.

**UI:**
- Nel dettaglio contatto: sezione "Esigenze" con i 2 campi
- Nella tab Persone: icona indicatore se la persona ha esigenze (es. icona utensili per dieta, icona accessibilità)
- Report esportabile: "Lista esigenze alimentari" per il catering

**Trade-off:**
- (+) Evita dimenticanze su allergie (rischio medico reale)
- (+) Utile per prenotare menu speciali con il catering
- (-) Opzione B richiede update di 2 tabelle diverse (contacts + users)

### Decisione richiesta
- Opzione A (per-evento), B (sul contatto), o C (ibrido)?
- Esigenze come campo testo libero o come checkbox predefinite (vegetariano, vegano, celiaco, intolleranze)?

---

## 8. Note per persona più visibili

### Problema attuale
Le note sul partecipante (`event_participants.note`) esistono nel DB ma non sono visibili nella lista. Bisogna andare nel dettaglio per vederle/editarle. Per lo staff non c'è campo note.

### Proposta

**DB:** Aggiungere campo note allo staff:
```sql
ALTER TABLE event_staff ADD COLUMN note text;
```

**UI:**
- **Desktop:** Icona "nota" accanto al nome se la persona ha note. Hover/click mostra tooltip/popover con il testo.
- **Mobile:** Testo note troncato sotto il nome nella card.
- **Edit inline:** Click sull'icona nota apre un mini-form inline per editare la nota.

**Implementazione:**
- 1 migrazione DB (add note to event_staff)
- Update `useStaffStore` per includere/aggiornare note
- Update tabella desktop + card mobile in EventLogisticaTab

**Trade-off:**
- (+) Le note diventano visibili senza click extra
- (+) Utile per annotare "arriva tardi", "allergia kiwi", "porta materiale X"
- (-) Può appesantire la lista visivamente — mitigato mostrando solo l'icona e il testo on demand

### Decisione richiesta
- Note visibili come testo troncato o solo icona con popover?
- Limite caratteri sulle note (es. 500)?

---

## 9. Timeline logistica per evento

### Problema attuale
Non c'è una vista cronologica degli spostamenti. Per capire quando arrivano tutti e quando partono bisogna scorrere la tabella persona per persona.

### Proposta
Aggiungere una **vista timeline** alternativa alla tabella, attivabile con un toggle:

```
📅 17 Mar (giorno prima)
  14:30  ✈ FR9432 — Rossi, Bianchi, Verdi (arrivo)
  16:00  🚆 FR1234 — Neri, Gialli (arrivo)
  18:00  🏨 Check-in Hotel Alfa — 8 persone

📅 18 Mar (giorno evento)
  09:00  Evento inizia

📅 19 Mar (giorno dopo)
  08:00  🏨 Check-out Hotel Alfa — 8 persone
  10:30  ✈ FR9433 — Rossi, Bianchi (partenza)
  14:00  🚆 FR1235 — Neri, Verdi (partenza)
```

**Implementazione:**
- Nuovo componente `LogisticaTimeline` (o riuso/adattamento di quello cross-evento già esistente in `/src/pages/logistica/LogisticaTimeline.jsx`)
- Dati: combina hotels (check_in/check_out) + trasporti (orario) + evento (data_inizio/data_fine)
- Ordina tutto cronologicamente
- Toggle vista: `Tabella | Timeline`

**Trade-off:**
- (+) Vista d'insieme fondamentale prima dell'evento
- (+) Permette di individuare sovrapposizioni e buchi
- (-) Componente nuovo, non banale da rendere responsive
- (-) Utile solo se i dati di orario sono compilati (garbage in = garbage out)

### Decisione richiesta
- Vista separata (toggle) o sezione aggiuntiva sotto la tabella?
- Implementare come adattamento del LogisticaTimeline esistente o componente nuovo?

---

## 10. Template logistica (hotel/trasporto ricorrenti)

### Problema attuale
Mikai usa spesso gli stessi hotel e le stesse tratte (es. "Hotel Alfa Monteviale" per i corsi in sede, "Treno Roma-Vicenza" per i congressi). Ogni volta bisogna reinserire i dati.

### Proposta

**Opzione A — Template hotel salvati:**
```sql
CREATE TABLE hotel_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_hotel text NOT NULL,
  indirizzo_hotel text,
  telefono_hotel text,
  note text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
```
Nel HotelModal: dropdown "Usa template" che pre-compila i campi.

**Opzione B — Autocompletamento da storico:**
Nessuna tabella nuova. Quando l'utente digita nel campo `nome_hotel`, suggerisce hotel già usati in eventi precedenti (query DISTINCT su event_hotel.nome_hotel).

**Raccomandazione:** Opzione B — più semplice, zero manutenzione, funziona da subito con i dati esistenti.

**Per i trasporti:** Simile — autocomplete su `codice` trasporto già usato (suggerisce mezzo + orario associato).

**Implementazione:**
- Opzione B: 1 query aggiuntiva nel store `useLogistics` → `fetchHotelSuggestions(term)`
- UI: autocomplete nel campo nome_hotel del HotelModal
- Nessuna migrazione DB

**Trade-off:**
- (+) Risparmio tempo enorme su eventi ripetitivi
- (+) Opzione B: zero setup, funziona con dati esistenti
- (-) Opzione B: suggerimenti "sporchi" se i nomi hotel sono stati scritti in modo diverso

### Decisione richiesta
- Opzione A (template espliciti) o B (autocomplete da storico)?
- Estendere anche ai trasporti o solo hotel?

---

## 11. Export lista persone con logistica

### Problema attuale
Non c'è export della lista persone di un evento. Federica deve copiare a mano i dati per mandare la rooming list all'hotel o la lista passeggeri all'agenzia viaggi.

### Proposta
Bottone "Esporta" nella sezione Persone che genera un file Excel con:

**Foglio 1 — Persone:**
| Cognome | Nome | Tipo | Ruolo/Tipo | Stato | Tavolo | Hotel | Check-in | Check-out | Andata | Ritorno | Note |
|---------|------|------|------------|-------|--------|-------|----------|-----------|--------|---------|------|

**Foglio 2 — Rooming list (per hotel):**
| Hotel | Cognome | Nome | Check-in | Check-out | Camera | Richieste |

**Foglio 3 — Transfer list (per trasporto):**
| Data | Ora | Mezzo | Codice | Direzione | Passeggeri | Autista | Pickup |

**Implementazione:**
- Riuso di `exportToExcelMultiSheet` da `export-utils.js` (già usato in LogisticaPage)
- Bottone `ExportButton` nella header della sezione
- Dati: combina people + hotels + trasporti già in memoria
- Nessun cambio DB

**Trade-off:**
- (+) Elimina copia manuale, risparmia ore
- (+) Rooming list pronta da mandare all'hotel
- (+) Riuso infrastruttura export esistente
- (-) Il formato Excel potrebbe non essere quello che l'hotel si aspetta — ma è personalizzabile

### Decisione richiesta
- Multi-foglio (persone + rooming + transfer) o foglio singolo con tutto?
- Aggiungere anche export PDF (per stampa veloce)?

---

## Riepilogo impatto e dipendenze

| # | Miglioramento | DB changes | Complessità | Dipendenze |
|---|---------------|------------|-------------|------------|
| 1 | Riepilogo visivo | No | Bassa | Nessuna |
| 2 | Chip stato inline | No | Bassa | Nessuna |
| 3 | Filtri rapidi | No | Media | Nessuna |
| 4 | Raggruppamento trasporto | No | Bassa | Nessuna |
| 5 | Alert conflitti | No | Media | Nessuna |
| 6 | Dettagli hotel | Sì (1 migration) | Media | Nessuna |
| 7 | Esigenze alimentari | Sì (1 migration) | Media | Nessuna |
| 8 | Note visibili | Sì (1 migration) | Bassa | Nessuna |
| 9 | Timeline logistica | No | Alta | Nessuna |
| 10 | Template logistica | No (opzione B) | Bassa | Nessuna |
| 11 | Export persone | No | Media | Nessuna |

**Ordine di implementazione consigliato:**
1. Prima i quick wins frontend (1, 2, 3, 4, 8) — nessun DB, impatto immediato
2. Poi le migrazioni DB (6, 7) — campi aggiuntivi
3. Poi le feature più complesse (5, 9, 10, 11)

Tutti i punti sono indipendenti e parallelizzabili.

---

## Decisioni prese (2026-04-01)

| # | Domanda | Decisione |
|---|---------|-----------|
| 1 | Contatori | **Chip compatti** nella stessa riga del titolo |
| 2 | Stato iscrizione | **Ciclo click** sul chip colorato |
| 3 | Filtri | **Cumulabili** (AND), sempre visibili |
| 4 | Raggruppamento trasporto | **Uniti** (andata + ritorno nello stesso gruppo) |
| 5 | Alert conflitti | **Sempre** visibili (non solo da in_preparazione) |
| 6 | Hotel extra | Solo **indirizzo** (no telefono, camera, richieste) |
| 7 | Esigenze alimentari | Sul **contatto/utente** (valgono per tutti gli eventi) |
| 8 | Note | **Icona con popover** (no testo troncato nella lista) |
| 9 | Timeline | **Toggle** nella stessa vista (Tabella / Timeline) |
| 10 | Template | **Template espliciti** (tabella DB dedicata) |
| 11 | Export | **Foglio singolo** con tutte le info |

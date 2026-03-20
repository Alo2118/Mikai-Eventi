# Phase 4: People & Logistics — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Approach:** Ibrido (Event hub + viste cross-evento)

---

## 1. Rubrica Contatti

### Obiettivo
Rubrica centralizzata di contatti esterni riusabile tra eventi. Oggi ogni evento parte da zero con liste Excel/mail.

### Schema

**Estensione tabella `contacts`:**

| Campo | Tipo | Note |
|-------|------|------|
| tipo_contatto | enum `contact_tipo` | `medico`, `fornitore`, `tecnico`, `istituzionale`, `altro` |
| azienda | text | Nome azienda/struttura (unica source of truth — `ente_ospedaliero` deprecato, vedi nota migrazione) |
| tipo_servizio | text | Solo per fornitori (catering, hotel, agenzia, sala, altro) |
| proprietario_id | FK users | Il commerciale a cui "appartiene" il contatto |
| zone_id | FK zones | Zona geografica. Obbligatoria per medici/tecnici/istituzionali, opzionale per fornitori |
| created_by | FK users | Chi ha fisicamente inserito il contatto (può essere diverso dal proprietario) |

Campi esistenti che restano: nome, cognome, email, telefono, ruolo_medico, specializzazione, note, attivo.

**Migrazione `ente_ospedaliero` → `azienda`:** il campo `ente_ospedaliero` viene rinominato in `azienda` via `ALTER TABLE contacts RENAME COLUMN ente_ospedaliero TO azienda`. L'indice `idx_contacts_ente` si aggiorna automaticamente alla nuova colonna (PostgreSQL propagates column renames to indexes). Per chiarezza, rinominarlo con `ALTER INDEX idx_contacts_ente RENAME TO idx_contacts_azienda`. Unica source of truth — nessun alias, nessuna duplicazione.

**Estensione tabella `users`:**

| Campo | Tipo | Note |
|-------|------|------|
| zone_id | FK zones | Zona di competenza dell'utente (necessario per RLS Area Manager) |

### Visibilità (RLS)

| Ruolo | Rubrica | Contatti associati a proprio evento |
|-------|---------|-------------------------------------|
| Commerciale | Propri contatti (`proprietario_id = me`): tutto. Altri: solo nome e cognome | Tutto (serve per l'evento) |
| Area Manager | Contatti della propria zona (`contacts.zone_id = users.zone_id`): tutto. Altre zone: nome e cognome | Tutto |
| Ufficio / Direzione | Tutto | Tutto |

Il `proprietario_id` è separato da `created_by` perché spesso l'ufficio inserisce contatti per conto del commerciale (da mail/Excel).

**Nota RLS:** la visibilità parziale (solo nome/cognome per contatti altrui) si implementa con una security view `contacts_visible` che espone tutti i campi per contatti propri/zona e solo `id, nome, cognome` per gli altri. Le query del frontend passano dalla view.

### Funzionalità

- **Pagina `/contatti`** — lista con ricerca e filtro per tipo, zona, proprietario
- **Form creazione/modifica** — campi adattivi per tipo (medico mostra specializzazione, fornitore mostra tipo_servizio)
- **Form minimo per inserimento veloce** — nome, cognome, tipo, zona, proprietario (per quando l'ufficio inserisce da una mail)
- **Storia contatto** — in quali eventi ha partecipato (query su `event_participants`)
- **No import CSV** in Phase 4, ma la struttura lo permette in futuro

### Permessi

`gestione_contatti` (nuovo): Ufficio, AM, Direzione possono CRUD.
Commerciali: possono creare nuovi contatti (proprietario = sé stessi) ma non modificare contatti altrui.

---

## 2. Staff Evento (utenti interni)

### Obiettivo
Assegnare utenti interni Mikai a un evento con un ruolo specifico. Oggi gestito via mail.

### Schema

Tabella `event_staff` già esiste: event_id, user_id, ruolo_evento, confermato, created_at.

Ruoli evento (enum `ruolo_evento`): formatore, responsabile, staff, commerciale, relatore, ospite.

**Colonna `updated_at` da aggiungere** a `event_staff` (manca nell'attuale schema) + trigger `update_updated_at()`. Necessario perché il flag `confermato` è mutabile.

### Flusso

1. AM/Direzione/Ufficio aprono tab Persone dell'evento
2. Aggiungono utenti interni da un picker (lista utenti attivi, filtrabile per ruolo)
3. Assegnano il ruolo nell'evento
4. Flag `confermato` sì/no — chi assegna mette direttamente lo stato, nessun flusso di conferma complesso

### Note

- Il `promotore_id` dell'evento compare automaticamente come staff con ruolo `commerciale`
- **Permesso:** `gestione_staff_evento` (nuovo) per AM, Direzione, Ufficio
- Commerciali vedono lo staff del proprio evento in sola lettura

---

## 3. Partecipanti Evento (contatti esterni)

### Obiettivo
Collegare contatti dalla rubrica a un evento con tipo e stato di partecipazione.

### Schema

Tabella `event_participants` già esiste: event_id, contact_id, tipo, stato_iscrizione, note, created_at.

- **Tipi** (enum `participant_tipo`): discente, relatore_esterno, ospite, accompagnatore
- **Stati** (enum `iscrizione_stato`): invitato → confermato → presente / assente

**Colonna `updated_at` da aggiungere** a `event_participants` (manca nell'attuale schema) + trigger `update_updated_at()`. Necessario perché `stato_iscrizione` attraversa transizioni di stato.

Nessuna differenza operativa tra tipi — sono tutti "partecipanti esterni", la differenza è solo il ruolo nell'evento. Qualsiasi partecipante può avere logistica (hotel/trasporto).

### Flusso

1. Operatore apre tab Persone dell'evento
2. Cerca contatto nella rubrica (autocomplete nome/cognome) oppure crea nuovo al volo (form minimo)
3. Assegna tipo partecipazione
4. Stato parte come `invitato`
5. Quando il contatto conferma (fuori dall'app, via mail/telefono), l'operatore aggiorna a `confermato`
6. A evento in corso/concluso, si registrano presenze (`presente` / `assente`)

### Permessi

Stessi del tab Persone. Commerciali possono proporre partecipanti (aggiungere con stato `invitato`) ma la conferma/presenza la gestisce chi organizza.

**Nota RLS:** la policy `event_participants_write` esistente (migration 010) è `FOR ALL USING(...)` senza `WITH CHECK`. Per aggiungere il path commerciali con vincolo su `stato_iscrizione`, serve creare una **nuova policy INSERT-only** separata:
```sql
CREATE POLICY "event_participants_commerciale_insert" ON event_participants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM events WHERE id = event_participants.event_id AND promotore_id = auth.uid())
    AND stato_iscrizione = 'invitato'
  );
```
La policy esistente `event_participants_write` resta invariata per admin/direzione/ufficio/staff.

### Contatore

Tab Persone mostra riepilogo: "Staff: 3 (2 confermati) | Partecipanti: 12 (8 confermati, 4 invitati)"

---

## 4. Sotto-attività Evento (Programma)

### Obiettivo
Gestire il programma dell'evento: sessioni, pranzi, coffee break, trasferimenti.

### Schema

**Nuova tabella `sub_activity_types`:**

| Campo | Tipo |
|-------|------|
| id | uuid, PK, default gen_random_uuid() |
| nome | text, NOT NULL |
| attivo | boolean, default true |
| created_at | timestamptz, default now() |
| updated_at | timestamptz, default now() |

RLS: read per tutti gli utenti autenticati, write per admin/direzione/ufficio. Trigger `update_updated_at()` su updated_at. Index su `attivo`.

Valori seed (devono coprire TUTTI i valori dell'enum `sub_activity_tipo` esistente + nuovi):
- **Da enum esistente** (obbligatori per data migration): `pranzo`, `cena`, `aperitivo`, `coffee_break`, `meeting`, `altro`
- **Nuovi**: `transfer`, `sessione_pratica`, `sessione_teorica`, `visita`, `riunione`

**Tabella `event_sub_activities` — evoluzione colonna `tipo`:**

La colonna `tipo` (attualmente enum `sub_activity_tipo`) viene affiancata da una nuova colonna `tipo_id` (FK a `sub_activity_types`). Strategia di migrazione:

1. Creare `sub_activity_types` con seed data (una riga per ogni valore enum esistente)
2. Aggiungere `tipo_id uuid REFERENCES sub_activity_types(id)` nullable
3. Data migration: popolare `tipo_id` mappando i valori enum alle righe seed
4. Rendere `tipo_id` NOT NULL
5. Deprecare `tipo` (lasciare in posto per sicurezza, rimuovere in migrazione futura)

**Nota:** l'enum `sub_activity_tipo` è usato anche da `template_items.sub_tipo`. Quel campo resta invariato in Phase 4 — la migrazione completa di `template_items` avverrà quando il Readiness Engine sarà implementato.

**Colonna `fornitore_id` aggiunta** a `event_sub_activities`: FK nullable a `contacts(id)` per collegare il fornitore dalla rubrica. Il campo `fornitore` (text) resta come fallback per fornitori non in rubrica.

### Flusso

1. Ufficio/AM apre tab Programma dell'evento
2. Aggiunge sotto-attività: tipo (da lista configurabile), data/ora, durata, luogo, note
3. Per sotto-attività con fornitore: indica il fornitore (dalla rubrica contatti o testo libero)
4. Flag `confermata` quando il fornitore conferma
5. Sotto-attività mostrate in ordine cronologico (timeline dell'evento)

### Admin

Pagina `/admin/sotto-attivita` — CRUD sulla tabella `sub_activity_types` (aggiungere, modificare, disattivare voci).

### Permessi

Chi può modificare l'evento può gestire le sotto-attività.

**Nota RLS:** la policy `sub_activities_write` (migration 010) attualmente include solo `admin/direzione/ufficio`. Va estesa per includere `area_manager`, coerentemente col fatto che gli AM possono modificare eventi.

### Collegamento costi

Una sotto-attività può generare un preventivo/costo (es. pranzo → preventivo catering). Il legame è tramite FK `sub_activity_id` nella tabella preventivi.

---

## 5. Logistica (Hotel e Trasporti)

### Obiettivo
Tracciare stato prenotazioni hotel e trasporti per staff e partecipanti. Gestione snella: stato + note, senza dettagli strutturati.

### Schema

**La tabella `event_logistics` (migration 005) viene deprecata e sostituita** da due tabelle più snelle. La vecchia tabella non contiene dati di produzione (l'app non ha mai avuto UI per popolarla). Sequenza nella migrazione:
1. `DROP POLICY "logistics_read" ON event_logistics` + `DROP POLICY "logistics_write" ON event_logistics`
2. `ALTER TABLE event_logistics RENAME TO event_logistics_legacy`
3. `ALTER TABLE event_logistics_legacy DISABLE ROW LEVEL SECURITY`
4. Drop in una migrazione futura dopo verifica che nessun codice la referenzi

**Nuova tabella `event_hotel`:**

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid, PK | |
| event_id | FK events, NOT NULL | |
| user_id | FK users | Nullable — per staff interno |
| contact_id | FK contacts | Nullable — per partecipanti esterni |
| stato | enum `prenotazione_stato` | `da_prenotare`, `prenotato`, `confermato` |
| note | text | Nome hotel, date, dettagli liberi |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Constraint: `CHECK (num_nonnulls(user_id, contact_id) = 1)` — esattamente uno dei due deve essere valorizzato.

**Nuova tabella `event_trasporti`:**

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid, PK | |
| event_id | FK events, NOT NULL | |
| user_id | FK users | Nullable — per staff interno |
| contact_id | FK contacts | Nullable — per partecipanti esterni |
| direzione | enum `trasporto_direzione` | `andata`, `ritorno` |
| stato | enum `prenotazione_stato` | `da_prenotare`, `prenotato`, `confermato` |
| note | text | Mezzo, orari, dettagli liberi |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Constraint: `CHECK (num_nonnulls(user_id, contact_id) = 1)`.

**Pattern due FK nullable con CHECK constraint:** garantisce referential integrity a livello DB + RLS funzionante. La tabella `event_logistics` originale usava lo stesso pattern di due FK nullable ma senza il CHECK constraint — qui lo aggiungiamo come miglioramento. L'enum `persona_logistica_tipo` non è più necessario.

**Indexes:** `idx_hotel_event ON event_hotel(event_id)`, `idx_trasporti_event ON event_trasporti(event_id)`.

**Triggers:** `update_updated_at()` su entrambe le tabelle.

**RLS:** read per utenti autenticati con accesso all'evento, write per chi ha `gestione_logistica`.

### Flusso — Tab evento

1. Tab Logistica nell'evento: per ogni persona (staff + partecipanti) una riga
2. Per ciascuno: stato hotel + stato trasporto andata + stato trasporto ritorno
3. L'operatore aggiorna stati e note

### Flusso — Vista cross-evento (`/logistica`)

Le 4 tab già scaffoldate:
- **Timeline:** hotel/trasporti da gestire ordinati per data evento
- **Matrice:** evento × stato (quanti da prenotare, quanti confermati)
- **Rientri:** resta per materiale (già implementato)
- **Inventario:** resta per materiale (già implementato)

### Permessi

`gestione_logistica` (nuovo): Ufficio org. AM e Direzione in lettura.

---

## 6. Preventivi e Costi

### Obiettivo
Centralizzare preventivi (da approvare) e costi (consuntivo) che oggi viaggiano su mail e WhatsApp.

### Schema — Preventivi

**Nuova tabella `event_preventivi`:**

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid, PK | |
| event_id | FK events, NOT NULL | |
| sub_activity_id | FK event_sub_activities | Opzionale — a quale sotto-attività è legato |
| fornitore_id | FK contacts | Opzionale — fornitore dalla rubrica |
| fornitore_nome | text | Fallback se fornitore non in rubrica |
| descrizione | text, NOT NULL | Es. "Catering pranzo 20 pax" |
| importo | decimal | |
| allegato_url | text | PDF/immagine del preventivo |
| stato | enum `preventivo_stato`, NOT NULL | `in_attesa`, `approvato`, `rifiutato`, `in_revisione` |
| approvato_da | FK users | Chi ha approvato/rifiutato |
| data_approvazione | timestamptz | |
| nota_approvazione | text | Motivo rifiuto o commento |
| created_by | FK users, NOT NULL | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Indexes:** `idx_preventivi_event ON event_preventivi(event_id)`, `idx_preventivi_stato ON event_preventivi(stato) WHERE stato = 'in_attesa'` (partial index per la vista cross-evento).

**Trigger:** `update_updated_at()`.

**RLS:** read per utenti autenticati con accesso all'evento, write per chi ha `gestione_costi`, update stato per chi ha `approva_preventivi`.

### Flusso preventivi

1. Ufficio carica preventivo: descrizione + importo + allegato PDF
2. Stato parte `in_attesa`
3. Direzione/Ufficio org approva, rifiuta (con motivo), o manda `in_revisione`
4. Se `in_revisione`: fornitore manda nuova versione → operatore aggiorna allegato e importo → torna `in_attesa`

**Approvazione:** chiunque con `approva_preventivi` può approvare qualsiasi preventivo (pragmatico, nessuna soglia).

### Schema — Costi

Tabella `event_costs` già esiste: event_id, source_tipo, source_id, descrizione, importo_previsto, importo_effettivo, fornitore, stato_pagamento, ecc.

### Confronto budget

| Dato | Fonte |
|------|-------|
| Budget previsto | `events.budget_previsto` (numero unico) |
| Costi approvati | Somma `event_preventivi` con stato `approvato` |
| Costi effettivi | Somma `event_costs.importo_effettivo` |

### Tab Costi nell'evento

- Lista preventivi con badge stato
- Barra budget: previsto vs approvato vs effettivo
- Possibilità di aggiungere costi non legati a preventivi (imprevisti)

### Vista cross-evento (`/costi`)

- Preventivi in attesa di approvazione (tutti gli eventi)
- Riepilogo budget per evento (previsto / speso / delta)

### Permessi

- `gestione_costi` (già esiste nell'enum `permission_type`): Ufficio — CRUD preventivi e costi
- `approva_preventivi` (nuovo): Ufficio org, Direzione — approvare/rifiutare

---

## 7. Certificati

### Obiettivo
Tracciare se un evento prevede certificati. I certificati vengono prodotti esternamente — l'app serve solo a sapere se servono e per chi.

### Schema

- `events` → aggiunge `certificato_previsto` (boolean, default false)

### Flusso

1. Nel tab Info si segna "Evento con certificato"
2. L'elenco nomi per i certificati = lista partecipanti con stato `presente` (dal tab Persone)
3. Chi fa i certificati copia/esporta i nomi dei presenti

Nessun campo aggiuntivo su `event_participants`. Nessuna gestione emissione nell'app.

---

## 8. Permessi e Navigazione

### Nuovi permessi

| Permesso | Assegnato a | Cosa | Note |
|----------|-------------|------|------|
| `gestione_contatti` | Ufficio, AM, Direzione | CRUD rubrica contatti | Nuovo |
| `gestione_staff_evento` | Ufficio, AM, Direzione | Assegnare staff a eventi | Nuovo |
| `gestione_logistica` | Ufficio | CRUD hotel/trasporti | Nuovo |
| `gestione_costi` | Ufficio | CRUD preventivi e costi | **Già esiste** nell'enum |
| `approva_preventivi` | Ufficio org, Direzione | Approvare/rifiutare preventivi | Nuovo |

**Nota migrazione enum:** `ALTER TYPE permission_type ADD VALUE` per i 4 nuovi permessi (`gestione_contatti`, `gestione_staff_evento`, `gestione_logistica`, `approva_preventivi`) deve essere in una **migrazione separata** dai policy/tabelle che li referenziano (vincolo PostgreSQL — i nuovi valori enum non sono visibili nella stessa transazione). `gestione_costi` esiste già, non serve ADD VALUE.

### Commerciali — regole specifiche

- Creare nuovi contatti (proprietario = sé stessi)
- Proporre partecipanti (aggiungere con stato `invitato`) — gestito da nuova policy INSERT-only `event_participants_commerciale_insert` (vedi sezione 3)
- Vedere staff/partecipanti/logistica dei propri eventi in sola lettura
- **Non** vedere dati completi dei contatti altrui (RLS su `proprietario_id`)

### Navigazione sidebar — aggiunge

| Voce | Route | Chi la vede |
|------|-------|-------------|
| Contatti | `/contatti` | Tutti (visibilità filtrata da RLS) |
| Costi | `/costi` | Ufficio, Direzione |

`/logistica` già in sidebar.

### Tab EventiDetail — aggiunge

| Tab | Contenuto | Visibilità |
|-----|-----------|------------|
| Persone | Staff + Partecipanti | Tutti (modifica per chi ha permesso) |
| Programma | Sotto-attività in timeline | Tutti (modifica per chi ha permesso) |
| Logistica | Hotel + Trasporti per persona | Tutti (modifica: `gestione_logistica`) |
| Costi | Preventivi + budget | `gestione_costi` o `approva_preventivi` |

### Admin — aggiunge

| Voce | Route |
|------|-------|
| Tipi sotto-attività | `/admin/sotto-attivita` |

---

## 9. Riepilogo modifiche DB

### Nuove tabelle

| Tabella | Scopo |
|---------|-------|
| `sub_activity_types` | Tipi sotto-attività configurabili (admin CRUD). RLS + updated_at trigger + index su `attivo` |
| `event_hotel` | Prenotazioni hotel per persona per evento. Due FK nullable (user_id, contact_id) con CHECK constraint |
| `event_trasporti` | Prenotazioni trasporto (andata/ritorno) per persona. Stesso pattern FK di event_hotel |
| `event_preventivi` | Preventivi con flusso approvazione e allegati. Indexes su event_id e stato (partial) |

### Tabelle deprecate

| Tabella | Azione |
|---------|--------|
| `event_logistics` (migration 005) | Rinominata `event_logistics_legacy`, RLS policy rimosse. Drop in migrazione futura |

### Nuovi enum

| Enum | Valori |
|------|--------|
| `contact_tipo` | `medico`, `fornitore`, `tecnico`, `istituzionale`, `altro` |
| `prenotazione_stato` | `da_prenotare`, `prenotato`, `confermato` |
| `trasporto_direzione` | `andata`, `ritorno` |
| `preventivo_stato` | `in_attesa`, `approvato`, `rifiutato`, `in_revisione` |

### Estensioni tabelle esistenti

| Tabella | Colonne aggiunte |
|---------|-----------------|
| `contacts` | `tipo_contatto`, `azienda` (rinomina `ente_ospedaliero`), `tipo_servizio`, `proprietario_id`, `zone_id`, `created_by` |
| `users` | `zone_id` (FK zones — zona di competenza per RLS Area Manager) |
| `events` | `certificato_previsto` (boolean) |
| `event_staff` | `updated_at` (timestamptz) + trigger `update_updated_at()` |
| `event_participants` | `updated_at` (timestamptz) + trigger `update_updated_at()` |
| `event_sub_activities` | `tipo_id` (FK sub_activity_types — affianca `tipo` enum, che resta deprecato), `fornitore_id` (FK contacts) |

### Nuovi permessi (enum `permission_type`)

`gestione_contatti`, `gestione_staff_evento`, `gestione_logistica`, `approva_preventivi` (4 nuovi — `gestione_costi` esiste già).

**Ordine migrazioni** (vincolo PostgreSQL enum):
1. Migrazione A: `ALTER TYPE permission_type ADD VALUE IF NOT EXISTS` per i 4 nuovi permessi (`gestione_contatti`, `gestione_staff_evento`, `gestione_logistica`, `approva_preventivi`) + `CREATE TYPE` per nuovi enum (`contact_tipo`, `prenotazione_stato`, `trasporto_direzione`, `preventivo_stato`). Usare `IF NOT EXISTS` come guardia contro re-run (PostgreSQL 14+ lo supporta, Supabase usa PG 15).
2. Migrazione B: DDL tabelle, ALTER TABLE, indexes, triggers, RLS policies, seed data, aggiornamento `user_permissions` per assegnare `gestione_costi` + nuovi permessi agli utenti `ufficio` (attualmente `gestione_costi` esiste nell'enum ma non è nel preset `ufficio` in `constants.js` — la migrazione deve inserire le righe in `user_permissions` e `constants.js` va aggiornato)

### RLS policies da aggiornare

| Policy | Modifica |
|--------|----------|
| `contacts_write` (migration 010, INSERT) | Aggiungere path per commerciali: INSERT consentito quando `proprietario_id = auth.uid()` |
| `contacts_update` (migration 010, UPDATE) | Aggiungere path per commerciali: UPDATE consentito quando `proprietario_id = auth.uid()` (possono modificare i propri contatti) |
| `event_participants_write` (migration 010) | Resta invariata. Aggiungere nuova policy INSERT-only `event_participants_commerciale_insert` (vedi sezione 3) |
| `sub_activities_write` (migration 010) | Aggiungere `area_manager` ai ruoli autorizzati |
| `logistics_read`, `logistics_write` (migration 010) | DROP prima del rename di `event_logistics` (vedi sezione 5) |

---

## 10. Cosa NON è in scope

- **Import CSV contatti** — struttura lo permette, implementazione rimandata
- **MedTech compliance** — basta avere i partecipanti registrati, reporting compliance in fase successiva
- **Generazione automatica certificati** — l'app traccia solo "serve il certificato" + lista presenti
- **Notifiche automatiche** — Phase 5
- **Dettagli strutturati logistica** — per ora stato + note, campi specifici aggiungibili in futuro
- **Migrazione completa `template_items.sub_tipo`** — resta enum, migrato con Readiness Engine

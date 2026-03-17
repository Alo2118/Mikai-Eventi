# Mikai Eventi — Design Specification

**Data:** 2026-03-17
**Progetto:** Sistema gestione eventi Mikai
**Stack:** React + Vite + TailwindCSS + Supabase → GitHub Pages (PWA)
**Costo:** Zero (free tier Supabase + GitHub Pages)

---

## 1. Contesto

Mikai e' un'azienda di dispositivi medici (ortopedia, traumatologia, chirurgia della mano) con circa 50 dipendenti. Organizza 40-50 eventi all'anno: workshop, corsi chirurgici, congressi nazionali/internazionali, cadaver lab, live surgery, convegni.

### Problemi attuali

1. **Conflitti materiale demo** — kit richiesti in contemporanea da piu' eventi, nessuna visibilita'
2. **Marketing in ritardo** — locandine e materiale promo consegnati troppo tardi
3. **Nessuna tracciabilita' materiale** — non si sa dove sono i kit demo
4. **Liste partecipanti non condivise** — dati duplicati, nessuno storico per medico
5. **Commerciali non forniscono dati in tempo** — info incomplete bloccano la preparazione
6. **Federica e' il collo di bottiglia** — ogni passaggio dipende da lei
7. **Nessuna compliance MedTech** — interazioni con medici non tracciate per audit

### Vincoli

- Costo zero (free tier)
- Accessibile ovunque (web + PWA mobile)
- Adottabile progressivamente (campi costo opzionali, nessun blocco)
- Permessi differenziati per ruolo

---

## 2. Struttura organizzativa

### Gerarchia commerciale

```
Giovanni (CEO)
└── Enrica (Dir. Commerciale)
    ├── Area Manager Nord
    │   ├── Agente 1
    │   └── Agente 2
    ├── Area Manager Centro
    │   ├── Agente 3
    │   └── Agente 4
    └── Area Manager Sud
        └── Agente 5
```

### Ufficio operativo

| Funzione | Ruolo operativo |
|----------|----------------|
| Segreteria organizzativa, coordinamento | `segreteria_org` |
| Materiale marketing (locandine, depliant, video) | `marketing` |
| Spedizioni, ritiri materiale demo | `logistica_spedizioni` |
| Ordini materiale, bolle, acquisti | `logistica_ordini` |
| Fatture, pagamenti | `amministrazione` |
| Formazione/docenza | `formatore` |

Una persona puo' coprire piu' ruoli operativi. I ruoli sono assegnabili e riassegnabili: se una persona va via, il sostituto eredita i ruoli.

---

## 3. Ruoli e permessi

### Ruoli base (accesso al sistema)

| Ruolo | Accesso |
|-------|---------|
| `admin` | Tutto + gestione utenti + template |
| `direzione` | Tutto in lettura + approvazioni configurate |
| `ufficio` | Tutto operativo, no gestione utenti |
| `area_manager` | Eventi della propria zona + approvazione sotto-soglia |
| `commerciale` | Solo propri eventi + form proposta |

### Permessi granulari (configurabili per utente)

| Permesso | Abilita |
|----------|---------|
| `approva_eventi` | Approvare/rifiutare eventi proposti |
| `approva_materiale` | Approvare richieste materiale demo |
| `gestione_costi` | Modificare costi, fatture, pagamenti |
| `compliance` | Report per medico, export audit |
| `gestione_utenti` | Creare/modificare utenti e permessi |

### Visibilita' (scope automatico)

| Ruolo | Vede |
|-------|------|
| admin, ufficio, direzione | Tutti gli eventi |
| area_manager | Eventi dei propri agenti + propri |
| commerciale | Solo eventi dove e' promotore o staff |
| formatore (ruolo operativo) | Solo eventi dove e' assegnato come staff |

La visibilita' area_manager si calcola risalendo la catena `responsabile_id` su users.

### Permesso contestuale: check-in partecipanti

Chi e' `event_staff` per un evento puo' modificare `stato_iscrizione` dei partecipanti (invitato → presente/assente) per quell'evento. Altrimenti read-only.

---

## 4. Schema database (23 tabelle)

### 4.1 CORE

#### users

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| email | text UNIQUE NOT NULL | Login |
| nome, cognome | text NOT NULL | |
| telefono | text | |
| avatar_url | text | |
| ruolo | enum | admin, direzione, ufficio, area_manager, commerciale |
| ruoli_operativi | text[] | ["segreteria_org", "marketing", ...] |
| responsabile_id | uuid FK → users | Gerarchia: agente→area_manager→direzione |
| attivo | boolean DEFAULT true | Soft delete |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz | Trigger automatico |

#### user_permissions

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| permission | enum | approva_eventi, approva_materiale, gestione_costi, compliance, gestione_utenti |

UNIQUE(user_id, permission)

#### contacts

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| nome, cognome | text NOT NULL | |
| email | text | |
| telefono | text | |
| ente_ospedaliero | text | |
| ruolo_medico | text | |
| specializzazione | text | |
| note | text | |
| attivo | boolean DEFAULT true | |
| created_at, updated_at | timestamptz | |

Anagrafica centralizzata medici/dottori. Storico partecipazioni derivato da join con event_participants.

### 4.2 EVENTI

#### events

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| titolo | text NOT NULL | |
| tipo_evento | enum | workshop, corso, congresso, convegno, cadaver_lab, live_surgery |
| modalita | enum | interno, esterno, contributo |
| luogo | text | |
| sede_dettaglio | text | |
| data_inizio, data_fine | date | |
| desk_richiesto | boolean | |
| n_postazioni | integer | |
| stato | enum | proposto, confermato, in_preparazione, pronto, in_corso, concluso, cancellato |
| motivo_cancellazione | text | Obbligatorio se stato=cancellato |
| parent_event_id | uuid FK → events | NULL se principale |
| promotore_id | uuid FK → users | Chi ha proposto |
| manager_user_id | uuid FK → users | Area manager del promotore. Denormalizzato alla creazione per RLS performante. |
| clonato_da_id | uuid FK → events | NULL se originale |
| budget_previsto | decimal | Opzionale. Usato per verifica soglia approvazione area_manager. Se NULL, si applica la logica `area_manager_can_approve` del tipo evento. |
| ricorrenza | enum NULL | annuale, semestrale |
| mese_tipico | integer | 1-12, per suggerimento ricorrenza |
| note | text | |
| created_by | uuid FK → users | |
| created_at, updated_at | timestamptz | |

#### event_templates

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| tipo_evento | enum | Stesso enum di events |
| modalita | enum | interno, esterno, contributo |
| nome_template | text | |
| created_at, updated_at | timestamptz | |

#### template_items

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| template_id | uuid FK → event_templates | |
| tipo | enum | checklist, sub_activity, logistics |
| descrizione | text | |
| assegnazione_ruolo_operativo | text | "marketing", "logistica_spedizioni", ecc. |
| giorni_prima_evento | integer | Negativo=prima, positivo=dopo. Es: -14, +3 |
| obbligatorio | boolean DEFAULT true | Task opzionali non bloccano auto-completamento |
| pre_approvazione | boolean DEFAULT false | Se true, il task parte prima dell'approvazione |
| ordine | integer | |
| sub_tipo | enum NULL | pranzo, cena, aperitivo, coffee_break, meeting, altro (solo per tipo=sub_activity) |
| n_pax_default | integer | Solo per tipo=sub_activity |
| logistics_tipo | enum NULL | trasporto, alloggio (solo per tipo=logistics) |

### 4.3 MATERIALE

#### materials

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| nome | text NOT NULL | |
| tipo | enum | demo_kit, montaggio, strumentario, altro |
| codice_inventario | text UNIQUE | |
| quantita_totale | integer | |
| posizione_attuale | enum | magazzino, evento, agente, spedito, manutenzione — campo derivato, aggiornato da trigger DB su INSERT in material_movements |
| posizione_dettaglio | text | Testo libero per dettagli |
| foto_url | text | |
| note | text | |
| attivo | boolean DEFAULT true | |
| created_at, updated_at | timestamptz | |

#### event_materials (solo richiesta/approvazione)

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| material_id | uuid FK → materials | |
| quantita_richiesta | integer | |
| data_inizio_utilizzo | date NOT NULL | Inizio periodo richiesto (per verifica conflitti) |
| data_fine_utilizzo | date NOT NULL | Fine periodo richiesto (per verifica conflitti) |
| stato | enum | richiesto, approvato, rifiutato |
| richiesto_da | uuid FK → users | |
| approvato_da | uuid FK → users | |
| data_richiesta | timestamptz | |
| data_approvazione | timestamptz | |
| note | text | |

Lo stato fisico (spedito, consegnato, rientrato) si legge da material_movements. Nessun doppio tracking.

Verifica conflitti: query su `event_materials` dove `material_id` coincide e i range `data_inizio_utilizzo/data_fine_utilizzo` si sovrappongono e `stato != 'rifiutato'`.

#### material_movements (registro fisico)

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| material_id | uuid FK → materials | |
| event_id | uuid FK → events | Opzionale |
| tipo | enum | uscita, rientro, trasferimento |
| modalita | enum | spedizione, mano, gia_in_loco, trasferimento_da_altro_evento |
| da_posizione | text | |
| a_posizione | text | |
| data_movimento | timestamptz | |
| data_rientro_prevista | date | |
| responsabile_id | uuid FK → users | |
| tracking_spedizione | text | |
| stato_rientro | enum NULL | integro, parziale, danneggiato (solo per tipo=rientro) |
| quantita_rientrata | integer | Se diversa dalla quantita' uscita |
| note_danni | text | |
| foto_danno_url | text | |
| created_at | timestamptz | |

#### gadgets

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| nome | text NOT NULL | |
| descrizione | text | |
| foto_url | text | |
| quantita_disponibile | integer | |
| soglia_minima | integer | Alert quando scende sotto |
| fornitore_abituale | text | |
| attivo | boolean DEFAULT true | |
| created_at, updated_at | timestamptz | |

#### event_gadgets

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| gadget_id | uuid FK → gadgets | |
| quantita_richiesta | integer | |
| quantita_consegnata | integer | |
| stato | enum | richiesto, pronto, consegnato |
| note | text | |

### 4.4 PERSONE

#### event_staff

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| user_id | uuid FK → users | |
| ruolo_evento | enum | formatore, responsabile, staff, commerciale, relatore, ospite |
| confermato | boolean DEFAULT false | |
| created_at | timestamptz | |

UNIQUE(event_id, user_id)

#### event_participants

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| contact_id | uuid FK → contacts | Anagrafica centralizzata |
| tipo | enum | discente, relatore_esterno, ospite, accompagnatore |
| stato_iscrizione | enum | invitato, confermato, presente, assente |
| note | text | |
| created_at | timestamptz | |

UNIQUE(event_id, contact_id)

### 4.5 LOGISTICA

#### event_sub_activities

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| tipo | enum | pranzo, cena, aperitivo, meeting, coffee_break, altro |
| data_ora | timestamptz | |
| durata_minuti | integer | |
| luogo | text | |
| indirizzo | text | |
| n_partecipanti_previsti | integer | |
| fornitore | text | Autocompletamento da valori precedenti |
| confermata | boolean DEFAULT false | |
| template_item_id | uuid FK → template_items NULL | Per tracciare quale item del template ha generato questa sub-activity (learning loop) |
| generato_da_template | boolean DEFAULT false | |
| note | text | |
| created_at, updated_at | timestamptz | |

#### event_logistics (un record = UNA cosa)

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| contact_id | uuid FK → contacts | Per partecipanti esterni |
| user_id | uuid FK → users | Per staff interno |
| persona_nome | text | Fallback se ne' contact ne' user |
| tipo | enum | trasporto, alloggio, transfer |
| mezzo | enum NULL | treno, aereo, auto, bus, altro (solo tipo=trasporto/transfer) |
| da_luogo | text | Solo tipo=trasporto/transfer |
| a_luogo | text | Solo tipo=trasporto/transfer |
| data_ora_partenza | timestamptz | Solo tipo=trasporto/transfer |
| data_ora_arrivo | timestamptz | Solo tipo=trasporto/transfer |
| compagnia | text | Solo tipo=trasporto/transfer |
| codice_prenotazione | text | Solo tipo=trasporto/transfer |
| hotel_nome | text | Solo tipo=alloggio |
| hotel_indirizzo | text | Solo tipo=alloggio |
| check_in | date | Solo tipo=alloggio |
| check_out | date | Solo tipo=alloggio |
| n_notti | integer | Solo tipo=alloggio |
| prenotazione_confermata | boolean DEFAULT false | |
| note | text | |
| created_at, updated_at | timestamptz | |

### 4.6 COSTI (centralizzati)

#### event_costs

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| source_tipo | enum | sub_activity, logistics, materiale, sponsorizzazione, iscrizioni, desk, gadget, altro |
| source_id | uuid | Opzionale, punta al record specifico |
| contact_id | uuid FK → contacts | Opzionale. Popolato quando il costo e' attribuibile a un medico/persona specifica. Necessario per report compliance MedTech (spesa per medico). |
| descrizione | text | |
| importo_previsto | decimal | Opzionale |
| importo_effettivo | decimal | Opzionale |
| fornitore | text | |
| n_fattura | text | |
| stato_pagamento | enum | da_pagare, pagato, parzialmente_pagato | Lo stato di approvazione e' determinato da `approvato_da IS NOT NULL`, non da questo campo |
| approvato_da | uuid FK → users | NULL = non ancora approvato. Se popolato = approvato da quell'utente |
| created_at, updated_at | timestamptz | |

Tutti i campi costo sono opzionali. Nessun campo economico blocca il flusso di lavoro.

### 4.7 WORKFLOW

#### event_tasks (tutto cio' che qualcuno deve fare)

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| tipo | enum | checklist, approvazione, verifica, marketing, generico |
| descrizione | text NOT NULL | |
| assegnato_a | uuid FK → users | |
| data_scadenza | date | |
| priorita | enum DEFAULT 'normale' | bassa, normale, alta |
| obbligatorio | boolean DEFAULT true | Task opzionali non bloccano auto-completamento |
| pre_approvazione | boolean DEFAULT false | Se true, lavorabile prima dell'approvazione evento |
| completato | boolean DEFAULT false | |
| completato_il | timestamptz | |
| completato_da | uuid FK → users | |
| feedback_post | text | Per loop apprendimento post-evento |
| generato_da_template | boolean DEFAULT false | |
| template_item_id | uuid FK → template_items NULL | Quale item del template ha generato questo task. Necessario per il loop di apprendimento post-evento (template_suggestions). |
| ordine | integer | |
| created_at, updated_at | timestamptz | |

#### activity_log (audit trail, append-only)

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| entita_tipo | enum | event, material, material_request, document, cost, user, participant, task, staff |
| entita_id | uuid | |
| azione | enum | creato, modificato, approvato, rifiutato, cancellato, stato_cambiato |
| campo_modificato | text | |
| valore_precedente | text | |
| valore_nuovo | text | |
| eseguito_da | uuid FK → users | |
| commento | text | |
| created_at | timestamptz DEFAULT now() | |

Solo INSERT, mai UPDATE o DELETE. Audit trail completo.

### 4.8 DOCUMENTI & NOTIFICHE

#### documents

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| event_id | uuid FK → events | Opzionale |
| material_id | uuid FK → materials | Opzionale |
| tipo | enum | contratto, programma, locandina, depliant, bolla, fattura, presentazione, foto, altro |
| nome_file | text NOT NULL | |
| file_url | text NOT NULL | Supabase Storage |
| stato | enum | bozza, in_revisione, approvato, definitivo |
| versione | integer DEFAULT 1 | Incrementale |
| caricato_da | uuid FK → users | |
| created_at | timestamptz | |

#### notifications

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | Destinatario |
| categoria | enum | nuovo_evento, approvazione, materiale, conflitto, scadenza, scadenza_altrui, rientro_scaduto |
| titolo | text | |
| messaggio | text | |
| link | text | URL interno alla pagina rilevante |
| letta | boolean DEFAULT false | |
| canale_inviato | enum | in_app, email, digest |
| created_at | timestamptz | |

#### notification_preferences

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| categoria | text | Stesse categorie di notifications |
| canale | enum | in_app, email, digest, off |

UNIQUE(user_id, categoria)

#### template_suggestions (loop apprendimento)

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| template_item_id | uuid FK → template_items | |
| event_id | uuid FK → events | Da dove viene il feedback |
| tipo | enum | anticipa_scadenza, posticipa_scadenza, aggiungi_task, rimuovi_task |
| dettaglio | text | |
| applicata | boolean DEFAULT false | |
| created_at | timestamptz | |

---

## 5. Transizioni di stato

### 5.1 Eventi

| Da | Azione | A | Chi puo' |
|----|--------|---|----------|
| proposto | approva | confermato | `approva_eventi` |
| proposto | rifiuta | cancellato | `approva_eventi` |
| confermato | (automatico: auto-pilota) | in_preparazione | sistema |
| in_preparazione | (automatico: tutti task obbligatori completati) | pronto | sistema |
| pronto | (automatico: data_inizio raggiunta) | in_corso | sistema |
| in_corso | (automatico: data_fine superata) | concluso | sistema |
| qualsiasi tranne concluso | cancella | cancellato | `approva_eventi` |

Cancellazione richiede `motivo_cancellazione` obbligatorio.

### 5.2 Event Materials (richiesta)

| Da | Azione | A | Chi puo' |
|----|--------|---|----------|
| richiesto | approva | approvato | `approva_materiale` |
| richiesto | rifiuta | rifiutato | `approva_materiale` |

### 5.3 Documents

| Da | Azione | A | Chi puo' |
|----|--------|---|----------|
| bozza | invia revisione | in_revisione | chi ha caricato |
| in_revisione | approva | approvato | ufficio, admin, direzione |
| in_revisione | richiedi modifiche | bozza | ufficio, admin, direzione |
| approvato | segna definitivo | definitivo | ufficio, admin |

### 5.4 Event Participants

| Da | Azione | A | Chi puo' |
|----|--------|---|----------|
| invitato | conferma | confermato | ufficio, admin |
| confermato | check-in | presente | ufficio, admin, event_staff dell'evento |
| confermato | segna assente | assente | ufficio, admin |

### 5.5 Approvazione eventi a 2 livelli

- Area manager: puo' approvare eventi sotto soglia (configurabile)
- Sopra soglia: Enrica o Giovanni. Basta 1 dei 2.

Le soglie sono memorizzate in una tabella di configurazione:

#### approval_thresholds

| Campo | Tipo | Note |
|-------|------|------|
| id | uuid PK | |
| tipo_evento | enum NULL | Se NULL, vale per tutti i tipi |
| soglia_importo | decimal | Budget massimo approvabile da area_manager |
| area_manager_can_approve | boolean DEFAULT true | |

Se l'evento non ha budget previsto, l'area manager puo' approvare solo i tipi esplicitamente abilitati.

---

## 6. Flussi operativi

### 6.1 Ciclo di vita evento

```
AGENTE                 AREA MANAGER          DIREZIONE              SISTEMA              UFFICIO
  |                        |                      |                    |                    |
  |-- propone evento ----->|                      |                    |                    |
  |   (o clona passato)    |-- sotto soglia? ---->|                    |                    |
  |                        |   SI: approva        |                    |                    |
  |                        |   NO: inoltra ------>|-- approva          |                    |
  |                        |                      |                    |                    |
  |                        |                      |                    |-- AUTO-PILOTA:     |
  |                        |                      |                    |   carica template  |
  |                        |                      |                    |   genera tasks     |
  |                        |                      |                    |   assegna x ruolo  |
  |                        |                      |                    |   genera sub-act.  |
  |                        |                      |                    |   notifica tutti   |
  |                        |                      |                    |   stato→in_prepar. |
  |                        |                      |                    |                    |
  |                        |                      |                    |                    |-- completano
  |                        |                      |                    |                    |   task in
  |                        |                      |                    |                    |   parallelo
  |                        |                      |                    |-- TUTTI obblig.    |
  |                        |                      |                    |   completati?      |
  |                        |                      |                    |   stato→pronto     |
  |                        |                      |                    |                    |
  |                        |                      |                    |-- date→in_corso    |
  |                        |                      |                    |-- date→concluso    |
  |                        |                      |                    |                    |
  |                        |                      |                    |-- genera task      |
  |                        |                      |                    |   post-evento      |
  |                        |                      |                    |                    |-- report +
  |                        |                      |                    |                    |   rientro mat.
  |                        |                      |                    |                    |   + consuntivo
```

**Preparazione anticipata:** Task con `pre_approvazione = true` partono subito dopo la proposta (bozza locandina, riserva materiale). Se evento rifiutato, alert annullamento.

**Modifica significativa:** Log in activity_log + notifica a tutti gli assegnati. Se materiale gia' spedito, alert specifico a logistica_spedizioni.

**Cancellazione:** Stato cancellato + motivo obbligatorio + notifica a tutti + alert rientro materiale se gia' uscito. Evento resta visibile per storico (soft delete).

**Vista commerciale:** Scheda read-only con semafori (approvato/materiale/logistica/marketing/gadget). No dettagli interni su chi fa cosa.

**Clonazione:** Copia tipo, luogo, note, staff tipico, materiale tipico, sotto-attivita'. Date da compilare. Campo `clonato_da_id` per tracciabilita'.

### 6.2 Materiale demo

```
RICHIEDENTE           SISTEMA                APPROVATORE           RESP. FISICO
  |                      |                        |                    |
  |-- richiede --------->|-- verifica conflitti   |                    |
  |                      |   date occupate? ----> alert + suggerimento |
  |                      |   libero? ----------->|                    |
  |                      |                        |-- approva          |
  |                      |                        |   notifica ------->|
  |                      |                        |                    |-- prepara
  |                      |                        |                    |   crea movement
  |                      |                        |                    |   (modalita:
  |                      |                        |                    |    spedizione |
  |                      |                        |                    |    mano |
  |                      |                        |                    |    gia_in_loco)
  |                      |                        |                    |
  |                 [dopo evento]                                     |
  |                      |-- cron: rientro        |                    |
  |                      |   scaduto? ----------> alert ------------->|
  |                      |                        |                    |-- registra rientro
  |                      |                        |                    |   integro | parziale
  |                      |                        |                    |   | danneggiato
  |                      |-- se danneggiato:      |                    |
  |                      |   materials.stato →    |                    |
  |                      |   manutenzione         |                    |
```

**Verifica conflitti automatica:** Quando si richiede materiale, il sistema verifica se quel kit e' gia' assegnato ad altro evento nelle stesse date. Se si', alert di conflitto + suggerimento date alternative o kit alternativi.

**Packing list automatica:** Vista "Spedizioni della settimana" con data "spedire entro" calcolata automaticamente (data_evento - N giorni lavorativi configurabili).

### 6.3 Materiale marketing

```
BRIEF (in scheda evento) → TASK automatico a ruolo "marketing"
                            ↓
                        carica bozza (documents, stato: bozza)
                            ↓
                        invia revisione (stato: in_revisione)
                            ↓
                        approvato? → SI: stato definitivo
                                   → NO: richiedi modifiche → nuova versione → loop
```

### 6.4 Costi e pagamenti

```
COSTO GENERATO                   CHI HA gestione_costi        AMMINISTRAZIONE
  |                                  |                              |
  |-- automatico da sub_activity,    |                              |
  |   logistics, materiale, ecc. --->|-- importo_previsto           |
  |                                  |                              |
  |              [fattura ricevuta]                                  |
  |                                  |                              |-- registra fattura
  |                                  |                              |   importo_effettivo
  |                                  |                              |   n_fattura
  |                                  |                              |-- stato: da_pagare
  |                                  |                              |-- stato: pagato
```

Tutti i costi centralizzati in `event_costs`. Report = `SELECT SUM() FROM event_costs WHERE event_id = X`.

### 6.5 Gadget (semplificato)

1. Segreteria indica gadget necessari nella scheda evento
2. Logistica prepara
3. Scorta sotto soglia → alert automatico a `logistica_ordini`
4. Nessuna movimentazione singola, solo quantita' consumate per evento
5. Nella UI, gadget e materiale demo appaiono insieme nella sezione "Materiale & Gadget"

### 6.6 Post-evento e apprendimento

Quando `data_fine` superata e stato → `concluso`:

1. Sistema genera task automatici:
   - `logistica_spedizioni`: verifica rientro materiale
   - `segreteria_org`: compila report (partecipanti effettivi, feedback)
   - `gestione_costi`: chiudi consuntivo
2. Report strutturato con dropdown + note
3. Se feedback suggerisce modifica template → proposta automatica (`template_suggestions`)
4. Se accettata → template aggiornato per prossimo evento

---

## 7. Notifiche

### 7.1 Canali

| Canale | Descrizione |
|--------|-------------|
| **In-app** | Badge nell'app, lista notifiche. Sempre attivo per tutti. |
| **Email** | Per scadenze urgenti e escalation. Configurabile per utente. |
| **Digest** | Riepilogo giornaliero/settimanale. Ideale per direzione. |

### 7.2 Trigger

| Trigger | Destinatari | Canale default |
|---------|------------|----------------|
| Evento proposto | Chi ha `approva_eventi` + area manager zona | in-app |
| Evento approvato | Promotore + segreteria_org | in-app + email |
| Task assegnato | Assegnatario | in-app |
| Scadenza -7gg | Assegnatario | in-app |
| Scadenza -3gg | Assegnatario | in-app + email |
| Scadenza scaduta | Assegnatario + segreteria_org + direzione | in-app + email |
| Conflitto materiale | segreteria_org + logistica_spedizioni | in-app + email |
| Rientro materiale scaduto | logistica_spedizioni + segreteria_org | in-app + email |
| Scorta gadget sotto soglia | logistica_ordini | in-app |
| Modifica significativa evento | Tutti gli assegnati | in-app |
| Evento cancellato | Tutti assegnati + alert rientro materiale | in-app + email |
| Digest settimanale | direzione | email |
| Evento ricorrente da ricreare | segreteria_org | in-app |

Ogni utente puo' configurare le proprie preferenze in `notification_preferences`.

---

## 8. Automazioni

| # | Automazione | Trigger | Azione |
|---|------------|---------|--------|
| 1 | Auto-pilota | Evento approvato | Genera task da template + assegna per ruolo operativo + notifica |
| 2 | Auto-completamento | Tutti task obbligatori completati | Stato → pronto + notifica verifica |
| 3 | Conflitto materiale | Richiesta materiale | Verifica disponibilita' date, suggerisce alternative |
| 4 | Alert rientro | Cron giornaliero | Notifica se data_rientro_prevista superata |
| 5 | Alert scorte gadget | Gadget consumato | Notifica se sotto soglia_minima |
| 6 | Transizione date | Date evento raggiunte | in_corso / concluso automatico |
| 7 | Task post-evento | Stato → concluso | Genera task rientro + report + consuntivo |
| 8 | Eventi ricorrenti | Cron mensile | Suggerisci creazione se mese_tipico prossimo mese |
| 9 | Escalation scadenze | Cron giornaliero | -7gg in-app, -3gg email, scaduta escalation |
| 10 | Packing list | Evento a -N giorni | Vista spedizioni settimanali automatica |
| 11 | Sync posizione materiale | INSERT su material_movements | Trigger DB aggiorna `materials.posizione_attuale` con `a_posizione` dell'ultimo movement |

---

## 9. Interfaccia utente

### 9.1 Navigazione

**Desktop (sidebar):**
- Dashboard
- Eventi (lista + calendario)
- Materiale & Gadget
- Contatti
- Documenti
- Notifiche
- Impostazioni (admin)

**Mobile (bottom bar — commerciali/agenti):**
- Eventi (i miei)
- Proponi (+)
- Notifiche
- Profilo

### 9.2 Dashboard per ruolo

**Direzione (Enrica, Giovanni):**
- N. eventi questo mese, in ritardo, da approvare, % completamento
- Timeline eventi + approvazioni pendenti + budget overview
- "Commerciali in ritardo" (dati incompleti)

**Segreteria (Federica):**
- Da pianificare, in preparazione, questa settimana, scadenze imminenti
- Checklist attive + iscrizioni + prenotazioni

**Logistica spedizioni (Ivan):**
- Da preparare, in transito, rientro scaduto, kit in magazzino
- Calendario uscite/rientri + packing list settimanale

**Marketing (Nicola):**
- Task scaduti, in scadenza, completati oggi
- File da caricare / in revisione

**Area manager:**
- Eventi della zona (per stato), agenti con dati incompleti
- Approvazioni sotto-soglia pendenti

**Commerciale/Agente:**
- I miei eventi (con semafori stato), dati da completare
- Proponi nuovo evento

### 9.3 Dettaglio evento (tab)

| Tab | Contenuto | Visibile per |
|-----|-----------|-------------|
| Info | Dati generali + stato workflow + semafori | Tutti |
| Staff | Staff interno assegnato | Ufficio, direzione |
| Partecipanti | Lista da contacts + stato iscrizione + check-in | Ufficio, direzione, event_staff |
| Materiale & Gadget | Materiale demo + gadget insieme | Ufficio, direzione |
| Sotto-attivita' | Pranzi, cene, meeting | Ufficio, direzione |
| Logistica | Viaggi + alloggi | Ufficio, direzione |
| Costi | Budget previsto vs effettivo | Chi ha `gestione_costi` |
| Documenti | File con stato (bozza→definitivo) | Tutti (upload: ufficio) |
| Checklist | Task assegnati con scadenze | Tutti (propri task) |
| Report | Post-evento + feedback | Ufficio, direzione |

### 9.4 Distinzione eventi per modalita'

| Sezione | Interno | Esterno | Contributo |
|---------|---------|---------|-----------|
| Info generali | Si' | Si' | Si' (minimo) |
| Staff | Si' | Si' | No |
| Partecipanti | Si' | No | No |
| Materiale & Gadget | Si' | Si' | No |
| Sotto-attivita' | Si' | Opzionale | No |
| Logistica | Si' | Si' (solo staff) | No |
| Costi | Si' | Si' | Si' |
| Documenti | Si' | Si' | Opzionale |
| Checklist | Completa | Ridotta | Minima |

---

## 10. Principi UI/UX — Interfaccia a prova di anziano

L'app sara' usata da persone con livelli di confidenza digitale molto diversi: da chi usa solo WhatsApp e Excel a chi e' piu' tech-savvy. Il design deve funzionare per TUTTI senza formazione. Il principio: se tua madre non riesce a usarla al primo tentativo, e' sbagliata.

### 10.1 Regole fondamentali

| Regola | Cosa significa in pratica |
|--------|--------------------------|
| **Testi grandi, leggibili** | Font base minimo 16px. Nessun testo sotto 14px. Bottoni con testo, mai solo icone. |
| **Contrasto alto** | Rapporto contrasto minimo WCAG AA (4.5:1). No grigio chiaro su bianco. Colori saturi per gli stati. |
| **Un'azione per schermata** | Ogni pagina ha UNA cosa principale da fare, evidente. L'utente non deve capire cosa gli si chiede. |
| **Zero gergo tecnico** | "Stato: proposto" diventa "In attesa di approvazione". "In_preparazione" diventa "In preparazione". Nessun underscore, nessun codice, nessun termine inglese. |
| **Touch-friendly** | Tutti gli elementi cliccabili minimo 48x48px (standard mobile). Spaziatura generosa tra bottoni. Niente menu a tendina nidificati. |
| **Feedback immediato** | Ogni azione ha conferma visiva chiara: toast di conferma, cambio colore, segno di spunta animato. L'utente non deve chiedersi "ha funzionato?". |
| **Nessun dead-end** | Ogni schermata ha un'azione evidente. Se non c'e' niente da fare, lo dice esplicitamente ("Tutto in ordine, nessuna azione richiesta"). |
| **Pochi livelli di navigazione** | Massimo 2 click per arrivare a qualsiasi funzione. Home → lista → dettaglio. Mai di piu'. |
| **Errori perdonabili** | Conferma prima di azioni distruttive ("Vuoi davvero cancellare?"). Undo dove possibile. Nessuna azione irreversibile senza doppia conferma. |

### 10.2 Linguaggio dell'interfaccia

Tutta l'app in italiano, con linguaggio naturale e colloquiale — non "enterprise".

| Invece di... | Scrivere... |
|-------------|-------------|
| Submit | Invia |
| Delete | Elimina |
| Confirm | Conferma |
| Status: proposto | In attesa di approvazione |
| Status: confermato | Approvato |
| Status: in_preparazione | In preparazione |
| Status: pronto | Tutto pronto |
| Status: in_corso | In corso |
| Status: concluso | Concluso |
| Status: cancellato | Annullato |
| Evento creato con successo | Evento creato! |
| Nessun risultato trovato | Nessun evento trovato. Prova a cambiare i filtri. |
| Errore 500 | Qualcosa e' andato storto. Riprova tra qualche secondo. |
| Upload file | Carica file |
| Deadline | Scadenza |
| Template | Modello |
| Dashboard | Riepilogo |
| Checklist | Lista attivita' |
| Overview | Panoramica |

### 10.3 Design dei bottoni e azioni

**Bottone principale:** Grande, colorato, con testo chiaro che descrive l'azione.
```
  [ + Proponi nuovo evento ]        non    [ + Nuovo ]
  [ Segna come spedito ]            non    [ Update status ]
  [ Approva evento ]                non    [ Approve ]
  [ Carica locandina ]              non    [ Upload ]
```

**Semafori di stato:** Colori grandi e inequivocabili con testo.
```
  🟢 Tutto pronto            non    ● pronto
  🟡 In preparazione         non    ● in_preparazione
  🔴 Scadenza superata       non    ● overdue
```

**Azioni pericolose:** Rosse, separate dalle altre, con conferma.
```
  [ Annulla evento ]  →  "Sei sicuro? L'evento verra' annullato e tutti i responsabili saranno avvisati."
                          [ Si', annulla ]  [ No, torna indietro ]
```

### 10.4 Orientamento: dove sono, cosa sto facendo, come torno indietro

L'utente non deve MAI sentirsi perso. In ogni momento deve poter rispondere a 3 domande:
1. **Dove sono?**
2. **Cosa sto facendo?**
3. **Come torno indietro?**

#### Breadcrumb sempre visibile (desktop)

Barra di contesto in cima a ogni pagina, con percorso cliccabile:

```
Desktop:
┌──────────────────────────────────────────────────────────────┐
│  Eventi  ›  Workshop Poloso 17-18 mar  ›  Materiale & Gadget │
│                                                              │
│  [ ← Torna all'evento ]                                     │
│                                                              │
│  Materiale & Gadget                                          │
│  Workshop Fissatore Poloso — 17-18 marzo 2026, Verona       │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

- Ogni livello del breadcrumb e' cliccabile: click su "Eventi" torna alla lista, click su "Workshop Poloso" torna alla scheda evento
- Sotto il breadcrumb: titolo della sezione grande + nome evento + date come sottotitolo. Sempre. L'utente sa sempre A QUALE evento si riferisce quello che sta guardando.

#### Header contestuale (mobile)

Su mobile non c'e' spazio per un breadcrumb testuale. Si usa un header fisso con:

```
Mobile:
┌─────────────────────────────────┐
│  ← Indietro    WS Poloso       │
│                17-18 mar        │
├─────────────────────────────────┤
│  [Info] [Materiale] [Attivita'] │
│         ^^^^^^^^                │
│         tab attivo evidenziato  │
├─────────────────────────────────┤
│                                 │
│  (contenuto del tab)            │
│                                 │
└─────────────────────────────────┘
```

- **Freccia "← Indietro"** sempre in alto a sinistra — torna alla schermata precedente. Grande, facile da toccare. Mai nascosta.
- **Nome evento + date** sempre visibili nell'header — l'utente sa sempre di quale evento sta parlando
- **Tab** orizzontali scrollabili per le sezioni dell'evento — il tab attivo e' visivamente diverso (sottolineato, colore pieno)

#### Regole di orientamento

| Principio | Implementazione |
|-----------|----------------|
| **Titolo pagina sempre visibile** | Ogni pagina ha un titolo grande (h1) che dice cosa stai guardando: "I tuoi eventi", "Dettaglio evento", "Nuova proposta — passo 2 di 4" |
| **Contesto dell'evento** | Quando sei dentro un evento, nome + date sempre visibili in alto. Mai solo un ID o un titolo troncato. |
| **Freccia indietro ovunque** | Su mobile: freccia ← nell'header. Su desktop: link "← Torna a [nome pagina precedente]" sotto il breadcrumb. Il browser back funziona SEMPRE correttamente (SPA con history push). |
| **Tab attivo evidenziato** | Nella scheda evento, il tab corrente ha colore pieno + sottolineatura. Gli altri sono grigi. L'utente vede subito in quale sezione si trova. |
| **Wizard: indicatore di progresso** | Nel wizard di creazione evento, barra di progresso con step numerati: `① Tipo  ② Dove e quando  ③ Modalita'  ④ Riepilogo`. Lo step corrente e' evidenziato. Gli step completati hanno segno di spunta. |
| **Nessuna pagina senza via d'uscita** | Ogni schermata ha almeno un'azione per uscire: "Torna indietro", "Annulla", "Chiudi". Mai una modale senza X o bottone di chiusura. |
| **URL leggibili** | URL che riflettono la posizione: `/eventi`, `/eventi/abc123`, `/eventi/abc123/materiale`. Se l'utente condivide un link, chi lo apre arriva esattamente li'. |
| **Stato salvato nella navigazione** | Se l'utente sta filtrando la lista eventi (es. "solo workshop di marzo"), torna indietro, e poi rientra nella lista, i filtri sono ancora li'. Non si perdono. |
| **Conferma uscita da form non salvato** | Se l'utente sta compilando un form e clicca "Indietro", popup: "Hai modifiche non salvate. Vuoi uscire?" con [ Esci senza salvare ] e [ Resta qui ]. |

#### Wizard: indicatore di progresso

```
┌─────────────────────────────────────────────┐
│  Nuova proposta evento                      │
│                                             │
│  ✅ ① Tipo  ——  ● ② Dove e quando  ——  ○ ③ Modalita'  ——  ○ ④ Riepilogo │
│                                             │
│  Dove e quando?                             │
│                                             │
│  Titolo *                                   │
│  ┌─────────────────────────────────────┐    │
│  │ Workshop Fissatore Poloso           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Date *                                     │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ 17/03/2026   │  │ 18/03/2026   │         │
│  └──────────────┘  └──────────────┘         │
│                                             │
│  Luogo *                                    │
│  ┌─────────────────────────────────────┐    │
│  │ Sede Mikai, Verona                  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [ ← Indietro ]              [ Avanti → ]  │
│                                             │
└─────────────────────────────────────────────┘
```

- Barra di progresso in alto: step completati (✅), step corrente (●), step futuri (○)
- Bottoni "Indietro" e "Avanti" sempre visibili in fondo
- "Indietro" non cancella i dati gia' inseriti — l'utente puo' tornare e correggere
- Ultimo step: riepilogo di tutto + bottone "Invia proposta" (non "Avanti")

### 10.5 Navigazione semplificata

**Mobile (commerciali, area manager):**
```
┌─────────────────────────────────┐
│  Mikai Eventi                   │
│                                 │
│  Buongiorno, Marco!             │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🔴 1 cosa da fare         │  │
│  │ Completa i dati per il    │  │
│  │ Workshop del 24 marzo     │  │
│  │         [ Completa ora → ] │  │
│  └───────────────────────────┘  │
│                                 │
│  I tuoi eventi:                 │
│  ┌───────────────────────────┐  │
│  │ 📅 WS Poloso              │  │
│  │ 17-18 mar · Verona        │  │
│  │ 🟢 Approvato              │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 📅 Congresso SICM         │  │
│  │ 20-22 mar · Milano        │  │
│  │ 🟡 In attesa approvazione │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌─────────────────────────┐   │
│  │  + Proponi nuovo evento  │   │
│  └─────────────────────────┘   │
│                                 │
├────────┬────────┬────────┬─────┤
│ 📅     │  ➕    │  🔔    │ 👤  │
│ Eventi │Proponi │Notifiche│ Io  │
└────────┴────────┴────────┴─────┘
```

**Principi della home mobile:**
- Saluto personale (non "Dashboard")
- La cosa piu' urgente IN CIMA, con bottone diretto
- Lista eventi minima: solo titolo, date, stato con colore
- Bottone grande per proporre evento
- Bottom bar con 4 icone + testo sotto (mai solo icona)

**Desktop (ufficio):**
- Sidebar con icone + testo (mai icone sole)
- Area contenuto ampia con tabelle leggibili
- Filtri visibili, non nascosti in dropdown
- Azioni principali come bottoni, non come voci di menu

### 10.6 Form di inserimento

**Regole per i form:**
- Un campo per riga (mai 3 campi affiancati su mobile)
- Label SOPRA il campo (mai dentro come placeholder che scompare)
- Campi obbligatori marcati con asterisco rosso *, quelli opzionali con "(facoltativo)"
- Errori di validazione in rosso SOTTO il campo, con testo che spiega cosa fare: "Inserisci una data futura" non "Invalid date format"
- Bottone di invio visibile senza scrollare (o sticky in fondo)
- Salvataggio automatico della bozza (se l'utente chiude per sbaglio non perde tutto)
- Select/dropdown con ricerca integrata per liste lunghe (es. contatti medici)
- Date picker con calendario visuale, non campo di testo libero

**Wizard per eventi:**
La creazione evento e' un wizard a step, non un form unico lungo:
```
Step 1: Che tipo di evento? (cards grandi cliccabili, non dropdown)
  [ Workshop ]  [ Corso ]  [ Congresso ]  [ Convegno ]  [ Cadaver Lab ]

Step 2: Dove e quando?
  Titolo: _______________
  Date: [calendario visuale]
  Luogo: _______________

Step 3: Interno o esterno?
  [ Evento organizzato da noi ]  [ Partecipiamo a evento di altri ]  [ Solo contributo economico ]

Step 4: Riepilogo + Invia
  Rivedi tutto → [ Invia proposta ]
```

Massimo 4 step, nessuno con piu' di 3-4 campi.

### 10.7 Notifiche comprensibili

Le notifiche usano linguaggio naturale, non codici:

```
Invece di:  "Event #123 status changed to confermato"
Scrivere:   "Il Workshop Poloso del 17 marzo e' stato approvato da Enrica"

Invece di:  "Task assigned: prepare marketing material"
Scrivere:   "Hai una nuova attivita': prepara la locandina per il Workshop Poloso (scadenza: 3 marzo)"

Invece di:  "Material conflict detected for material_id 456"
Scrivere:   "Attenzione: il Kit Stylo #3 e' gia' prenotato per il Congresso SIOT (12-15 ottobre). Vuoi un kit alternativo?"
```

### 10.8 Accessibilita'

| Aspetto | Implementazione |
|---------|----------------|
| Font | Sistema (sans-serif nativo), no font decorativi. Inter o simile come fallback. |
| Dimensioni | 16px base, 14px minimo assoluto. Titoli 20-24px. |
| Colori | Non usare MAI solo il colore per comunicare stato — sempre colore + icona + testo. Rosso + 🔴 + "Scaduto". |
| Focus | Evidenziazione chiara degli elementi selezionati (outline visibile, non solo cambio colore sottile). |
| Loading | Scheletri di caricamento (skeleton), mai schermate bianche vuote. Spinner con testo "Caricamento..." |
| Offline | Se PWA offline, messaggio chiaro: "Sei offline. Le modifiche saranno salvate quando torni online." |
| Tap target | Minimo 48x48px per ogni elemento interattivo (bottoni, checkbox, link, righe tabella cliccabili). |

---

## 11. Funzionalita' aggiuntive

### 11.1 Clonazione evento
Copia da evento passato: tipo, modalita', luogo, note, staff tipici, materiale tipico, sotto-attivita'. Date da compilare. `clonato_da_id` per tracciabilita'.

### 11.2 Import iniziale
Import CSV/Excel per: eventi esistenti, anagrafica materiale demo, contatti medici, utenti. Utile al lancio.

### 11.3 Export calendario iCal
Pulsante "Aggiungi al calendario" per singolo evento. Feed iCal per calendario completo.

### 11.4 Stampe operative
Pulsante "Stampa/PDF" per: scheda evento riepilogativa, packing list materiale, lista partecipanti. CSS print-friendly.

### 11.5 Report compliance MedTech
Per chi ha permesso `compliance`:
- Spesa per medico/anno
- Spesa per tipologia (iscrizioni, viaggi, alloggi, cene)
- Alert soglia configurabile per medico
- Export CSV/PDF per audit

---

## 12. Stack tecnico

| Componente | Tecnologia |
|-----------|------------|
| Frontend | React + Vite + TailwindCSS |
| Backend/DB | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Hosting | GitHub Pages (SPA) |
| Mobile | PWA (installabile, offline-capable) |
| Email | Supabase Edge Functions |
| Cron jobs | Servizio cron esterno gratuito (es. cron-job.org) → chiama Supabase Edge Function. pg_cron non disponibile su free tier. |
| File storage | Supabase Storage |
| Auth | Supabase Auth (email + password) |
| Permessi DB | Row Level Security (RLS). Per area_manager: campo denormalizzato `manager_user_id` su events (popolato alla creazione dall'area manager del promotore) per evitare CTE ricorsive nelle policy RLS. |

### Costi: zero

- Supabase free tier: 500MB DB, 1GB storage, 50K auth users, 500K edge function invocations
- GitHub Pages: gratuito
- Unica limitazione: DB Supabase va in pausa dopo 1 settimana di inattivita' (si riattiva al primo accesso)

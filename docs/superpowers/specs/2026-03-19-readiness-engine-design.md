# Event Readiness Engine — Design Spec

**Data:** 2026-03-19
**Stato:** Brainstorming completo — sezioni 1-7 approvate (sezione 8 è appendice fix indipendenti)
**Scope:** Template checklist, cruscotto convergenza, dashboard per ruolo, logistica cross-evento, inventario attivo

---

## 1. Contesto e Problemi

### Problemi reali documentati
- Mezzo materiale consegnato (un magazzino spedisce, l'altro no)
- Depliant finiti il giorno prima della spedizione
- Locandine non fatte perché mancava titolo/orario evento
- Persone in aeroporto senza pickup
- Materiale richiesto diverso da quello consegnato
- Video/presentazioni non pronti in tempo
- Materiale disperso per mesi presso agenti, "perso" ma a carico aziendale

### Cause root
- Nessun owner chiaro della convergenza (a volte Federica, a volte il commerciale, a volte nessuno)
- Checklist nella testa delle persone, non formalizzate
- Attività parallele senza visibilità reciproca
- Nessun gate che blocca l'avanzamento se qualcosa manca
- Nessun tracking attivo della posizione materiale

---

## 2. Decisioni di Design Confermate

### 2.1 Ruoli e permessi
- Il sistema lavora per **ruoli e permessi**, non per persone
- I nomi (Ivan, Federica, Enrica, Giovanni) sono solo riferimenti per identificare i ruoli
- L'approvazione eventi è **pragmatica, non gerarchica rigida**: chiunque abbia `approva_eventi` può approvare, inclusa l'auto-approvazione
- La soglia budget è un suggerimento, non un blocco rigido

### 2.2 Preparazione eventi
- Le attività vanno **in parallelo** — non c'è una sequenza fissa
- Serve un **cruscotto di convergenza**, non un workflow sequenziale
- Le deadline sono di due tipi:
  - **Temporali**: X giorni prima della data evento (configurabili, non hardcoded)
  - **Dipendenze**: "non puoi fare Y finché Z non è completato"

### 2.3 Magazzini e materiale
- I magazzini sono **record nel DB** (tabella `magazzini`), non valori enum hardcoded — permette aggiunta/modifica/rimozione senza migrazioni
- **Magazzino principale**: Monteviale (Ivan coordina)
- **Magazzino secondario**: Genova (ha un suo operatore, ma coordinamento centralizzato)
- **Materiale presso persone**: agenti, commerciali, area manager portano materiale con sé — posizione `magazzino_agente`
- **Gestione centralizzata, esecuzione distribuita**: Ivan vede tutto, assegna "prepara questo" a Genova

### 2.4 Spedizione materiale
- L'indirizzo di spedizione è **indipendente dalla sede evento**
- Casi reali: hotel, fermo deposito, ufficio agente, oppure nessuna spedizione (commerciale ritira)
- Ogni evento deve avere un campo specifico per indirizzo spedizione (separato da sede evento)

### 2.5 Template e personalizzazione
- Ogni tipo evento ha un **template di attività** configurabile dall'admin
- Quando si crea un evento, il template viene istanziato con deadline calcolate
- **Chiunque coinvolto** può aggiungere attività custom all'evento
- Le attività da template sono il "minimo garantito"
- Ogni attività template ha un'obbligatorietà di default, ma **sovrascrivibile per singolo evento**
- Le attività possono essere disattivate completamente per un singolo evento
- Le deadline template sono configurabili e sovrascrivibili per singolo evento

### 2.6 Assegnazione attività
- Il template assegna al **ruolo/permesso** (non alla persona)
- Poi la persona si **auto-assegna** o viene **assegnata manualmente**
- Chiunque abbia il permesso corretto vede l'attività nella propria dashboard

---

## 3. Template Checklist per Tipo Evento (Approvato)

Ogni attività nel template ha:

| Campo | Tipo | Esempio |
|-------|------|---------|
| `descrizione` | Text | "Locandina evento" |
| `categoria` | Enum | logistica / marketing / materiale / organizzazione / amministrazione |
| `permesso_responsabile` | Permission | `gestione_spedizioni` (vedi sezione 9.3 per mapping completo) |
| `deadline_giorni` | Integer (negativo) | -15 (15 giorni prima dell'evento) |
| `dipende_da` | FK template_item | ID altra attività (o null) |
| `obbligatoria` | Boolean default | true (sovrascrivibile per evento) |
| `tipo_verifica` | Enum | manuale / automatica |
| `verifica_automatica` | Text | Nome della verifica (es. "lista_materiale_compilata") |

### Verifiche automatiche (il sistema controlla da solo)
- `lista_materiale_compilata` → event_materials ha almeno 1 riga
- `materiale_tutto_confermato` → nessuna riga event_materials in stato `richiesto`
- `indirizzo_spedizione_specificato` → evento ha indirizzo spedizione compilato
- `titolo_orario_definitivi` → titolo, data_inizio, data_fine compilati
- `materiale_tutto_preparato` → tutte le righe materiale in stato `in_preparazione` o successivo
- `materiale_tutto_spedito` → tutti i movimenti di uscita registrati per il materiale confermato

---

## 4. Cruscotto di Convergenza (Approvato)

Nuovo tab **"Preparazione"** nell'evento.

### Layout
- **Barra progresso**: "14 su 18 completate" con percentuale
- **Semaforo**: verde / giallo (scadenza entro 3gg) / rosso (in ritardo)
- **Prossima deadline**: "Locandina — scade tra 2 giorni"
- **Attività raggruppate** per categoria, ognuna come card con: stato, descrizione, responsabile (ruolo + persona), deadline, dipendenza, tipo verifica

### Stati attività
- Da fare (cerchio vuoto)
- In corso (cerchio mezzo)
- Completata (check verde)
- In ritardo (orologio rosso)
- Bloccata (lucchetto — dipendenza non completata)
- Disattivata (nascosta dal cruscotto)

### Gate avanzamento stato evento

Prerequisito: lo stato `rifiutato` deve essere aggiunto all'enum `evento_stato` (vedi appendice fix e sezione 9 schema).

| Transizione | Condizione |
|-------------|-----------|
| `proposto` → `confermato` | Approvazione (chi ha `approva_eventi`) |
| `proposto` → `rifiutato` | Rifiuto con motivazione obbligatoria |
| `confermato` → `in_preparazione` | Automatico: almeno 1 attività "in corso" |
| `in_preparazione` → `pronto` | Gate: TUTTE le attività obbligatorie attive completate. Bottone disabilitato con spiegazione se manca qualcosa |
| `pronto` → `in_corso` | Data evento è oggi (o manuale) |
| `in_corso` → `concluso` | Manuale + gate: tutti i materiali con rientro registrato o giustificato (rientro parziale con trattenimento) |
| `* (qualsiasi)` → `cancellato` | Sempre permesso con motivo obbligatorio. Le `event_activities` vengono messe in stato `disattivata`. Il materiale già spedito resta tracciato nei rientri attesi (sezione 6.2) — la cancellazione non elimina l'obbligo di rientro. |

Note:
- Eventi senza materiale possono passare a `concluso` liberamente (la condizione è vacuamente vera).
- `rifiutato` è uno stato terminale (come `cancellato`), non ha transizioni in uscita.

---

## 5. Dashboard per Ruolo (Approvato)

### Principio: home differenziata per modello mentale

Il ruolo determina il **tipo** di home page. I permessi dell'utente filtrano il **contenuto** mostrato.

| Ruolo | Home page | Modello mentale |
|-------|-----------|-----------------|
| **Commerciale** | Lista eventi + banner alert in cima | "I miei eventi" |
| **Ufficio** | Dashboard operativa — attività per urgenza | "Cosa devo fare oggi cross-evento" |
| **Magazzino** | Dashboard operativa — attività per urgenza | "Cosa devo preparare/spedire" |
| **Direzione** | Dashboard strategica | "Stato generale + decisioni" |

### 5.1 Commerciale — Banner Alert

Riga compatta sopra la lista eventi:
- Contatori: **in ritardo** (rosso) · **scade oggi** (giallo) · **prossimi 3gg** (grigio)
- Tap sul banner → pagina "Le mie attività" (lista filtrata delle attività assegnate al commerciale, ordinata per urgenza)
- Se zero attività pendenti → banner nascosto

### 5.2 Ufficio / Magazzino — Dashboard Operativa

Lista unica ordinata per deadline:
1. **In ritardo** (rosso) — deadline superata
2. **Oggi** (giallo) — scade oggi
3. **Prossimi 3 giorni** (yellow, più chiaro)
4. **Prossimi 7 giorni** (grigio)

Ogni riga attività mostra: descrizione, evento associato (link), deadline, stato (semaforo), responsabile assegnato.

**Filtro per categoria** (toggle in cima): Tutte / Logistica / Marketing / Materiale / Organizzazione / Amministrazione — permette il batch work.

**Routing home page per Ufficio vs Magazzino:** non esiste un ruolo `magazzino` nell'enum `user_role`. La distinzione avviene per **permessi**: un utente `ufficio` con `gestione_spedizioni` o `gestione_magazzino` (e senza altri permessi di gestione) vede la dashboard Magazzino. Un utente `ufficio` con permessi misti o organizzativi vede la dashboard Ufficio standard.

Il Magazzino vede solo le attività con `permesso_responsabile` compatibile con i suoi permessi. L'Ufficio vede tutto ciò che i propri permessi coprono.

### 5.3 Direzione — Dashboard Strategica

Tre widget:

1. **Coda approvazioni** — eventi in stato `proposto` che attendono approvazione. Card compatta con: titolo, promotore, data, budget stimato. Azione diretta: Approva / Rifiuta.
2. **Semafori eventi** — prossimi 10 eventi per data, ognuno con semaforo (verde/giallo/rosso) basato sullo stato delle attività obbligatorie. Tap → dettaglio evento tab Preparazione.
3. **Esposizione budget** — totale budget approvato per il mese/trimestre corrente. Numero singolo, non grafico complesso.

---

## 6. Logistica Cross-Evento (Approvato)

### Accesso
Nuova voce di navigazione **"Logistica"** visibile solo a chi ha `gestione_spedizioni` o `gestione_magazzino`.

### 6.1 Due viste con toggle

**Vista Timeline Spedizioni** (default):
- Lista cronologica di materiale da preparare/spedire, raggruppata per giorno
- Ogni riga: evento, descrizione materiale, quantità, indirizzo spedizione, deadline, stato (da preparare → preparato → spedito → consegnato)
- Filtri: periodo (questa settimana / prossime 2 settimane / mese), magazzino (Monteviale / Genova / tutti)
- Azioni rapide: segna come preparato, segna come spedito, inserisci tracking

**Vista Matrice Evento × Stato**:
- Righe: prossimi eventi (ordinati per data)
- Colonne: da preparare | preparato | spedito | consegnato
- Ogni cella mostra contatore pezzi. Colori semaforo: tutto ok (verde), parziale (giallo), niente fatto (rosso)
- Tap su cella → apre dettaglio materiale di quell'evento

### 6.2 Tab Rientri Attesi

Tab separato nella pagina Logistica:
- Lista materiale fuori magazzino, ordinata per urgenza: prima i rientri scaduti (rosso), poi quelli in scadenza
- Ogni riga: materiale, evento di provenienza, persona che ce l'ha, data uscita, giorni fuori, deadline rientro
- Azione: "Invia sollecito" (per ora segna come sollecitato con data, in futuro notifica)
- Alert visivo: badge sul tab "Rientri" con contatore dei rientri scaduti

---

## 7. Inventario Attivo e Alert (Approvato)

### 7.1 Posizione materiale

Il campo `posizione_attuale` sul materiale usa un enum semplificato per il **tipo** di posizione, più una FK opzionale al magazzino specifico:

**Enum `material_posizione`** (sostituisce l'esistente):
- `in_magazzino` — in un magazzino aziendale (quale: vedi FK `magazzino_id`)
- `magazzino_agente` — custodia stabile presso l'agente, nessun alert
- `in_transito` — spedito, non ancora consegnato (rinomina dell'esistente `spedito`)
- `presso_evento` — al luogo dell'evento (rinomina dell'esistente `evento`)
- `manutenzione` — mantenuto dall'enum esistente

**Campo `magazzino_id`** (FK nullable a `magazzini`): valorizzato quando `posizione_attuale = 'in_magazzino'`, null altrimenti.

**Campo `presso_utente_id`** (FK nullable a `users`): valorizzato quando `posizione_attuale = 'magazzino_agente'`, identifica l'agente custode.

Aggiornato automaticamente da trigger DB su INSERT in `material_movements`.

**Migrazione:** i valori esistenti `magazzino` → `in_magazzino`, `spedito` → `in_transito`, `evento` → `presso_evento`, `agente` → `magazzino_agente`. Il valore `manutenzione` resta invariato.

### 7.2 Rientro parziale con trattenimento

Un agente può trattenere materiale come "magazzino agente" per evitare spedizioni continue. Al rientro post-evento:

- Lista di tutti i pezzi usciti per quell'evento
- Per ogni pezzo: **Rientrato** oppure **Resta in custodia agente**
- "Rientrato" → posizione torna a `in_magazzino` con `magazzino_id` del magazzino di origine
- "Resta in custodia" → posizione diventa `magazzino_agente` con `presso_utente_id` dell'agente. L'`event_materials` resta per audit ma il campo `stato` diventa `chiuso_in_custodia`. Nessun alert.
- Pezzi non gestiti (né rientrati né giustificati) restano in stato pendente → soggetti ad alert

### 7.3 Alert automatici

**Rientro scaduto** — materiale uscito per un evento, `data_fine` evento superata di X giorni (default: 7, configurabile), pezzo non rientrato e non marcato come "in custodia". Visibile nella dashboard operativa (Magazzino) e nel tab Rientri della Logistica.

**Inventario periodico agente** (opzionale, disattivato di default) — ogni Y giorni (default: 90, configurabile), il sistema genera un promemoria per verificare il materiale in `magazzino_agente`. Non è un alert urgente, è una riconciliazione: "L'agente X ha 12 pezzi in custodia. Tutto corretto?" L'operatore conferma o aggiorna. Attivabile nelle impostazioni admin.

### 7.4 Vista Inventario

Accessibile dalla sezione Logistica (tab aggiuntivo):
- Lista tutto il materiale con posizione corrente
- Filtri: posizione (magazzino / agente / evento), tipo materiale, agente
- Per ogni pezzo: descrizione, posizione, ultimo movimento, giorni dalla posizione attuale
- Evidenziazione: rosso per alert attivi

---

## 9. Schema Changes Required

Mappa le nuove entità dello spec alle modifiche DB necessarie rispetto allo schema esistente.

### 9.1 Nuove tabelle

**`magazzini`** — registro magazzini aziendali (record, non enum):
- `id` UUID PK
- `nome` text NOT NULL (es. "Monteviale", "Genova")
- `indirizzo` text
- `attivo` boolean DEFAULT true
- `created_at` timestamptz

**Evoluzione di `template_items`** — la tabella esistente `template_items` (child di `event_templates`) ha 3 tipi via enum `template_item_tipo`: `checklist`, `sub_activity`, `logistics`. Il Readiness Engine evolve **solo le righe di tipo `checklist`**. Le righe `sub_activity` e `logistics` restano invariate e saranno gestite in Phase 4 (People & Logistics).

Nuove colonne su `template_items` (per righe di tipo `checklist`):
- ADD `categoria` enum `activity_categoria` — classificazione dell'attività
- REPLACE `assegnazione_ruolo_operativo` (text) → `permesso_responsabile` (enum `permission_type`). Non è un semplice rename: è un cambio di tipo. Sequenza migrazione: (1) aggiungere nuovi valori enum `gestione_marketing` e `gestione_organizzazione` a `permission_type` (migrazione separata), (2) ADD colonna `permesso_responsabile`, (3) UPDATE con mapping da vecchi valori text (vedi 9.3), (4) DROP colonna `assegnazione_ruolo_operativo`
- ADD `dipende_da` FK → `template_items` (nullable, self-reference). L'admin UI deve validare l'assenza di dipendenze circolari.
- Il campo `obbligatorio` resta con il nome esistente (il rename è cosmetico e non vale il rischio di migrazione)
- ADD `tipo_verifica` enum `verification_type` (manuale / automatica), default `manuale`
- ADD `verifica_automatica` text (nullable, nome della funzione di verifica)
- Il campo `giorni_prima_evento` esistente corrisponde a `deadline_giorni` dello spec (valori negativi = prima dell'evento, positivi = dopo)
- Il campo `ordine` esistente resta invariato

La tabella `event_templates` resta invariata (chiave: `tipo_evento` + `modalita`).

**`event_activities`** — istanze attività per singolo evento. **Sostituisce `event_tasks`** (migration 007): la tabella `event_tasks` viene eliminata (DROP) e rimpiazzata da `event_activities` con schema arricchito. `event_tasks` non è referenziata dal frontend (il tab checklist è un placeholder) quindi non c'è codice da migrare, solo la tabella DB.

Colonne:
- `id` UUID PK
- `event_id` FK → events
- `template_item_id` FK → `template_items` (nullable — null se attività custom aggiunta manualmente)
- `descrizione` text NOT NULL
- `categoria` enum `activity_categoria`
- `permesso_responsabile` enum `permission_type`
- `stato` enum `activity_stato` (da_fare / in_corso / completata / disattivata). **Nota:** "in ritardo" e "bloccata" sono **calcolati** a query time (in ritardo = `da_fare` o `in_corso` con deadline < now; bloccata = dipendenza non completata), non memorizzati.
- `deadline` date (calcolata da template: `data_inizio_evento + giorni_prima_evento`)
- `dipende_da` FK → `event_activities` (nullable). Protezione cicli: le query che calcolano lo stato "bloccata" usano un CTE ricorsivo con depth limit (max 10 livelli) e `CYCLE` detection per evitare loop infiniti.
- `obbligatoria` boolean (copiata da template, sovrascrivibile per evento)
- `tipo_verifica` enum `verification_type`
- `verifica_automatica` text
- `assegnato_a` FK → users (nullable — persona specifica che ha preso in carico)
- `completata_il` timestamptz
- `completata_da` FK → users
- `note` text

**Indici consigliati:**
- `(event_id)` — join con eventi
- `(assegnato_a) WHERE stato IN ('da_fare', 'in_corso')` — dashboard "le mie attività"
- `(deadline) WHERE stato IN ('da_fare', 'in_corso')` — ordinamento per urgenza cross-evento
- `(permesso_responsabile) WHERE stato IN ('da_fare', 'in_corso')` — filtro per ruolo dashboard

### 9.2 Modifiche a tabelle esistenti

**`events`:**
- ADD `indirizzo_spedizione` text (nullable) — indirizzo di spedizione separato da sede evento

**`materials`:**
- MODIFY `posizione_attuale` — aggiornare enum `material_posizione`: rinominare `spedito` → `in_transito`, `evento` → `presso_evento`, `agente` → `magazzino_agente`, aggiungere `in_magazzino`. Migrare i dati esistenti.
- ADD `magazzino_id` FK → `magazzini` (nullable)
- ADD `presso_utente_id` FK → `users` (nullable)

**`evento_stato` enum:**
- ADD VALUE `rifiutato` (in migrazione separata, prerequisito per gate avanzamento)
- ADD CHECK constraint: `stato != 'rifiutato' OR motivo_cancellazione IS NOT NULL` (analogo al vincolo esistente per `cancellato`)

**`movement_tipo` enum:**
- ADD VALUE `preparazione` — materiale preparato in magazzino, pronto per la spedizione
- ADD VALUE `consegna` — materiale arrivato a destinazione
- (in migrazione separata dagli enum values, come da pattern PostgreSQL)

**`event_materials`:**
- ADD VALUE `chiuso_in_custodia` all'enum `material_request_stato` — per materiale trattenuto dall'agente post-evento

**`event_tasks`:**
- DROP TABLE — sostituita da `event_activities` (vedi 9.1). Nessun dato da migrare (tabella non utilizzata dal frontend, solo seed data).

### 9.3 Nuovi enum e mapping permessi

**Nuovi enum:**
- `activity_categoria`: logistica / marketing / materiale / organizzazione / amministrazione
- `activity_stato`: da_fare / in_corso / completata / disattivata
- `verification_type`: manuale / automatica

**Nuovi valori `permission_type`** da aggiungere (in migrazione separata):
- `gestione_marketing` — per attività di categoria marketing (locandine, depliant, video)
- `gestione_organizzazione` — per attività organizzative (iscrizioni, logistica evento, segreteria)

**Mapping categoria → permesso (seed data):**

| Categoria | Permesso responsabile | Corrisponde al vecchio `assegnazione_ruolo_operativo` |
|-----------|----------------------|-------------------------------------------------------|
| logistica | `gestione_spedizioni` | `logistica_spedizioni` |
| logistica (ordini) | `gestione_magazzino` | `logistica_ordini` |
| marketing | `gestione_marketing` (nuovo) | `marketing` |
| organizzazione | `gestione_organizzazione` (nuovo) | `segreteria_org` |
| materiale | `gestione_magazzino` | — |
| amministrazione | `gestione_costi` | — |

Nota: il mapping non è 1:1 tra categoria e permesso. Un'attività di categoria `logistica` potrebbe avere `gestione_spedizioni` o `gestione_magazzino` come permesso responsabile, a seconda dell'attività specifica.

### 9.4 Stati spedizione (sezione 6.1)

Gli stati di spedizione della vista Logistica (da preparare / preparato / spedito / consegnato) sono **calcolati** da `material_movements`, non memorizzati come enum separato:

| Stato visualizzato | Condizione |
|--------------------|-----------|
| Da preparare | `event_materials.stato = 'approvato'` e nessun movimento di uscita registrato |
| Preparato | Esiste movimento tipo `preparazione` ma nessun movimento `uscita` |
| Spedito | Esiste movimento `uscita` ma nessun movimento `consegna` |
| Consegnato | Esiste movimento `consegna` |

Questo mantiene `material_movements` come unica fonte di verità per il tracking logistico.

### 9.5 RLS Policies

**`magazzini`:**
- SELECT: `USING (true)` — tutti possono leggere l'elenco magazzini
- INSERT/UPDATE/DELETE: `USING (has_permission('gestione_magazzino'))` — solo chi gestisce il magazzino

**`event_activities`:**
- SELECT: `USING (can_see_event(event_id))` — chi può vedere l'evento può vedere le attività
- INSERT: `USING (can_see_event(event_id))` — chiunque coinvolto può aggiungere attività custom
- UPDATE: `USING (assegnato_a = auth.uid() OR has_permission(permesso_responsabile))` — l'assegnato o chi ha il permesso corretto
- DELETE: `USING (has_permission('gestione_utenti'))` — solo admin

### 9.6 Trigger

**`sync_material_position`** — la funzione trigger esistente (migration 011) deve essere **completamente riscritta** nella stessa migrazione che rinomina l'enum `material_posizione`. Il nuovo CASE deve usare i valori aggiornati (`in_magazzino`, `in_transito`, `presso_evento`, `magazzino_agente`) e gestire i nuovi campi `magazzino_id` e `presso_utente_id`. Questa è un'operazione atomica: enum rename + trigger rewrite + data migration in un'unica migrazione per evitare stati inconsistenti.

**Auto-transizione `confermato` → `in_preparazione`:**
- Trigger su `event_activities` UPDATE di colonna `stato`
- Solo su UPDATE, non su INSERT (le attività vengono create come `da_fare`)
- La query di update usa `WHERE stato = 'confermato'` come guard per evitare race condition (se due utenti aggiornano attività simultaneamente, solo il primo trigger effettua la transizione)

**Istanziazione template:**
- Quando un evento passa a `confermato`, le attività vengono istanziate dal template corrispondente (in base a `tipo_evento` + `modalita`). Implementato come azione nel Zustand store `useActivities.js`, non come trigger DB — permette gestione errori e feedback UI durante la creazione.

---

## Appendice: Fix Immediati Identificati (DA IMPLEMENTARE)

Problemi UX scoperti nell'audit che richiedono fix indipendenti dal Readiness Engine:

- [ ] Home page (`/`) da placeholder a redirect intelligente
- [ ] Link `/profilo` morto nel BottomBar
- [ ] Filtro "I miei eventi" per commerciale
- [ ] Touch target 48px nel carrello catalogo
- [ ] Carrello mobile visibile (sticky/floating)
- [ ] Stato "rifiutato" separato da "cancellato"
- [ ] Budget nel wizard creazione evento
- [ ] Campi evento editabili post-creazione
- [ ] Tab overflow mobile in EventDetail
- [ ] Gadget section mancante in EventMaterialList
- [ ] AdminMateriali nome/codice confusione fix
- [ ] Soglia approvazione invisibile → messaggio esplicativo

# Event Readiness Engine — Design Spec (IN PROGRESS)

**Data:** 2026-03-19
**Stato:** Brainstorming in corso — sezioni 1-2 approvate, sezioni 3+ da definire
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
- **Magazzino principale**: Monteviale (Ivan coordina)
- **Magazzino secondario**: Genova (ha un suo operatore, ma coordinamento centralizzato)
- **Materiale presso persone**: agenti, commerciali, area manager portano materiale con sé
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
| `permesso_responsabile` | Permission | `gestione_spedizioni` |
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

| Transizione | Condizione |
|-------------|-----------|
| `confermato` → `in_preparazione` | Automatico: almeno 1 attività "in corso" |
| `in_preparazione` → `pronto` | Gate: TUTTE le attività obbligatorie attive completate. Bottone disabilitato con spiegazione se manca qualcosa |
| `pronto` → `in_corso` | Data evento è oggi (o manuale) |
| `in_corso` → `concluso` | Manuale + gate: tutti i materiali con rientro registrato |

---

## 5. Dashboard per Ruolo (DA DEFINIRE)

Ogni ruolo vede la propria home con priorità aggregate su tutti gli eventi. Dettagli da definire in prossima sessione.

Direzione iniziale:

| Ruolo (permesso) | Vede |
|-------------------|------|
| Commerciale (`richiedi_materiale`) | I miei eventi + attività assegnate a me + prossime deadline |
| Ufficio (`approva_materiale`, `gestione_*`) | Attività in ritardo, gate bloccati, richieste da approvare |
| Direzione (`approva_eventi`) | Eventi da approvare, esposizione budget, semafori eventi |
| Magazzino (`gestione_spedizioni`) | Materiale da preparare, spedizioni, rientri scaduti |

---

## 6. Logistica Cross-Evento (DA DEFINIRE)

Vista per Ivan con tutti gli eventi e il loro stato materiale. Dettagli da definire.

---

## 7. Inventario Attivo e Alert (DA DEFINIRE)

- Ogni pezzo ha posizione aggiornata + data ultimo movimento
- Alert se materiale fuori magazzino da X giorni senza evento associato
- Sollecito rientro periodico all'agente

---

## 8. Fix Immediati Identificati (DA IMPLEMENTARE)

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

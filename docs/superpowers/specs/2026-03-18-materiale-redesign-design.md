# Materiale UX Redesign — Design Spec

**Data:** 2026-03-18
**Stato:** Approvato da brainstorming
**Scope:** Permissions system, material list UX, visual catalog, venue directory, admin section, DB changes

---

## 1. Context & Problem Statement

Mikai Eventi gestisce 40-50 eventi/anno. Il flusso materiale attuale presenta problemi UX critici:

- Il **commerciale** non capisce facilmente cosa richiedere e non puo modificare le richieste dopo l'invio
- Il feedback sullo stato di approvazione e scarso (nessun motivo di rifiuto, nessuna nota)
- La vista magazzino e disconnessa dal flusso richieste
- I permessi sono hardcoded per ruolo, senza flessibilita per eccezioni

Questo redesign risolve tutti questi punti con un approccio a lista editabile, catalogo visuale e permessi granulari.

---

## 2. Granular Permission System

### 2.1 Principio

I ruoli (`commerciale`, `area_manager`, `direzione`, `ufficio`, `admin`) diventano **preset**. Alla creazione utente, i permessi tipici del ruolo vengono pre-assegnati, ma ogni permesso e individualmente assegnabile/rimovibile.

### 2.2 Permission Registry

| Permission | Descrizione | Preset tipici |
|---|---|---|
| `approva_eventi` | Approvare/rifiutare proposte evento | area_manager, direzione |
| `gestione_costi` | Gestire budget e costi evento | ufficio (Chiara), direzione |
| `compliance` | Accesso dati compliance MedTech | direzione, ufficio |
| `gestione_utenti` | CRUD utenti + assegnazione permessi | admin |
| `richiedi_materiale` | Creare/editare lista materiale evento | commerciale, area_manager |
| `approva_materiale` | Confermare/rifiutare righe lista materiale | ufficio (Ivan, Federica), direzione (Enrica) |
| `gestione_magazzino` | Visualizzare inventario, gestire posizioni, esemplari fisici | ufficio (Ivan) |
| `gestione_spedizioni` | Registrare movimenti (uscita/rientro), assegnare corrieri, tracking | ufficio (Ivan) |
| `gestione_gadget` | Visualizzare stock gadget, aggiornare stato richieste | ufficio (Federica, Nicola) |
| `gestione_sedi` | Editare rubrica sedi e corrieri | ufficio |
| `gestione_catalogo` | Admin: gestire brand, prodotti, distretti, materiali master, gadget master, zone, corrieri | admin, Nicola |

### 2.3 Visibility Rules

| Elemento UI | Visibile a | Interattivo con permesso |
|---|---|---|
| Tab "Materiale" in evento | Tutti i partecipanti evento | — |
| Pulsante "Aggiungi / Modifica lista" | `richiedi_materiale` | `richiedi_materiale` |
| Pulsanti "Conferma / Rifiuta riga" | `approva_materiale` | `approva_materiale` |
| Note ufficio (campo editabile) | `approva_materiale` OR `gestione_spedizioni` | `approva_materiale` OR `gestione_spedizioni` |
| Pagina /materiale (magazzino) | `gestione_magazzino` OR `gestione_spedizioni` | — |
| Movimenti in /materiale | `gestione_spedizioni` | `gestione_spedizioni` |
| Modifica dati materiale | `gestione_magazzino` | `gestione_magazzino` |
| Gadget: visualizzazione | Tutti | — |
| Gadget: aggiornamento stato | `gestione_gadget` | `gestione_gadget` |
| Sezione Amministrazione | `gestione_catalogo` | `gestione_catalogo` |
| Admin > Utenti & Permessi | `gestione_utenti` | `gestione_utenti` |

**Regola fondamentale:** gli elementi senza permesso sono **nascosti** (non disabilitati/grayed out). Non mostrare pulsanti che l'utente non puo usare.

---

## 3. Two-Level Material Model

### 3.1 Catalog Level (cosa vede il commerciale)

Il **prodotto/kit** rappresenta il "tipo" di materiale a catalogo:

- Nome (es. "Kit Spalla Zimmer")
- Brand
- Distretto anatomico (uno o piu)
- Tipo prodotto (demo kit, strumentario, montaggio, pezzo sfuso)
- Immagine
- Contenuto kit (lista pezzi con codice e quantita)

Il commerciale **non vede** informazioni di stock o disponibilita. Aggiunge articoli alla lista e specifica la quantita desiderata.

### 3.2 Inventory Level (cosa vede Ivan)

L'**esemplare (specimen)** rappresenta il pezzo fisico singolo:

- Codice inventario (es. "KSZ-001", "KSZ-002")
- Collegamento al prodotto catalogo (`product_id`)
- Posizione in magazzino
- Storico movimenti
- Stato/condizione

Quando Ivan approva una richiesta, vede "Richiesti 2, disponibili 5" e seleziona gli esemplari specifici da spedire.

---

## 4. Event Material List

### 4.1 Modello lista

Ogni evento ha una **singola lista editabile** (come un carrello). Sostituisce le richieste individuali.

Ogni riga della lista ha campi e ciclo di vita indipendenti:

| Campo | Tipo | Chi lo compila |
|---|---|---|
| `product_id` | FK a prodotto catalogo | Commerciale (selezione da catalogo) |
| `quantita` | Intero, default 1 | Commerciale |
| `note_commerciale` | Testo libero | Commerciale (es. "Il chirurgo lo richiede specificamente") |
| `stato` | Enum | Sistema / Ufficio |
| `note_ufficio` | Testo libero | Ufficio (es. "Spedito 15/3 con DHL") |
| `motivo_rifiuto` | Testo libero | Ufficio (obbligatorio su rifiuto) |

### 4.2 Row Statuses

| Stato DB | Colore | Label commerciale | Descrizione |
|---|---|---|---|
| `in_lista` | Gray | "In attesa di conferma" | Aggiunto dal commerciale, non ancora valutato |
| `confermato` | Green | "Confermato" | Approvato dall'ufficio, eventuale nota visibile |
| `rifiutato` | Red | "Non disponibile" | Rifiutato con motivo obbligatorio |

### 4.3 Editability Rules

- La lista e **editabile** (aggiunta righe, modifica quantita, rimozione righe `in_lista`) fino al giorno prima di `data_spedizione_prevista`
- `data_spedizione_prevista` e un nuovo campo su `events`, impostato dall'ufficio, sovrascrivibile
- Dopo il lock: vista read-only con banner fisso in alto:

```
[WarningIcon] Lista chiusa — materiale in preparazione
Sfondo: yellow-50, bordo yellow-200, testo yellow-800
```

- Righe gia `confermato` o `rifiutato` non sono modificabili dal commerciale (solo dall'ufficio)
- Il commerciale puo rimuovere solo righe `in_lista`

### 4.4 UX Flow — Commerciale

1. Apre tab "Materiale" nell'evento
2. Vede la lista attuale (vuota o con righe precedenti)
3. Clicca "Aggiungi materiale" → apre il catalogo visuale (sezione 5)
4. Seleziona prodotti → tornano nella lista con stato `in_lista`
5. Puo modificare quantita e note per righe `in_lista`
6. Lista si salva automaticamente (o con pulsante "Salva lista")
7. Vede feedback real-time quando l'ufficio conferma/rifiuta righe

### 4.5 UX Flow — Ufficio (Ivan/Federica)

1. Apre tab "Materiale" nell'evento (o vista aggregata da /materiale)
2. Vede tutte le righe con stato
3. Per ogni riga `in_lista`: pulsanti "Conferma" e "Rifiuta"
4. Conferma: stato → `confermato`, puo aggiungere nota ufficio
5. Rifiuto: dialog con campo `motivo_rifiuto` obbligatorio, stato → `rifiutato`
6. Puo scrivere `note_ufficio` su qualsiasi riga (info logistiche)

---

## 5. Visual Catalog

### 5.1 Struttura

Sostituisce il wizard a 3 step sequenziali con una **griglia filtrabile**. I filtri sono combinabili e non sequenziali.

### 5.2 Filter Bar

Barra orizzontale scrollabile con tre gruppi di filtri:

| Filtro | Formato | Comportamento |
|---|---|---|
| **Brand** | Logo clickabile (immagine, min 64x64px, rounded-lg, label sotto) | Multi-select, evidenzia selezionati |
| **Distretto anatomico** | Immagine anatomica generica (spalla, ginocchio, anca, mano...) con label | Multi-select |
| **Tipo prodotto** | Icona generica + label (demo kit, strumentario, montaggio, pezzo sfuso) | Multi-select |

- Nessun ordine obbligatorio: il commerciale puo cliccare "Zimmer" + "Spalla", o solo "Spalla", o niente per vedere tutto
- Chip attivi sopra la griglia con "x" per rimuovere
- "Cancella filtri" link visibile quando almeno un filtro attivo

### 5.3 Results Grid

- Layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Card per prodotto:
  - Immagine prodotto (o placeholder generico per tipo)
  - Nome prodotto
  - Brand (logo small + nome)
  - Distretto/i anatomico/i (badge)
  - Click card → **espande** mostrando il contenuto kit (lista pezzi con codice e quantita)
  - Pulsante "Aggiungi alla lista" (touch-friendly, min-h-[48px])
- Pezzi sfusi mostrati separatamente nella stessa griglia, anche aggiungibili
- SearchInput in cima per ricerca testuale su nome prodotto/brand

---

## 6. Venue Directory & Couriers

### 6.1 Venues (Sedi)

Rubrica centralizzata delle sedi evento, riusabile tra eventi.

| Campo | Tipo | Note |
|---|---|---|
| `nome` | Text | Es. "Ospedale San Raffaele - Sala Congressi" |
| `indirizzo` | Text | Via completa |
| `cap` | Text | CAP |
| `citta` | Text | |
| `provincia` | Text (2 char) | Es. "MI" |
| `zone_id` | FK | Derivata da provincia, configurabile |
| `courier_id` | FK, nullable | Corriere preferito (default da zona, sovrascrivibile) |
| `note_consegna` | Text | Es. "Porta Giovanni", "Solo mattina" |

**Autocomplete nell'event wizard:** quando il commerciale digita la sede, suggerisce sedi salvate. Le nuove sedi vengono salvate automaticamente nella rubrica dopo la creazione dell'evento.

### 6.2 Zones

| Campo | Tipo | Note |
|---|---|---|
| `nome` | Text | Es. "Nord Italia", "Sicilia" |

Mapping zone-province tramite tabella `zone_provinces` (zone_id + provincia).

### 6.3 Couriers (Corrieri)

| Campo | Tipo | Note |
|---|---|---|
| `nome` | Text | Es. "DHL", "SDA", "BRT" |
| `contatto` | Text | Telefono / email riferimento |

Mapping zone-corriere tramite tabella `zone_couriers` (zone_id + courier_id) per corriere default.

### 6.4 Flow nell'evento

1. Commerciale seleziona/crea sede nell'event wizard
2. Sistema deriva zona dalla provincia della sede
3. Sistema propone corriere default della zona
4. Ufficio puo sovrascrivere corriere e aggiungere note consegna specifiche per l'evento

---

## 7. Admin Section (Amministrazione)

### 7.1 Navigazione

Nuova voce sidebar visibile solo con permesso `gestione_catalogo`:

```
─────────────────────
Eventi
Calendario
Materiale
Gadget
─────────── separator
Amministrazione
  Brand
  Distretti anatomici
  Prodotti & Kit
  Materiali
  Gadget (master)
  Sedi & Corrieri
  Zone
  Utenti & Permessi    ← richiede gestione_utenti
```

Su mobile: "Amministrazione" appare come voce nel menu hamburger / drawer, non nella bottom bar (spazio limitato).

### 7.2 Pattern comune per ogni sub-page

Ogni sub-page segue lo stesso pattern CRUD:

1. **Lista:** tabella searchable con colonne sortabili
   - SearchInput in cima
   - Righe min-h-[48px]
   - Pulsante "Nuovo" in alto a destra (PageHeader action)
   - Click riga → apre form di editing
2. **Form:** dialog o pagina dedicata
   - Campi specifici per entita
   - Pulsanti "Salva" e "Annulla" (min-h-[48px])
   - Pulsante "Elimina" con ConfirmDialog (solo se nessun riferimento attivo)
3. **Feedback:** toast su successo/errore

### 7.3 Sub-pages Detail

| Sub-page | Campi principali | Note |
|---|---|---|
| **Brand** | Nome, logo (upload immagine), attivo/disattivo | Disattivare nasconde dal catalogo, non elimina |
| **Distretti anatomici** | Nome, immagine (upload), ordine visualizzazione | Ordine determina posizione nel filtro catalogo |
| **Prodotti & Kit** | Nome, brand (FK), distretti (multi-FK), tipo, immagine, contenuto kit | Contenuto kit: sub-tabella inline con pezzi (nome, codice, quantita) |
| **Materiali** | Codice inventario, prodotto (FK), posizione, note | Rappresenta esemplari fisici |
| **Gadget (master)** | Nome, stock attuale, soglia minima, fornitore | Soglia per alert visivo quando stock basso |
| **Sedi & Corrieri** | Tab sedi + tab corrieri nella stessa pagina | Sedi: tutti i campi sezione 6.1; Corrieri: nome, contatto |
| **Zone** | Nome zona, province associate (multi-select), corriere default | Province: checklist delle 107 province italiane |
| **Utenti & Permessi** | Dati utente + checklist permessi | Richiede `gestione_utenti`; role preset come suggerimento iniziale |

---

## 8. Database Changes

> **Migration number:** 016. Richiede che migration 015 (catalog tables) sia gia applicata.
> Ogni `ALTER TYPE ... ADD VALUE` deve essere in statement separato, **fuori da blocchi transazionali** (requisito PostgreSQL).

### 8.1 New Tables

#### `venues`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
nome            TEXT NOT NULL
indirizzo       TEXT
cap             TEXT
citta           TEXT
provincia       TEXT(2)
zone_id         UUID REFERENCES zones(id)
courier_id      UUID REFERENCES couriers(id)
note_consegna   TEXT
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

#### `zones`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
nome            TEXT NOT NULL
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

#### `zone_provinces`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE
provincia       TEXT(2) NOT NULL
UNIQUE(zone_id, provincia)
```

#### `couriers`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
nome            TEXT NOT NULL
contatto        TEXT
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

#### `zone_couriers`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE
courier_id      UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE
UNIQUE(zone_id, courier_id)
```

#### `kit_contents`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE
piece_name      TEXT NOT NULL
piece_code      TEXT
quantity        INTEGER NOT NULL DEFAULT 1
```

#### Trigger `updated_at`

Aggiungere trigger `trg_updated_at` su tutte le nuove tabelle che hanno `updated_at`: `venues`, `zones`, `couriers`. Steso pattern di migration `011_triggers.sql`.

### 8.2 Modified Tables

#### `events` — new columns
| Column | Type | Note |
|---|---|---|
| `data_spedizione_prevista` | DATE | Data limite per editing lista materiale |
| `venue_id` | UUID FK → venues | Nullable, sede evento |
| `courier_id` | UUID FK → couriers | Nullable, corriere assegnato (override da zona) |
| `note_consegna` | TEXT | Note consegna specifiche per evento |

#### `event_materials` — redesign
| Change | Detail |
|---|---|
| Replace `material_id` | → `product_id` UUID FK → products (catalog level) |
| Add `quantita` | INTEGER DEFAULT 1 |
| Rename stato values | `richiesto` → `in_lista`, `approvato` → `confermato`, `rifiutato` resta |
| Add `note_commerciale` | TEXT |
| Add `note_ufficio` | TEXT |
| Add `motivo_rifiuto` | TEXT |
| Remove `data_inizio_utilizzo` | Non piu per-riga, viene dall'evento |
| Remove `data_fine_utilizzo` | Non piu per-riga, viene dall'evento |
| Remove `approvato_da` | Non mostrato al commerciale |
| Remove `data_approvazione` | Non mostrato al commerciale |

#### `user_permissions` — extend enum

**IMPORTANTE:** Ogni `ADD VALUE` deve essere uno statement separato, fuori da `BEGIN/COMMIT`. PostgreSQL non consente `ADD VALUE` dentro transazioni.

```sql
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'richiedi_materiale';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_magazzino';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_spedizioni';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_gadget';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_sedi';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_catalogo';
```

#### `event_materials` — data migration

Prima di modificare la struttura, migrare i dati esistenti:

```sql
-- 1. Aggiungere product_id (nullable inizialmente)
ALTER TABLE event_materials ADD COLUMN product_id UUID REFERENCES products(id);

-- 2. Popolare product_id dai materials esistenti
UPDATE event_materials em
SET product_id = m.product_id
FROM materials m
WHERE em.material_id = m.id;

-- 3. Aggiungere nuove colonne
ALTER TABLE event_materials ADD COLUMN quantita INTEGER DEFAULT 1;
ALTER TABLE event_materials ADD COLUMN note_commerciale TEXT;
ALTER TABLE event_materials ADD COLUMN note_ufficio TEXT;
ALTER TABLE event_materials ADD COLUMN motivo_rifiuto TEXT;

-- 4. Aggiungere constraint rifiuto
ALTER TABLE event_materials ADD CONSTRAINT rifiuto_motivo_required
  CHECK (stato != 'rifiutato' OR motivo_rifiuto IS NOT NULL);

-- 5. Ricreare enum stato (richiesto → in_lista, approvato → confermato)
-- Usare colonna text temporanea per la transizione
ALTER TABLE event_materials ADD COLUMN stato_new TEXT;
UPDATE event_materials SET stato_new = CASE
  WHEN stato = 'richiesto' THEN 'in_lista'
  WHEN stato = 'approvato' THEN 'confermato'
  ELSE stato::text
END;

-- 6. Drop vecchio indice conflict (usa colonne rimosse)
DROP INDEX IF EXISTS idx_event_materials_conflict;

-- 7. Rimuovere colonne non piu necessarie
ALTER TABLE event_materials DROP COLUMN IF EXISTS data_inizio_utilizzo;
ALTER TABLE event_materials DROP COLUMN IF EXISTS data_fine_utilizzo;
ALTER TABLE event_materials DROP COLUMN IF EXISTS approvato_da;
ALTER TABLE event_materials DROP COLUMN IF EXISTS data_approvazione;
-- material_id resta per backward compatibility, ma product_id diventa il riferimento primario
```

#### `materials` — new column
| Column | Type | Note |
|---|---|---|
| `product_id` | UUID FK → products | Link esemplare fisico al prodotto catalogo |

#### `products` — new column
| Column | Type | Note |
|---|---|---|
| `immagine_url` | TEXT | URL immagine prodotto |

#### `brands` — new column
| Column | Type | Note |
|---|---|---|
| `logo_url` | TEXT | URL logo brand |

#### `body_sections` — new column
| Column | Type | Note |
|---|---|---|
| `immagine_url` | TEXT | URL immagine distretto anatomico |

### 8.3 RLS Policies

Tutte le nuove tabelle devono avere RLS abilitato.

**IMPORTANTE:** Prima di creare le nuove policy, eliminare quelle in conflitto:

```sql
-- Drop policy esistenti che usano get_user_role() e vanno sostituite con permission-based
DROP POLICY IF EXISTS "event_materials_write" ON event_materials;
DROP POLICY IF EXISTS "brands_write" ON brands;
DROP POLICY IF EXISTS "body_sections_write" ON body_sections;
DROP POLICY IF EXISTS "products_write" ON products;
DROP POLICY IF EXISTS "product_body_sections_write" ON product_body_sections;
DROP POLICY IF EXISTS "perms_write" ON user_permissions;
DROP POLICY IF EXISTS "users_write" ON users;
```

**Nuove policy (tabelle esistenti aggiornate):**

| Table | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `event_materials` | Tutti autenticati | `richiedi_materiale` (insert/update proprie righe), `approva_materiale` (update stato/note) |
| `brands` | Tutti autenticati | `gestione_catalogo` |
| `body_sections` | Tutti autenticati | `gestione_catalogo` |
| `products` | Tutti autenticati | `gestione_catalogo` |
| `product_body_sections` | Tutti autenticati | `gestione_catalogo` |
| `user_permissions` | Tutti autenticati | `gestione_utenti` (non piu solo admin) |
| `users` (write) | Tutti autenticati | `gestione_utenti` (non piu solo admin) |

**Nuove policy (tabelle nuove):**

| Table | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `venues` | Tutti autenticati | `gestione_sedi` OR `gestione_catalogo` |
| `zones` | Tutti autenticati | `gestione_catalogo` |
| `zone_provinces` | Tutti autenticati | `gestione_catalogo` |
| `couriers` | Tutti autenticati | `gestione_catalogo` |
| `zone_couriers` | Tutti autenticati | `gestione_catalogo` |
| `kit_contents` | Tutti autenticati | `gestione_catalogo` |

---

## 9. Frontend Routes

| Route | Page | Permission |
|---|---|---|
| `/eventi/:id` (tab Materiale) | Event material list | Visibile a tutti, editing con `richiedi_materiale` |
| `/materiale` | Warehouse overview | `gestione_magazzino` OR `gestione_spedizioni` |
| `/materiale/:id` | Specimen detail | `gestione_magazzino` OR `gestione_spedizioni` |
| `/gadget` | Gadget overview | Tutti |
| `/admin` | Admin dashboard/redirect | `gestione_catalogo` |
| `/admin/brand` | Brand CRUD | `gestione_catalogo` |
| `/admin/distretti` | Body sections CRUD | `gestione_catalogo` |
| `/admin/prodotti` | Products & kits CRUD | `gestione_catalogo` |
| `/admin/materiali` | Specimens CRUD | `gestione_catalogo` |
| `/admin/gadget` | Gadget master CRUD | `gestione_catalogo` |
| `/admin/sedi` | Venues & couriers CRUD | `gestione_catalogo` |
| `/admin/zone` | Zones CRUD | `gestione_catalogo` |
| `/admin/utenti` | Users & permissions | `gestione_utenti` |

---

## 10. New Zustand Stores

| Store | File | Responsabilita |
|---|---|---|
| `useVenuesStore` | `src/hooks/useVenues.js` | CRUD venues, autocomplete search |
| `useZonesStore` | `src/hooks/useZones.js` | CRUD zones, province mapping, courier defaults |
| `useCouriersStore` | `src/hooks/useCouriers.js` | CRUD couriers |
| `useAdminStore` | `src/hooks/useAdmin.js` | Admin-level CRUD for brands, body sections, products, product_body_sections, kit contents, specimens (materials) |

Stores esistenti da modificare:

| Store | Modifica |
|---|---|
| `useAuthStore` | Caricare permessi utente, esporre `hasPermission(name)` helper |
| `useEventsStore` | Supportare nuovi campi evento (venue_id, courier_id, data_spedizione_prevista) |
| `useMaterialsStore` | Redesign per lista materiale evento (product-based, nuovi stati) |

---

## 11. Component Architecture

### 11.1 New Components — Material List

| Component | Path | Descrizione |
|---|---|---|
| `EventMaterialList` | `src/components/eventi/EventMaterialList.jsx` | Container lista materiale in tab evento |
| `MaterialListRow` | `src/components/eventi/MaterialListRow.jsx` | Singola riga lista con stato, azioni |
| `MaterialListLockBanner` | `src/components/eventi/MaterialListLockBanner.jsx` | Banner giallo "lista chiusa" |
| `MaterialApprovalActions` | `src/components/eventi/MaterialApprovalActions.jsx` | Pulsanti conferma/rifiuta per ufficio |
| `RejectMaterialDialog` | `src/components/eventi/RejectMaterialDialog.jsx` | Dialog rifiuto con motivo obbligatorio |

### 11.2 New Components — Catalog

| Component | Path | Descrizione |
|---|---|---|
| `CatalogBrowser` | `src/components/materiale/CatalogBrowser.jsx` | Container catalogo con filtri + griglia. **Montato come pannello inline** dentro `EventMaterialList` (espande sotto il pulsante "Aggiungi materiale", stessa UX di oggi con MaterialCatalogPicker). Non e un modal ne una route separata. |
| `CatalogFilterBar` | `src/components/materiale/CatalogFilterBar.jsx` | Barra filtri orizzontale scrollabile |
| `CatalogProductCard` | `src/components/materiale/CatalogProductCard.jsx` | Card prodotto con expand kit contents |
| `KitContentsList` | `src/components/materiale/KitContentsList.jsx` | Lista pezzi kit (collapsible) |
| `ActiveFiltersChips` | `src/components/materiale/ActiveFiltersChips.jsx` | Chip filtri attivi con rimuovi |

### 11.3 New Components — Admin

| Component | Path | Descrizione |
|---|---|---|
| `AdminLayout` | `src/components/layout/AdminLayout.jsx` | Layout con sub-navigation admin |
| `AdminTable` | `src/components/ui/AdminTable.jsx` | Tabella CRUD riusabile (search, sort, pagination) |
| `AdminForm` | `src/components/ui/AdminForm.jsx` | Form CRUD riusabile (dialog o page) |

Ogni sub-page admin (`BrandList`, `DistrettiList`, `ProdottiList`, etc.) compone `AdminTable` + `AdminForm`.

### 11.4 New Components — Venues

| Component | Path | Descrizione |
|---|---|---|
| `VenueAutocomplete` | `src/components/eventi/VenueAutocomplete.jsx` | Autocomplete sede nel wizard evento |

---

## 12. Icon Additions

New entries for `src/lib/icons.js`:

| Category | Name | Lucide Icon | Usage |
|---|---|---|---|
| `ADMIN_ICONS` (new) | `brand` | `Tag` | Admin brand section |
| `ADMIN_ICONS` | `distretti` | `Bone` | Admin body sections |
| `ADMIN_ICONS` | `prodotti` | `Package` | Admin products |
| `ADMIN_ICONS` | `materiali` | `Boxes` | Admin specimens |
| `ADMIN_ICONS` | `gadget` | `Gift` | Admin gadget master |
| `ADMIN_ICONS` | `sedi` | `MapPin` | Admin venues |
| `ADMIN_ICONS` | `zone` | `Map` | Admin zones |
| `ADMIN_ICONS` | `utenti` | `Users` | Admin users |
| `ADMIN_ICONS` | `corrieri` | `Truck` | Admin couriers |
| `MATERIALE_ICONS` | `inLista` | `Clock` | Row status: in attesa |
| `MATERIALE_ICONS` | `confermato` | `CheckCircle` | Row status: confermato |
| `MATERIALE_ICONS` | `rifiutato` | `XCircle` | Row status: rifiutato |
| `MATERIALE_ICONS` | `listLocked` | `Lock` | Lista chiusa banner |
| `ACTION_ICONS` | `filter` | `Filter` | Catalog filter bar |
| `ACTION_ICONS` | `clearFilter` | `FilterX` | Clear filters |
| `NAV_ICONS` | `admin` | `Settings` | Sidebar admin section |

---

## 13. Constants Additions

New entries for `src/lib/constants.js`:

```js
// Material list row statuses
export const STATO_MATERIALE_LISTA = {
  IN_LISTA: 'in_lista',
  CONFERMATO: 'confermato',
  RIFIUTATO: 'rifiutato',
}

export const STATO_MATERIALE_LISTA_LABELS = {
  in_lista: 'In attesa di conferma',
  confermato: 'Confermato',
  rifiutato: 'Non disponibile',
}

export const STATO_MATERIALE_LISTA_COLORS = {
  in_lista: 'gray',
  confermato: 'green',
  rifiutato: 'red',
}

// Product types
export const TIPO_PRODOTTO = {
  DEMO_KIT: 'demo_kit',
  STRUMENTARIO: 'strumentario',
  MONTAGGIO: 'montaggio',
  PEZZO_SFUSO: 'pezzo_sfuso',
}

export const TIPO_PRODOTTO_LABELS = {
  demo_kit: 'Demo Kit',
  strumentario: 'Strumentario',
  montaggio: 'Montaggio',
  pezzo_sfuso: 'Pezzo sfuso',
}

// Permissions
export const PERMISSIONS = {
  APPROVA_EVENTI: 'approva_eventi',
  GESTIONE_COSTI: 'gestione_costi',
  COMPLIANCE: 'compliance',
  GESTIONE_UTENTI: 'gestione_utenti',
  RICHIEDI_MATERIALE: 'richiedi_materiale',
  APPROVA_MATERIALE: 'approva_materiale',
  GESTIONE_MAGAZZINO: 'gestione_magazzino',
  GESTIONE_SPEDIZIONI: 'gestione_spedizioni',
  GESTIONE_GADGET: 'gestione_gadget',
  GESTIONE_SEDI: 'gestione_sedi',
  GESTIONE_CATALOGO: 'gestione_catalogo',
}

export const PERMISSION_LABELS = {
  approva_eventi: 'Approvazione eventi',
  gestione_costi: 'Gestione costi',
  compliance: 'Compliance MedTech',
  gestione_utenti: 'Gestione utenti',
  richiedi_materiale: 'Richiesta materiale',
  approva_materiale: 'Approvazione materiale',
  gestione_magazzino: 'Gestione magazzino',
  gestione_spedizioni: 'Gestione spedizioni',
  gestione_gadget: 'Gestione gadget',
  gestione_sedi: 'Gestione sedi',
  gestione_catalogo: 'Gestione catalogo',
}

// Role presets (default permissions assigned at user creation)
export const ROLE_PERMISSION_PRESETS = {
  commerciale: ['richiedi_materiale'],
  area_manager: ['richiedi_materiale', 'approva_eventi'],
  direzione: ['approva_eventi', 'approva_materiale', 'gestione_costi', 'compliance'],
  ufficio: ['approva_materiale', 'gestione_magazzino', 'gestione_spedizioni', 'gestione_gadget', 'gestione_sedi'],
  admin: ['gestione_utenti', 'gestione_catalogo', 'approva_eventi', 'gestione_costi', 'compliance'],
}
```

---

## 14. UI/UX Rules (Supplement to CLAUDE.md)

Tutte le regole esistenti in CLAUDE.md restano valide. Regole aggiuntive per questo redesign:

| Regola | Implementazione |
|---|---|
| Immagini filtri catalogo | min 64x64px, `rounded-lg`, label sotto l'immagine |
| Contenuto kit | Collapsible, parte collapsed. Click su card espande |
| Righe lista materiale (mobile) | Tap su riga espande dettagli + azioni. No swipe gestures (troppo nascosto per utenti non esperti) |
| Banner data lock | `bg-yellow-50 border border-yellow-200 text-yellow-800`, icona warning, sempre visibile sopra la lista |
| Elementi senza permesso | Nascosti completamente (`hidden`), mai `disabled` o `opacity-50` |
| Testo UI | Tutto in italiano, nessun gergo tecnico |
| Tabelle admin | Righe min-h-[48px], colonne sortabili, SearchInput in cima |
| Autocomplete sedi | Debounce 300ms, mostra max 5 risultati, "Crea nuova sede" come ultima opzione |

---

## 15. Out of Scope

Esplicitamente escluso da questo redesign:

- Integrazione API corrieri (DHL/SDA tracking) — futuro
- Upload foto per report danni materiale — futuro
- Push notification per rientri scaduti — futuro
- PWA offline mode — Phase 6
- Suggerimenti automatici per conflitti materiale — futuro
- Validazione quantita vs stock al momento della richiesta (il commerciale non vede lo stock)
- CI/CD pipeline — Phase 6
- Dashboard per ruolo — Phase 6

---

## 16. Implementation Order (Suggested)

Questa spec copre un redesign ampio. Ordine di implementazione suggerito per minimizzare rischio:

1. **DB migration** — Nuove tabelle + modifiche tabelle esistenti
2. **Permission system** — `useAuthStore.hasPermission()` + visibility logic
3. **Event material list** — Nuova UX lista con stati riga
4. **Visual catalog** — Filtri + griglia prodotti
5. **Admin section** — Layout + sub-pages CRUD (pattern ripetibile)
6. **Venue directory** — Tabelle sedi/zone/corrieri + autocomplete
7. **Integration** — Collegamento venue → evento → corriere automatico

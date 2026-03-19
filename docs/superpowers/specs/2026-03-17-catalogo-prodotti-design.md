# Catalogo Prodotti + Selezione Materiale E-commerce

## Obiettivo

Aggiungere un catalogo prodotti strutturato (azienda → sezione corpo → prodotto → kit demo) e riformulare la richiesta materiale per eventi come un'esperienza e-commerce a step: scegli azienda, scegli sezione corpo, scegli prodotto/kit, aggiungi al carrello, invia richiesta.

## Contesto

### Cosa esiste oggi

- Tabella `materials` con campi: nome, tipo (demo_kit, montaggio, strumentario, altro), codice_inventario, posizione_attuale, quantita_totale
- Tabella `event_materials` per richieste materiale per evento (con conflict detection su date)
- Tabella `material_movements` per tracking movimenti fisici
- Tabelle `gadgets` + `event_gadgets` per gadget consumabili
- Store Zustand `useMaterials` con CRUD, conflict check, movements
- Componenti: MaterialRequestForm (form singolo con dropdown materiale + date), EventMaterialsTab, MaterialeList, MaterialeDetail
- RLS policies e trigger position sync già funzionanti

### Cosa manca

- Nessun concetto di "prodotto" o "azienda" — i materiali sono una lista piatta
- Nessuna categorizzazione per sezione corpo
- La richiesta materiale è un form tecnico, non un'esperienza di browsing

### Aziende note

| Azienda | Tipo | Prodotti |
|---------|------|----------|
| Mikai | Produttore | Stylo (fissatore polso), FEP (fissatore esterno polivalente), VCA (viti piede piatto), BSS (viti piccoli segmenti) |
| Medartis | Distributore | Placche da polso, Viti a compressione |

---

## 1. Schema database

### 1.1 Nuove tabelle

**`brands`** — Aziende (produttori e distributori)
```sql
CREATE TYPE brand_tipo AS ENUM ('produttore', 'distributore');

CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo brand_tipo NOT NULL DEFAULT 'produttore',
  logo_url text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**`body_sections`** — Sezioni corpo (gestite da admin)
```sql
CREATE TABLE body_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordine integer DEFAULT 0,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**`products`** — Catalogo prodotti
```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id),
  nome text NOT NULL,
  descrizione text,
  codice text UNIQUE,
  foto_url text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**`product_body_sections`** — Relazione many-to-many prodotti↔sezioni corpo
```sql
CREATE TABLE product_body_sections (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  body_section_id uuid NOT NULL REFERENCES body_sections(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, body_section_id)
);
```

### 1.2 Modifica tabella esistente

**`materials`** — Aggiungere collegamento a prodotto
```sql
ALTER TABLE materials ADD COLUMN product_id uuid REFERENCES products(id);
CREATE INDEX idx_materials_product ON materials(product_id);
```

Il campo `product_id` è nullable per retrocompatibilità con materiali esistenti non ancora categorizzati. Il campo `tipo` (demo_kit, montaggio, ecc.) resta per compatibilità ma diventa secondario — la categorizzazione primaria avviene tramite brand → body_section → product.

**Materiali senza `product_id`:** nel catalog picker e-commerce vengono esclusi (il picker mostra solo materiali categorizzati). Nella pagina inventario (`/materiale`) restano visibili con filtro "Non categorizzato" disponibile.

### 1.3 Indici

```sql
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_body_sections_ordine ON body_sections(ordine);
CREATE INDEX idx_product_body_sections_section ON product_body_sections(body_section_id);
```

### 1.4 RLS policies

Le nuove tabelle sono dati strutturali (catalogo), non operativi. A differenza delle tabelle operative (materials, events) dove scrive anche ufficio/direzione, il catalogo è gestito solo da admin:
- **Lettura:** tutti gli utenti autenticati
- **Scrittura:** solo `admin` (scelta intenzionale — il catalogo è configurazione, non operatività quotidiana)

```sql
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_body_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brands_read" ON brands FOR SELECT USING (true);
CREATE POLICY "brands_write" ON brands FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "body_sections_read" ON body_sections FOR SELECT USING (true);
CREATE POLICY "body_sections_write" ON body_sections FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "products_read" ON products FOR SELECT USING (true);
CREATE POLICY "products_write" ON products FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "product_body_sections_read" ON product_body_sections FOR SELECT USING (true);
CREATE POLICY "product_body_sections_write" ON product_body_sections FOR ALL USING (get_user_role() = 'admin');
```

### 1.5 Trigger updated_at

Riusa la funzione `update_updated_at()` già definita in `011_triggers.sql`:

```sql
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 1.6 Seed data

```sql
-- Brands
INSERT INTO brands (id, nome, tipo) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Mikai', 'produttore'),
  ('b0000000-0000-0000-0000-000000000002', 'Medartis', 'distributore');

-- Body sections
INSERT INTO body_sections (id, nome, ordine) VALUES
  ('s0000000-0000-0000-0000-000000000001', 'Polso', 1),
  ('s0000000-0000-0000-0000-000000000002', 'Mano', 2),
  ('s0000000-0000-0000-0000-000000000003', 'Gomito', 3),
  ('s0000000-0000-0000-0000-000000000004', 'Spalla', 4),
  ('s0000000-0000-0000-0000-000000000005', 'Piede', 5),
  ('s0000000-0000-0000-0000-000000000006', 'Caviglia', 6),
  ('s0000000-0000-0000-0000-000000000007', 'Gamba', 7),
  ('s0000000-0000-0000-0000-000000000008', 'Ginocchio', 8),
  ('s0000000-0000-0000-0000-000000000009', 'Anca', 9),
  ('s0000000-0000-0000-0000-000000000010', 'Colonna', 10);

-- Products (Mikai)
INSERT INTO products (id, brand_id, nome, descrizione, codice) VALUES
  ('p0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Stylo', 'Fissatore esterno da polso', 'STYLO'),
  ('p0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'FEP', 'Fissatore esterno polivalente', 'FEP'),
  ('p0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'VCA', 'Viti piede piatto', 'VCA'),
  ('p0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'BSS', 'Viti per piccoli segmenti', 'BSS'),
  ('p0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'MiniStylo', 'Mini fissatore esterno da polso', 'MINISTYLO');

-- Products (Medartis)
INSERT INTO products (id, brand_id, nome, descrizione, codice) VALUES
  ('p0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Placche da polso', 'Placche per osteosintesi polso', 'MED-PLAC'),
  ('p0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'Viti a compressione', 'Viti a compressione Medartis', 'MED-VITI');

-- Product ↔ Body section links
INSERT INTO product_body_sections (product_id, body_section_id) VALUES
  ('p0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001'), -- Stylo → Polso
  ('p0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000002'), -- Stylo → Mano
  ('p0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001'), -- FEP → Polso
  ('p0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000003'), -- FEP → Gomito
  ('p0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000007'), -- FEP → Gamba
  ('p0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000005'), -- VCA → Piede
  ('p0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000002'), -- BSS → Mano
  ('p0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000005'), -- BSS → Piede
  ('p0000000-0000-0000-0000-000000000005', 's0000000-0000-0000-0000-000000000001'), -- Placche polso → Polso
  ('p0000000-0000-0000-0000-000000000006', 's0000000-0000-0000-0000-000000000001'), -- Viti compressione → Polso
  ('p0000000-0000-0000-0000-000000000007', 's0000000-0000-0000-0000-000000000001'), -- MiniStylo → Polso
  ('p0000000-0000-0000-0000-000000000007', 's0000000-0000-0000-0000-000000000002'); -- MiniStylo → Mano

-- Link existing materials to products (Kit Stylo → Stylo)
UPDATE materials SET product_id = 'p0000000-0000-0000-0000-000000000001'
  WHERE codice_inventario LIKE 'KIT-STYLO-%';
UPDATE materials SET product_id = 'p0000000-0000-0000-0000-000000000007'
  WHERE codice_inventario LIKE 'KIT-MINI-%';
```

---

## 2. UX — Selezione materiale a step

### 2.1 Flusso

Il form `MaterialRequestForm` attuale (dropdown singolo) viene sostituito da un selettore a 3 step + carrello.

**Step 1 — Scegli azienda**
- Cards grandi cliccabili (min-h 72px, min-w 48px touch target) con nome azienda e tipo (produttore/distributore)
- Se c'è una sola azienda attiva → skip automatico

**Step 2 — Scegli sezione corpo**
- Cards grandi cliccabili (min-h 72px) con nome sezione corpo
- Mostra SOLO le sezioni che hanno prodotti per il brand selezionato
- Se c'è una sola sezione → skip automatico
- Bottone "← Indietro" per tornare a Step 1

**Step 3 — Scegli materiale**
- Lista prodotti filtrati per brand + sezione
- Sotto ogni prodotto: lista kit demo disponibili con semaforo posizione
- Bottone "+ Aggiungi" per ogni kit → va nel carrello
- Kit già nel carrello → mostra "Nel carrello ✓"
- Bottone "← Indietro" per tornare a Step 2

**Carrello (visibile in Step 3)**
- Lista materiali selezionati con bottone rimuovi
- Date utilizzo (inizio/fine) — condivise per tutti i materiali del carrello
- Conflict check in tempo reale per ogni materiale nel carrello
- Se conflitti → alert con dettagli, materiale evidenziato in rosso
- Bottone "Invia richiesta" → crea N record `event_materials`, uno per kit

### 2.2 Wireframe Step 1

```
┌─────────────────────────────────────────┐
│  Richiedi materiale                     │
│                                         │
│  Scegli l'azienda:                      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🏭 Mikai                       │    │
│  │  Produttore                     │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  🤝 Medartis                    │    │
│  │  Distributore                   │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 2.3 Wireframe Step 2

```
┌─────────────────────────────────────────┐
│  ← Indietro                             │
│                                         │
│  Mikai — Scegli la sezione:             │
│                                         │
│  ┌──────────┐  ┌──────────┐             │
│  │  ✋ Mano  │  │  🦶 Piede │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │  🤚 Polso │  │  💪 Gomito│             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐                           │
│  │  🦵 Gamba │                           │
│  └──────────┘                           │
└─────────────────────────────────────────┘
```

### 2.4 Wireframe Step 3

```
┌─────────────────────────────────────────┐
│  ← Indietro                             │
│                                         │
│  Mikai · Polso                          │
│                                         │
│  ┌─ Stylo — Fissatore da polso ─────┐  │
│  │  Kit Stylo #1  🟢 Disp.    [+]   │  │
│  │  Kit Stylo #2  🟡 Evento   [+]   │  │
│  │  Kit Stylo #3  🟢 Disp.    [+]   │  │
│  └───────────────────────────────────┘  │
│  ┌─ FEP — Fissatore polivalente ────┐  │
│  │  Nessun kit disponibile           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ─────────────────────────────────────  │
│  🛒 Carrello (2 articoli)               │
│  ├ Kit Stylo #1  ×1           [🗑]     │
│  ├ Kit Mini #1   ×1           [🗑]     │
│  │                                      │
│  │  Date utilizzo:                      │
│  │  Da: [17/03/2026]  A: [18/03/2026]  │
│  │                                      │
│  │  ⚠️ Kit Stylo #2 già prenotato      │
│  │  per Congresso SIOT (12-15 ott)      │
│  └──────────────────────────────────────│
│  [ Invia richiesta (2 materiali) ]      │
└─────────────────────────────────────────┘
```

### 2.5 Comportamenti

| Scenario | Comportamento |
|----------|--------------|
| Brand con 1 sola sezione | Skip step 2, vai diretto a step 3 |
| Sezione con 1 solo prodotto | Mostra direttamente i kit, nessuno skip (l'utente deve vedere cosa sceglie) |
| Kit già nel carrello | Bottone diventa "Nel carrello ✓" (disabilitato, colore verde) |
| Conflitto date | ConflictAlert sotto il carrello, bottone invio disabilitato |
| Carrello vuoto | Bottone invio disabilitato, testo "Aggiungi almeno un materiale" |
| Submit | Crea N record event_materials (uno per kit), riusa date condivise |
| Dopo submit | Toast "Materiale richiesto!", chiudi form, ricarica lista |

---

## 3. Pagina inventario aggiornata

### 3.1 MaterialeList (/materiale)

Aggiungere filtri per brand e sezione corpo alla pagina inventario esistente. I materiali mostrano anche il prodotto e il brand di appartenenza.

**Filtri aggiuntivi:**
- Brand (dropdown)
- Sezione corpo (dropdown)

**MaterialCard aggiornato:**
- Mostra: nome materiale, codice inventario, **prodotto** (es: "Stylo"), **brand** (es: "Mikai"), posizione attuale

### 3.2 MaterialeDetail (/materiale/:id)

Aggiungere sezione informazioni prodotto:
- Brand
- Prodotto
- Sezioni corpo associate
- (Tutto il resto resta invariato: storico movimenti, registrazione uscita/rientro)

---

## 4. Impatto su componenti esistenti

### 4.1 Componenti da SOSTITUIRE

| Componente | Azione |
|-----------|--------|
| `MaterialRequestForm.jsx` | Sostituire con `MaterialCatalogPicker.jsx` (selettore a 3 step + carrello) |

### 4.2 Componenti da MODIFICARE

| Componente | Modifica |
|-----------|----------|
| `MaterialCard.jsx` | Aggiungere brand e prodotto nella card |
| `MaterialFilters.jsx` | Aggiungere filtri brand e sezione corpo |
| `MaterialeList.jsx` | Usare nuovi filtri |
| `MaterialeDetail.jsx` | Mostrare info prodotto e brand |
| `useMaterials.js` | Aggiungere fetch con join prodotto/brand, fetchBrands, fetchBodySections, fetchProductsByBrandAndSection |
| `constants.js` | Aggiungere `TIPO_BRAND = { produttore: 'Produttore', distributore: 'Distributore' }` |

### 4.3 Componenti INVARIATI (logica interna)

| Componente | Perché |
|-----------|--------|
| `EventMaterialsTab.jsx` | Import cambia da `MaterialRequestForm` a `MaterialCatalogPicker` (1 riga import + 1 riga JSX), logica interna invariata |
| `MaterialMovementForm.jsx` | Invariato — i movimenti non dipendono dal catalogo |
| `MovementHistory.jsx` | Invariato |
| `ConflictAlert.jsx` | Invariato — usato dal nuovo picker |
| `GadgetCard.jsx` | Invariato |
| `GadgetRequestForm.jsx` | Invariato |

### 4.4 Nuovi componenti

| Componente | Responsabilità |
|-----------|---------------|
| `MaterialCatalogPicker.jsx` | Componente principale: 3 step + carrello + submit |
| `CatalogStepBrand.jsx` | Step 1: selezione azienda |
| `CatalogStepBodySection.jsx` | Step 2: selezione sezione corpo |
| `CatalogStepProducts.jsx` | Step 3: lista prodotti + kit + bottone aggiungi |
| `MaterialCart.jsx` | Carrello con date, conflict check, submit |

---

## 5. Cosa NON cambia

- Tabelle `event_materials`, `material_movements`, `gadgets`, `event_gadgets` — schema identico
- RLS policies esistenti per materials, event_materials, movements, gadgets
- Trigger `sync_material_position` — invariato
- Conflict detection logic — invariata (stesse query su event_materials)
- Approval workflow — invariato (richiesto → approvato/rifiutato)
- Movement tracking — invariato (uscita/rientro/trasferimento)
- Gadget flow — invariato

---

## 6. Migration plan

1. Creare tabelle `brands`, `body_sections`, `products`, `product_body_sections`
2. Aggiungere colonna `product_id` a `materials`
3. Applicare RLS policies
4. Inserire seed data (brands, sezioni, prodotti, link)
5. Collegare materiali esistenti ai prodotti

Tutto in una singola migration (`015_catalog.sql`). Non distruttiva — aggiunge senza modificare lo schema esistente.

La migration include in ordine:
1. Enum `brand_tipo`
2. Tabelle `brands`, `body_sections`, `products`, `product_body_sections`
3. `ALTER TABLE materials ADD COLUMN product_id`
4. Indici
5. RLS policies (enable + read/write)
6. Trigger `updated_at` per `brands` e `products`
7. Seed data (brands, sezioni, prodotti, link, update materiali esistenti)

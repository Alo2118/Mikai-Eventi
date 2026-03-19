# Conferma Parziale + Unificazione Gadget — Design Spec

**Data:** 2026-03-19
**Stato:** Approvato
**Scope:** Aggiungere conferma parziale alle richieste materiale e unificare i gadget nel catalogo prodotti

---

## 1. Contesto

### Conferma parziale
Oggi l'approvazione materiale e tutto-o-niente: l'ufficio puo solo confermare o rifiutare l'intera quantita richiesta. Non c'e modo di approvare 2 su 3 FEP richiesti. Serve un campo `quantita_approvata` che permetta riduzione.

### Gadget separati
I gadget (penne, block notes, materiale promozionale) vivono in tabelle separate (`gadgets`, `event_gadgets`) con un flusso dedicato. Questo crea duplicazione di UI e logica. I gadget hanno brand, richiedono approvazione, sono consumabili (no rientro) e serve monitorare le giacenze. Devono essere unificati nel catalogo prodotti.

### Prerequisiti
Le colonne `material_id`, `data_inizio_utilizzo`, `data_fine_utilizzo` su `event_materials` sono gia nullable (migration 018). La colonna `note_ufficio` esiste gia (migration 017). La colonna `richiesto_da` e NOT NULL — va resa nullable in migration B per i gadget migrati che non hanno questo dato.

---

## 2. Schema Changes

### 2.1 Migration A: Enum extension (separata)

```sql
ALTER TYPE product_tipo ADD VALUE 'gadget';
ALTER TYPE brand_tipo ADD VALUE 'fornitore';
```

Deve essere in una migration separata da policy/trigger che referenziano i nuovi valori (limitazione PostgreSQL).

### 2.2 Migration B: Nuove colonne + migrazione dati + funzione stock

#### Nuove colonne

```sql
-- Conferma parziale
ALTER TABLE event_materials ADD COLUMN quantita_approvata integer;

-- richiesto_da nullable (gadget migrati non hanno questo dato)
ALTER TABLE event_materials ALTER COLUMN richiesto_da DROP NOT NULL;

-- Stock consumabile (per gadget)
ALTER TABLE products ADD COLUMN quantita_disponibile integer CHECK (quantita_disponibile >= 0);
ALTER TABLE products ADD COLUMN soglia_minima integer DEFAULT 0;
```

- `event_materials.quantita_approvata`: NULL = non ancora approvato. Valorizzato all'approvazione (default = quantita richiesta, modificabile dall'ufficio).
- `products.quantita_disponibile`: NULL per demo kit (non consumabili). Valorizzato per gadget.
- `products.soglia_minima`: soglia sotto la quale mostrare alert scorte basse.

#### Funzione SECURITY DEFINER per decremento/ripristino stock atomico

```sql
CREATE OR REPLACE FUNCTION adjust_product_stock(p_product_id uuid, p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_qty integer;
BEGIN
  UPDATE products
  SET quantita_disponibile = quantita_disponibile + p_delta
  WHERE id = p_product_id AND quantita_disponibile IS NOT NULL
  RETURNING quantita_disponibile INTO new_qty;
  RETURN COALESCE(new_qty, -1);
END;
$$;

-- Accesso solo utenti autenticati
REVOKE ALL ON FUNCTION adjust_product_stock FROM public;
GRANT EXECUTE ON FUNCTION adjust_product_stock TO authenticated;
```

Questa funzione:
- Usa `SECURITY DEFINER` per bypassare RLS (utenti con `approva_materiale` possono decrementare stock senza avere `gestione_catalogo`)
- Usa aggiornamento atomico (`quantita_disponibile + p_delta`) per evitare race condition tra approvazioni concorrenti
- `p_delta` negativo per decrementare (approvazione), positivo per ripristinare (modifica/cancellazione)
- Ritorna la nuova quantita (per verificare soglia minima)
- Il CHECK `quantita_disponibile >= 0` sulla colonna impedisce stock negativo (il DB rifiutera l'update se il risultato e negativo)

#### Migrazione dati gadget → products

```sql
-- 1. Creare brand fallback per gadget senza fornitore
INSERT INTO brands (id, nome, tipo)
VALUES ('b0000000-0000-0000-0000-000000000099', 'Altro fornitore', 'fornitore');

-- 2. Creare brand "fornitore" per ogni fornitore_abituale distinto
INSERT INTO brands (nome, tipo)
SELECT DISTINCT fornitore_abituale, 'fornitore'
FROM gadgets
WHERE fornitore_abituale IS NOT NULL;

-- 3. Spostare gadgets → products
-- brand_id usa il fornitore mappato, o il fallback "Altro fornitore" per gadget senza fornitore
INSERT INTO products (id, brand_id, nome, descrizione, foto_url, tipo, quantita_disponibile, soglia_minima, attivo)
SELECT
  g.id,
  COALESCE(b.id, 'b0000000-0000-0000-0000-000000000099'),
  g.nome,
  g.descrizione,
  g.foto_url,
  'gadget',
  g.quantita_disponibile,
  g.soglia_minima,
  g.attivo
FROM gadgets g
LEFT JOIN brands b ON b.nome = g.fornitore_abituale AND b.tipo = 'fornitore';

-- 4. Spostare event_gadgets → event_materials
-- Nota: event_gadgets non ha richiesto_da ne created_at
-- richiesto_da resta NULL (reso nullable in questa migration)
-- created_at usa il default now()
INSERT INTO event_materials (event_id, product_id, quantita, stato, note_commerciale)
SELECT
  eg.event_id,
  eg.gadget_id,
  eg.quantita_richiesta,
  CASE eg.stato
    WHEN 'richiesto' THEN 'richiesto'
    WHEN 'pronto' THEN 'approvato'
    WHEN 'consegnato' THEN 'approvato'
    ELSE 'richiesto'
  END::material_request_stato,
  eg.note
FROM event_gadgets eg;

-- 5. Drop tabelle e enum gadget
DROP TABLE event_gadgets;
DROP TABLE gadgets;
DROP TYPE gadget_request_stato;
```

### 2.3 Decremento giacenza

Gestito tramite `adjust_product_stock` RPC:
- **All'approvazione** di una riga gadget: `adjust_product_stock(product_id, -quantita_approvata)`
- **Al ripristino** (riga torna `richiesto` o viene cancellata): `adjust_product_stock(product_id, +quantita_approvata)`

Tutta la logica stock vive nel Zustand store (`useMaterials.js`), mai nei componenti.

---

## 3. Flusso Conferma Parziale

### 3.1 UI conferma nella MaterialListRow

Attuale: bottone "Conferma" approva direttamente.

Nuovo comportamento:
- Click su "Conferma" → si espande un mini-form inline:
  - **Quantita approvata** — stepper (- N +), default = quantita richiesta, min 1, max = quantita richiesta
  - **Nota ufficio** — campo testo opzionale (colonna `note_ufficio` gia esistente)
  - **Bottone "Conferma"** — salva con `quantita_approvata` e `note_ufficio`
- Stato diventa `approvato`

Se l'ufficio vuole rifiutare completamente (0 approvati), deve usare il bottone "Rifiuta" dedicato (con motivo obbligatorio). Lo stepper ha min=1.

### 3.2 Badge nella lista

| Condizione | Badge |
|-----------|-------|
| `stato === 'approvato'` e `quantita_approvata === quantita` | Verde: "Approvato" |
| `stato === 'approvato'` e `quantita_approvata < quantita` | Giallo: "Approvato parziale" |
| `stato === 'richiesto'` | Giallo: "In attesa" |
| `stato === 'in_preparazione'` | Blu: "In preparazione" |
| `stato === 'rifiutato'` | Rosso: "Rifiutato" |

### 3.3 Visualizzazione quantita

- **Approvazione parziale:** "Richiesti: 3 → Approvati: 2"
- **Approvazione totale:** "Approvati: 3" (senza mostrare richiesti)
- **In attesa:** "Richiesti: 3"
- **In preparazione:** come approvato (mostra quantita approvata)

### 3.4 Conferma multipla (bulk)

Il bottone "Conferma tutto" approva tutte le righe pendenti con `quantita_approvata = quantita` (approvazione totale). Chi vuole ridurre deve confermare riga per riga.

### 3.5 Modifica post-approvazione

Se il commerciale modifica la quantita di una riga gia approvata:
- Stato torna a `richiesto`
- `quantita_approvata` torna a `NULL`
- Se il prodotto e un gadget, la giacenza viene ripristinata tramite `adjust_product_stock(product_id, +vecchia_quantita_approvata)`

### 3.6 Cancellazione riga approvata

Se una riga approvata viene cancellata (`removeMaterialListRow`):
- Se il prodotto e un gadget e `quantita_approvata` e valorizzato, ripristinare la giacenza tramite `adjust_product_stock(product_id, +quantita_approvata)` prima del DELETE.

---

## 4. Unificazione Gadget nel Catalogo

### 4.1 Gadget come prodotti

I gadget diventano `products` con `tipo='gadget'`:
- Appaiono nella griglia del catalogo come qualsiasi altro prodotto
- Filtrabili per tipo "Gadget" (nuovo valore in `TIPO_PRODOTTO`)
- Hanno brand (il fornitore diventa brand con `tipo='fornitore'`)
- Non hanno `body_sections` (relazione vuota — nessun record in `product_body_sections`)
- **Filtrando per body section**, i gadget vengono esclusi (corretto: non sono specifici per distretto). Sono visibili filtrando per tipo "Gadget" o senza filtri body section.

### 4.2 Card prodotto — indicazione stock

Per prodotti con `quantita_disponibile` non null (gadget):
- **Badge stock:** "Disp: 120" in grigio
- **Scorte basse:** "Scorte basse: 5" in rosso se ≤ `soglia_minima`
- Demo kit non mostrano nulla (quantita_disponibile e NULL)

### 4.3 Modale prodotto — disponibilita diversa

Per gadget (`tipo='gadget'`):
- Sezione "Disponibilita" mostra giacenza numerica (`quantita_disponibile`) e soglia minima
- NON mostra lista unita fisiche (i gadget non hanno righe in `materials`)

Per demo kit:
- Comportamento invariato (lista unita fisiche con posizione)

### 4.4 Decremento giacenza all'approvazione

Quando l'ufficio conferma una riga il cui prodotto e `tipo='gadget'`:
1. Chiama `adjust_product_stock(product_id, -quantita_approvata)` via RPC
2. Se il valore ritornato ≤ `soglia_minima` → alert visivo nella lista (badge rosso sulla card)

Ripristino: se la riga torna a `richiesto` o viene cancellata, chiama `adjust_product_stock(product_id, +quantita_approvata)`.

### 4.5 Nessun rientro per gadget

Le righe `event_materials` con prodotto `tipo='gadget'` non generano movimenti di rientro. Il bottone "Registra rientro" e nascosto per queste righe.

### 4.6 Eliminazione codice gadget dedicato

File da eliminare:
- `src/components/materiale/GadgetRequestForm.jsx`
- `src/components/materiale/GadgetCard.jsx`
- `src/hooks/useGadgets.js`
- `src/pages/admin/AdminGadget.jsx` — pagina admin CRUD gadget (non piu necessaria, i gadget sono prodotti)

Modifiche:
- `src/components/eventi/EventMaterialList.jsx` — rimuovere sezione gadget dedicata e import `useGadgets`
- `src/hooks/useAdmin.js` — rimuovere `fetchGadgetsMaster`, `createGadgetMaster`, `updateGadgetMaster`, `deleteGadgetMaster` (query su tabella `gadgets` che non esiste piu). La gestione gadget passa dalla pagina admin prodotti con filtro `tipo='gadget'`.
- `src/App.jsx` — rimuovere route `/admin/gadget` e import `AdminGadget`
- `src/components/layout/Sidebar.jsx` — rimuovere nav item "Gadget" che punta a `/admin/gadget`
- `src/lib/constants.js` — aggiungere `gadget: 'Gadget'` a `TIPO_PRODOTTO`, aggiungere `fornitore: 'Fornitore'` a `TIPO_BRAND`, rimuovere `STATO_GADGET_RICHIESTA`
- `src/lib/icons.js` — eventualmente rimuovere icone gadget-specific non piu usate

---

## 5. Store Changes

### 5.1 Modifica `confirmMaterialRow`

```js
confirmMaterialRow: async (id, quantitaApprovata, noteUfficio) => {
  const { data, error } = await supabase
    .from('event_materials')
    .update({
      stato: 'approvato',
      quantita_approvata: quantitaApprovata,
      note_ufficio: noteUfficio || null,
    })
    .eq('id', id)
    .select('*, product:products(id, tipo, quantita_disponibile)')
    .single()

  // Decremento atomico giacenza per gadget
  if (!error && data?.product?.tipo === 'gadget' && data.product.quantita_disponibile != null) {
    await supabase.rpc('adjust_product_stock', {
      p_product_id: data.product_id,
      p_delta: -quantitaApprovata,
    })
  }

  return { data, error: error?.message || null }
}
```

### 5.2 Nuova azione `restoreGadgetStock`

```js
restoreGadgetStock: async (row) => {
  if (row.stato === 'approvato' && row.quantita_approvata && row.product?.tipo === 'gadget') {
    await supabase.rpc('adjust_product_stock', {
      p_product_id: row.product_id,
      p_delta: row.quantita_approvata,
    })
  }
}
```

Chiamata da:
- `handleUpdate` in `EventMaterialList` quando una riga approvata torna a `richiesto`
- `handleRemove` in `EventMaterialList` quando una riga approvata viene cancellata

### 5.3 Aggiornare `fetchEventMaterialList`

Il SELECT deve includere il join prodotto per avere `tipo` e `quantita_disponibile`:
```js
.select('*, product:products(id, nome, codice, tipo, quantita_disponibile, soglia_minima, brand:brands(id, nome))')
```

### 5.4 Eliminazione useGadgets.js

Il file `src/hooks/useGadgets.js` viene eliminato. Tutte le azioni gadget sono ora gestite da `useMaterials.js`.

---

## 6. Riepilogo File

### Nuovi
- `supabase/migrations/TIMESTAMP_a_add_gadget_enum.sql` — enum extension
- `supabase/migrations/TIMESTAMP_b_conferma_parziale_gadget_unificati.sql` — colonne + funzione stock + migrazione dati

### Modificati
- `src/hooks/useMaterials.js` — `confirmMaterialRow` con quantita_approvata + stock RPC, nuova `restoreGadgetStock`, aggiornare `fetchEventMaterialList` join
- `src/hooks/useAdmin.js` — rimuovere azioni gadget master (fetchGadgetsMaster, etc.)
- `src/components/eventi/MaterialListRow.jsx` — mini-form conferma con stepper + nota, badge parziale
- `src/components/eventi/EventMaterialList.jsx` — rimuovere sezione gadget, stock restore su modifica/cancellazione, bulk confirm con quantita
- `src/components/materiale/CatalogProductCard.jsx` — badge stock per gadget
- `src/components/materiale/CatalogProductModal.jsx` — disponibilita numerica per gadget
- `src/App.jsx` — rimuovere route admin gadget
- `src/components/layout/Sidebar.jsx` — rimuovere nav item gadget
- `src/lib/constants.js` — `TIPO_PRODOTTO` + gadget, `TIPO_BRAND` + fornitore, rimuovere costanti gadget
- `src/lib/icons.js` — pulizia icone gadget se non piu usate

### Eliminati
- `src/components/materiale/GadgetRequestForm.jsx`
- `src/components/materiale/GadgetCard.jsx`
- `src/hooks/useGadgets.js`
- `src/pages/admin/AdminGadget.jsx`

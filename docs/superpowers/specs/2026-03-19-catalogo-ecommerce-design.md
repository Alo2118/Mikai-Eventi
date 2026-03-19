# Catalogo E-commerce per Richiesta Materiale — Design Spec

**Data:** 2026-03-19
**Stato:** Approvato
**Scope:** Evoluzione del sistema di richiesta materiale a catalogo e-commerce stile Amazon

---

## 1. Contesto e Problema

### Due sistemi paralleli nel codebase

Il codebase contiene due sistemi di richiesta materiale:

| | Sistema A (attivo, legacy) | Sistema B (codice morto, più avanzato) |
|---|---|---|
| Tab | `EventMaterialsTab` | `EventMaterialList` |
| Picker | `MaterialCatalogPicker` (wizard 3 step) | `CatalogBrowser` (griglia + filtri) |
| Carrello | `MaterialCart` (date + conflitti) | Inline in CatalogBrowser (quantità +/-) |
| DB write | `material_id` + `quantita_richiesta` | `product_id` + `quantita` |
| In EventiDetail? | Si | **No — mai collegato** |

Il Sistema A è attivo ma ha UX scarsa (flusso forzato Brand → Sezione → Prodotto). Il Sistema B implementa già il 60% del design e-commerce desiderato (griglia prodotti, filtri, carrello con quantità, ActiveFiltersChips) ma non è mai stato collegato alla UI.

### Strategia: evolvere Sistema B

Invece di riscrivere da zero, evolviamo `CatalogBrowser` (Sistema B) e lo colleghiamo alla UI attiva, eliminando il Sistema A.

---

## 2. Design Approvato

### 2.1 Punto d'ingresso

1. `EventiDetail.jsx` usa `EventMaterialList` al posto di `EventMaterialsTab` per il tab materiale
2. `EventMaterialList` contiene il bottone "Aggiungi dal catalogo" che apre il `CatalogBrowser` evoluto
3. Il catalogo si apre in-page (come oggi), non come modale full-screen

**Guard eventi chiusi:** Il bottone "Aggiungi dal catalogo" è nascosto se `event.stato` è `concluso`, `cancellato` o `rifiutato`. Nessun inserimento possibile su eventi chiusi.

### 2.2 Layout Desktop

```
┌──────────────────────────────────────────────────────┐
│  ← Torna alla lista materiale          🛒 3 articoli │
├────────────┬─────────────────────────────────────────┤
│  FILTRI    │  [Barra ricerca]                        │
│            │  Chip filtri attivi [x] [x]   Cancella  │
│  Brand     │─────────────────────────────────────────│
│  ☑ Stylo   │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  ☐ Aston   │  │Card │ │Card │ │Card │ │Card │      │
│            │  └─────┘ └─────┘ └─────┘ └─────┘      │
│  Sezione   │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  ☐ Spalla  │  │Card │ │Card │ │Card │ │Card │      │
│  ☑ Gomito  │  └─────┘ └─────┘ └─────┘ └─────┘      │
│            │                                         │
│  Tipo      │                                         │
│  ☐ Kit demo│                                         │
│  ☐ Strumen.│                                         │
└────────────┴─────────────────────────────────────────┘
```

### 2.3 Layout Mobile

- Filtri nascosti in un drawer (bottone "Filtri" + badge contatore filtri attivi)
- Griglia 1 colonna (card full-width)
- Carrello floating: icona fissa basso-destra con badge contatore, tap → drawer dal basso
- **Mutua esclusione drawer:** drawer filtri e drawer carrello non possono essere aperti simultaneamente. Stato condiviso `activeDrawer: null | 'filters' | 'cart'`. Aprire uno chiude l'altro.

### 2.4 Filtri

Tre gruppi indipendenti, **multi-select** con checkbox (evoluzione dell'attuale single-select):

| Filtro | Sorgente | Tipo |
|--------|----------|------|
| Brand | Tabella `brands` | Record DB (dinamico) |
| Sezione corpo | Tabella `body_sections` | Record DB (dinamico) |
| Tipo prodotto | Enum `product_tipo` su `products` | 4 valori fissi: demo_kit, strumentario, montaggio, pezzo_sfuso |

Logica: AND tra gruppi, OR dentro lo stesso gruppo.
- Esempio: Brand=Stylo AND (Sezione=Spalla OR Sezione=Gomito)

Chip attivi sopra la griglia con X per rimuovere singoli filtri (evoluzione dell'esistente `ActiveFiltersChips`). Bottone "Cancella filtri" per resettare tutto.

**Modifica store:** `fetchCatalogProducts` in `useMaterials.js` va aggiornato:
- `brandId` (single) → `brandIds` (array), query con `.in('brand_id', brandIds)`
- `sectionId` (single) → `sectionIds` (array), filtro client-side con `.some()`
- `tipo` (single) → `tipi` (array), filtro client-side con `.includes()`

### 2.5 Barra Ricerca

Ricerca testuale su nome prodotto e nome brand. Debounced 300ms (pattern `SearchInput` esistente). Già implementata in CatalogBrowser — da mantenere.

### 2.6 Card Prodotto

Evoluzione di `CatalogProductCard.jsx`. Cambiamenti rispetto all'attuale:
- Rimuovere l'expand/collapse inline per dettagli (sostituito da modale)
- Aggiungere bottone "Dettagli" → apre `CatalogProductModal`
- Bottone "Aggiungi" → aggiunge 1 unità al carrello, diventa "Nel carrello ✓" con bordo mikai
- 48px min su tutti i bottoni
- Se già nel carrello: bordo mikai + badge "Nel carrello" + stepper quantità (- qty +)

### 2.7 Modale Prodotto (nuovo)

Contenuto essenziale:
- Nome, brand, tipo
- Codice prodotto
- Sezioni corpo associate (badge)
- Contenuto kit (se presente) — lista componenti da `kit_contents` (usa `fetchKitContents` esistente)
- **Disponibilità:** quanti materiali fisici esistono per questo prodotto + posizione attuale di ciascuno. Richiede nuova azione store `fetchProductAvailability(productId)` che fa join `materials` dove `product_id` = productId.
- Bottone "Aggiungi al carrello" (48px) in fondo

### 2.8 Carrello Floating (nuovo, sostituisce inline cart)

**Trigger:** Icona fissa basso-destra con badge numero articoli. Nascosta se carrello vuoto.

**Drawer (tap → sale dal basso su mobile, modale su desktop):**
- Lista items: nome prodotto, quantità (- / +), nota per item (input testo), bottone rimuovi
- Quantità: default 1, min 1, max libero
- Totale articoli in fondo
- Bottone "Invia richiesta" → salva il carrello (vedi 2.9)
- Bottone "Svuota carrello"

**Stato carrello:** Local state nel `CatalogBrowser` evoluto (come oggi). Il carrello viene pre-popolato dalle righe `event_materials` esistenti per l'evento (già implementato in CatalogBrowser).

**Navigazione con carrello pieno:** Se l'utente clicca "← Torna alla lista materiale" con items non salvati nel carrello, mostrare `ConfirmDialog`: "Hai articoli non salvati nel carrello. Vuoi uscire senza salvare?"

### 2.9 Salvataggio Carrello

Il `CatalogBrowser` attuale ha già una logica `handleSaveCart` che confronta il carrello con le righe DB esistenti e fa insert/update/delete. **Questa logica va mantenuta e evoluta:**

- **Nuovi items** (nel carrello ma non nel DB): `addToMaterialList(eventId, productId, userId, note_commerciale)`
- **Items modificati** (quantità o nota cambiata): `updateMaterialListRow(id, { quantita, note_commerciale })`
- **Items rimossi** (nel DB ma non più nel carrello): `removeMaterialListRow(id)`

Colonne `event_materials` usate dal flusso prodotto-based:
- `event_id`, `product_id`, `quantita`, `stato: 'richiesto'`, `richiesto_da`, `note_commerciale`

**Protezione duplicati:** Il cart è pre-popolato dalle righe DB esistenti. La logica save usa update per righe esistenti e insert solo per nuove. Non serve vincolo UNIQUE perché il flusso impedisce duplicati by design.

Toast: "Lista materiale aggiornata" (non "N prodotti richiesti" — è un save della lista, non solo inserimenti).

---

## 3. Schema Changes

### 3.1 Nessuna migrazione necessaria

- `products.tipo` esiste già come enum `product_tipo` (migration 017)
- `event_materials.quantita` esiste già (migration 017)
- `event_materials.product_id` esiste già (migration 017)
- `event_materials.note_commerciale` esiste già (migration 017)
- Tutte le azioni store necessarie esistono già in `useMaterials.js`

### 3.2 Nuova azione store

Aggiungere a `useMaterials.js`:

```js
fetchProductAvailability: async (productId) => {
  const { data, error } = await supabase
    .from('materials')
    .select('id, nome, codice_inventario, posizione_attuale, magazzino_id')
    .eq('product_id', productId)
    .eq('attivo', true)
  return { data: data || [], error }
}
```

### 3.3 Modifica azione store esistente

`fetchCatalogProducts` → supportare filtri multi-select:
- `brandIds: []` → `.in('brand_id', brandIds)` se non vuoto
- `sectionIds: []` → filtro client-side su `body_sections`
- `tipi: []` → filtro client-side su `tipo`

---

## 4. File da Eliminare (Sistema A)

Tutto il flusso legacy 3-step e il suo punto d'ingresso:
- `src/components/materiale/MaterialCatalogPicker.jsx` — wizard orchestrator
- `src/components/materiale/CatalogStepBrand.jsx`
- `src/components/materiale/CatalogStepBodySection.jsx`
- `src/components/materiale/CatalogStepProducts.jsx`
- `src/components/materiale/CatalogFilterBar.jsx` — barra filtri single-select
- `src/components/eventi/EventMaterialsTab.jsx` — tab legacy (sostituito da EventMaterialList)

Nota: `EventMaterialsTab` gestisce anche gadget e movimenti. Queste sezioni devono essere migrate in `EventMaterialList` prima di eliminare il file, oppure `EventMaterialList` deve importare e renderizzare le sezioni gadget/movimenti da `EventMaterialsTab`.

## 5. File da Evolvere (Sistema B)

- `src/components/materiale/CatalogBrowser.jsx` — da single-select a multi-select, filtri in sidebar/drawer, carrello floating
- `src/components/materiale/CatalogProductCard.jsx` — rimuovere expand inline, aggiungere bottone "Dettagli" per modale
- `src/components/materiale/ActiveFiltersChips.jsx` — supporto multi-select (già compatibile)
- `src/components/eventi/EventMaterialList.jsx` — aggiungere sezioni gadget e movimenti da EventMaterialsTab
- `src/hooks/useMaterials.js` — multi-select in fetchCatalogProducts, nuova fetchProductAvailability

## 6. File Nuovi

- `src/components/materiale/CatalogSidebar.jsx` — filtri laterali con checkbox (desktop sidebar, mobile drawer)
- `src/components/materiale/CatalogProductModal.jsx` — modale dettaglio prodotto con disponibilità
- `src/components/materiale/CatalogCartFloating.jsx` — icona floating + drawer carrello

## 7. Wiring Changes

- `src/pages/eventi/EventiDetail.jsx` — importare `EventMaterialList` al posto di `EventMaterialsTab`
- `src/components/materiale/MaterialCart.jsx` — da eliminare (sostituito da CatalogCartFloating)

# Ordine manuale delle attività dell'evento (per categoria)

**Data:** 2026-07-15
**Stato:** Approvato

## Obiettivo
Permettere di ordinare manualmente le attività di un evento, **dentro ogni categoria**,
con frecce su/giù (ovunque) e drag & drop (solo desktop).

## Contesto rilevato
- `event_activities` oggi si ordina per `deadline` (asc, nulls last). Nessun ordine manuale.
- I template checklist si ordinano per **dipendenze** via `topologicalSort(items)`
  (`dipende_da`), NON per `ordine`. La colonna `template_items.ordine` è di fatto
  inutilizzata (default `0`, mai valorizzata, nessuna UI la riordina).
- La vista Preparazione ha due modalità: Kanban (per stato) e Lista (per categoria).

## Decisioni
- **(b)** In evento il riordino manuale è **libero**: si può spostare un task anche sopra
  la sua dipendenza. È solo ordine visivo; il **gate della dipendenza resta attivo**
  (il task non può iniziare finché la dipendenza non è completata).
- **Template (agg. dopo revisione):** si aggiunge il riordino manuale **anche nel template**
  (lista piatta, non raggruppata). L'ordine impostato nel template diventa il default di
  ogni nuovo evento generato. La colonna `template_items.ordine` viene rianimata; il display
  passa da `topologicalSort` a ordinamento per `ordine`; l'indentazione per profondità di
  dipendenza viene rimossa (con l'ordine libero non ha più senso). Le dipendenze restano
  come info ("Dopo: X") e come gate negli eventi. Gli helper `topologicalSort`/`getDepthLevel`
  diventano codice morto e vengono rimossi.

## Modello dati — migration
- `ALTER TABLE event_activities ADD COLUMN IF NOT EXISTS ordine integer`.
- Backfill eventi esistenti: per `(event_id, categoria)` assegna `0,1,2…` seguendo
  l'ordine attuale (`deadline` NULLS LAST, poi `created_at`) → nessuno spostamento
  per gli eventi già in uso.
- Indice `(event_id, categoria, ordine)`.

## Store `useActivities.js`
- `fetchEventActivities`: ordina per `ordine` (asc, nulls last), poi `deadline` come
  spareggio. Il raggruppamento per categoria (lato client) preserva l'ordine.
- `reorderCategory(orderedIds)`: riassegna `ordine = 0..n` alle attività passate
  (una categoria), update ottimistico in stato + batch update DB; rollback via refetch
  su errore. Usata sia dalle frecce sia dal drag.
- `addCustomActivity`: imposta `ordine = max(ordine della categoria) + 1` (in coda).
- `generateActivitiesFromTemplate`: semina `ordine` dall'ordine del template (già ordinato
  per `ordine`), numerato per categoria → l'ordine del template arriva nell'evento.

## Template (`AdminTemplate` + `useActivityTemplates`)
- Migration `template_items_ordine_backfill`: backfill `ordine` per le checklist
  (`tipo='checklist'`), per template, ordinando per `giorni_prima_evento` poi `descrizione`.
- `createTemplateItem`: `ordine = max(checklist del template) + 1`.
- `reorderTemplateItems(orderedIds)`: riassegna `ordine = 0..n` in batch.
- UI: lista piatta ordinata per `ordine` con `ReorderControls` (frecce + drag desktop).
- `ReorderControls` estratto in `src/components/ui/ReorderControls.jsx`, condiviso tra
  la lista Preparazione dell'evento e l'editor template.

## UI — solo vista Lista (`PreparazioneListView`)
Per ogni card, dentro il gruppo-categoria, strip di controllo a sinistra (solo se `canEdit`):
- `↑` / `↓` (48px, sempre): spostano di una posizione; `↑` disabilitato sul primo,
  `↓` sull'ultimo (con `title` esplicativo).
- Maniglia grip (icona) visibile solo `md:` → drag & drop nativo HTML5 per riposizionamento
  libero. Nessuna libreria esterna.
- La Kanban resta invariata (ordina per stato).

## Fuori scope (YAGNI)
Drag su mobile, ordinamento cross-categoria, riordino manuale nei template, pulizia della
colonna morta `template_items.ordine`, campo priorità Alta/Media/Bassa.

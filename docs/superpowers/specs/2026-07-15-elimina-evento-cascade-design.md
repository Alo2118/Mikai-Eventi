# Eliminazione definitiva evento (con dipendenze)

**Data:** 2026-07-15
**Stato:** Approvato

## Obiettivo
Aggiungere un'azione di **eliminazione definitiva** di un evento e di tutti i dati
da esso dipendenti, distinta dall'esistente "Annulla evento" (soft, `stato=cancellato`).

## Regole di prodotto
- **Permessi:** solo ruolo `admin` o `direzione`. Il pulsante è invisibile agli altri.
- **Stato:** eliminabile in qualsiasi stato **tranne `concluso`** (protegge lo storico
  compliance/MedTech). Sui conclusi il pulsante non compare.
- **Storage:** i file caricati nel bucket `event-documents` vengono eliminati insieme
  ai record DB (nessun file orfano).

## Mappa dipendenze (FK verso `events`)
La maggior parte delle FK è già `ON DELETE CASCADE` (event_materials, event_staff,
event_participants, event_activities, event_costs, logistica, event_documents,
tavoli, packing_list_items, readiness…) → eliminate automaticamente.

FK da sistemare una volta (migration):

| FK | Nuova regola | Motivo |
|----|--------------|--------|
| `material_movements.event_id` | `SET NULL` | Preserva la verità di magazzino; un movimento resta valido senza evento. |
| `template_suggestions.event_id` (NOT NULL) | `CASCADE` | Dato derivato. |
| `events.parent_event_id` | `SET NULL` | Non trascinare gli eventi figli. |
| `events.clonato_da_id` | `SET NULL` | Non trascinare i cloni. |

Già `SET NULL` (nessuna modifica): `hcp_engagements.evento_id`,
`transfers_of_value.evento_id`, `stock_adjustments.event_id`. I record compliance/ToV
NON vengono cancellati, solo scollegati.

## Architettura

### 1. Migration `..._delete_event_cascade.sql`
- Ridefinisce idempotentemente le 4 FK sopra (drop + add, nomi standard
  `<tabella>_<colonna>_fkey`).
- Funzione `delete_event_cascade(p_event_id uuid) RETURNS text[]`,
  `SECURITY DEFINER`, `SET search_path = public`:
  1. `get_user_role()` ∈ (`admin`, `direzione`) → altrimenti `RAISE EXCEPTION`.
  2. Verifica evento esiste; `stato = 'concluso'` → `RAISE EXCEPTION`.
  3. Raccoglie `file_path` da `event_documents` dell'evento.
  4. `DELETE FROM events WHERE id = p_event_id` (le cascade fanno il resto).
  5. `RETURN` array dei path.
- `GRANT EXECUTE ON FUNCTION delete_event_cascade(uuid) TO authenticated`.

### 2. Store `useEvents.js` → `deleteEvent(id)`
- `supabase.rpc('delete_event_cascade', { p_event_id: id })`.
- Se ok e ci sono path: `supabase.storage.from('event-documents').remove(paths)`
  (best-effort; un errore storage non blocca l'esito).
- Aggiorna la lista in memoria; ritorna `{ error }`.

### 3. UI — `EventInfoTab.jsx`
- Sezione "Zona pericolosa" in fondo, bordo rosso, separata.
- Visibile solo se `hasRole('admin','direzione')` **e** `stato !== 'concluso'`.
- Pulsante rosso → `ConfirmDialog` destructive che richiede di **digitare il titolo**
  dell'evento per abilitare la conferma. Elenca cosa verrà eliminato.
- Successo → toast "Evento eliminato" + `navigate('/eventi')`. Errore → toast umano.

## Fuori scope (YAGNI)
Cestino/soft-delete recuperabile (già coperto da "Annulla"), audit log dedicato,
eliminazione massiva.

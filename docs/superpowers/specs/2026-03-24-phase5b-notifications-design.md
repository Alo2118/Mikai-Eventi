# Phase 5B — Notifiche & Comunicazione — Design Spec

**Data:** 2026-03-24
**Stato:** Brainstorming completo — tutte le sezioni pronte per revisione
**Scope:** In-app notifications, automatic triggers, email digests, escalation rules

---

## 1. Contesto e Problemi

### Problemi attuali
- **Nessuna notifica proattiva:** utenti devono aprire l'app e controllare manualmente se c'e' qualcosa di nuovo
- **Approvazioni dimenticate:** preventivi e eventi restano in_attesa per giorni senza che l'approvatore se ne accorga
- **Attivita' scadute invisibili:** deadline mancate vengono scoperte solo quando qualcuno controlla il cruscotto convergenza
- **Conflitti materiale silenziosi:** il commerciale non sa che un conflitto e' stato rilevato finche' non riapre l'evento
- **Rientri scaduti non tracciati:** Ivan (magazzino) deve controllare manualmente la lista rientri ogni giorno
- **Nessun canale push:** l'unico feedback e' il Toast che dura 4 secondi e richiede presenza attiva nell'app

### Vincoli
- Target users con bassa literacy digitale — le notifiche devono essere auto-esplicative, con link diretto all'azione
- L'app non e' una PWA (service worker in Phase 6) — niente push notifications browser per ora
- Email come canale secondario, non primario — l'in-app notification e' la fonte di verita'
- Supabase Edge Functions per la logica server-side (trigger DB + cron)
- Budget: zero costi aggiuntivi — usa Supabase built-in (pg_cron, pg_net, Edge Functions)

---

## 2. Architettura Overview

```
                    ┌──────────────────────┐
                    │   Supabase DB        │
                    │                      │
                    │  notifications table │◄── DB triggers (INSERT on state changes)
                    │                      │◄── Edge Function: deadline_checker (cron)
                    │                      │◄── Edge Function: escalation_checker (cron)
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Supabase Realtime  │
                    │   (channel: notif)   │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
   ┌──────▼──────┐   ┌────────▼────────┐   ┌───────▼───────┐
   │  Bell icon  │   │  /notifiche     │   │  Email digest │
   │  (Sidebar/  │   │  (full page)    │   │  (Edge Fn +   │
   │  Header)    │   │                 │   │  pg_cron)     │
   └─────────────┘   └─────────────────┘   └───────────────┘
```

### Data flow
1. **Event occurs** (state change, deadline approaching, conflict detected)
2. **DB trigger or Edge Function** creates row(s) in `notifications` table
3. **Supabase Realtime** pushes new notification to connected clients via channel subscription
4. **Frontend `useNotifications` store** receives realtime event, updates bell badge count
5. **Optionally**, Edge Function sends email digest (daily/weekly, batched — never per-notification)

---

## 3. Database Schema

### 3.0 Migration prerequisite — drop legacy tables

Migration `20260315000009_notifications.sql` already created `notifications` (with `categoria` enum type `notifica_categoria`, `canale_inviato`, etc.), `notification_preferences` (with different columns), and `template_suggestions`. These must be dropped before creating the new schema.

The migration MUST begin with:

```sql
-- Drop legacy notification tables (from migration 20260315000009)
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS template_suggestions CASCADE;
DROP TYPE IF EXISTS notifica_categoria;
DROP TYPE IF EXISTS notifica_canale;
```

### 3.1 `notifications` table

```sql
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,           -- enum: see TIPO_NOTIFICA below
  titolo        TEXT NOT NULL,           -- short summary, max ~80 chars
  messaggio     TEXT,                    -- optional longer description
  link          TEXT,                    -- relative URL, e.g. "/eventi/abc-123"
  link_label    TEXT,                    -- CTA text, e.g. "Vai all'evento"
  letta         BOOLEAN NOT NULL DEFAULT false,
  -- Context: which entity triggered this notification
  entity_type   TEXT,                    -- 'event' | 'activity' | 'material' | 'preventivo'
  entity_id     UUID,                    -- ID of the referenced entity
  -- Metadata for grouping/dedup
  gruppo        TEXT,                    -- grouping key for batching similar notifs
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, letta) WHERE letta = false;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- RLS: users can only see/update their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Only server (service_role) or DB triggers can INSERT/DELETE
CREATE POLICY "Service role inserts notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);  -- triggers run as SECURITY DEFINER

CREATE POLICY "Users delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());  -- users can only delete their own notifications
```

### 3.2 `notification_preferences` table

```sql
CREATE TABLE notification_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_daily   BOOLEAN NOT NULL DEFAULT true,
  email_weekly  BOOLEAN NOT NULL DEFAULT true,
  -- Per-type muting (in-app still shows, but email is suppressed)
  mute_types    TEXT[] NOT NULL DEFAULT '{}',  -- array of tipo values to suppress in email
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 3.3 Notification types enum

```sql
-- Defined as CHECK constraint, not Postgres ENUM (avoids migration pain for new values)
ALTER TABLE notifications ADD CONSTRAINT notifications_tipo_check
  CHECK (tipo IN (
    'approvazione_richiesta',
    'approvazione_completata',
    'attivita_scaduta',
    'attivita_in_scadenza',
    'attivita_assegnata',
    'conflitto_materiale',
    'rientro_scaduto',
    'preventivo_stato',
    'evento_stato_cambiato',
    'escalation'
  ));
```

---

## 4. Feature 1 — In-App Notification System

### 4.1 Constants (`src/lib/constants.js`)

```js
export const TIPO_NOTIFICA = {
  approvazione_richiesta:   'Approvazione richiesta',
  approvazione_completata:  'Approvazione completata',
  attivita_scaduta:         'Attivita\' scaduta',
  attivita_in_scadenza:     'Attivita\' in scadenza',
  attivita_assegnata:       'Attivita\' assegnata',
  conflitto_materiale:      'Conflitto materiale',
  rientro_scaduto:          'Rientro materiale scaduto',
  preventivo_stato:         'Stato preventivo cambiato',
  evento_stato_cambiato:    'Stato evento cambiato',
  escalation:               'Escalation',
}

export const TIPO_NOTIFICA_COLORE = {
  approvazione_richiesta:   'yellow',
  approvazione_completata:  'green',
  attivita_scaduta:         'red',
  attivita_in_scadenza:     'yellow',
  attivita_assegnata:       'blue',
  conflitto_materiale:      'red',
  rientro_scaduto:          'red',
  preventivo_stato:         'blue',
  evento_stato_cambiato:    'mikai',
  escalation:               'red',
}
```

### 4.2 Icons (`src/lib/icons.js`)

Add to existing file:

```js
// In lucide-react imports, add:
import { BellRing, BellDot, BellOff, Megaphone } from 'lucide-react'

// New icon map:
export const NOTIFICA_ICONS = {
  approvazione_richiesta:   Clock,          // reuse existing
  approvazione_completata:  CheckCircle,    // reuse existing
  attivita_scaduta:         Timer,          // reuse existing
  attivita_in_scadenza:     AlertTriangle,  // reuse existing
  attivita_assegnata:       UserCheck,      // reuse existing
  conflitto_materiale:      AlertTriangle,  // reuse existing
  rientro_scaduto:          RotateCcw,      // reuse existing
  preventivo_stato:         FileText,       // reuse existing
  evento_stato_cambiato:    Calendar,       // reuse existing
  escalation:               Megaphone,      // new
  bell_ring: BellRing,                      // new: bell with motion lines
  bell_dot: BellDot,                        // new: bell with red dot
  bell_off: BellOff,                        // new: muted bell
}
```

### 4.3 Zustand Store (`src/hooks/useNotifications.js`)

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  // Fetch recent notifications (paginated)
  fetchNotifications: async (limit = 50, offset = 0) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    set({
      notifications: offset === 0 ? (data || []) : [...get().notifications, ...(data || [])],
      loading: false,
      error: error?.message,
    })
    return { data, error }
  },

  // Fetch unread count only (lightweight — called on app init + realtime)
  fetchUnreadCount: async () => {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('letta', false)
    if (!error) set({ unreadCount: count || 0 })
    return { count, error }
  },

  // Mark single notification as read
  markAsRead: async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ letta: true })
      .eq('id', id)
    if (!error) {
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, letta: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }))
    }
    return { error }
  },

  // Mark all as read
  markAllAsRead: async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ letta: true })
      .eq('letta', false)
    if (!error) {
      set(s => ({
        notifications: s.notifications.map(n => ({ ...n, letta: true })),
        unreadCount: 0,
      }))
    }
    return { error }
  },

  // Subscribe to realtime notifications
  subscribeRealtime: (userId) => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          set(s => ({
            notifications: [payload.new, ...s.notifications],
            unreadCount: s.unreadCount + 1,
          }))
        }
      )
      .subscribe()
    return channel  // caller stores ref to unsubscribe on cleanup
  },

  // Fetch preferences
  preferences: null,

  fetchPreferences: async () => {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .single()
    if (data) set({ preferences: data })
    return { data, error }
  },

  updatePreferences: async (updates) => {
    const prefs = get().preferences
    if (!prefs) {
      // Create if not exists
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert({ user_id: (await supabase.auth.getUser()).data.user.id, ...updates })
        .select()
        .single()
      if (data) set({ preferences: data })
      return { data, error }
    }
    const { data, error } = await supabase
      .from('notification_preferences')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', prefs.id)
      .select()
      .single()
    if (data) set({ preferences: data })
    return { data, error }
  },
}))
```

### 4.4 Bell Icon Component (`src/components/ui/NotificationBell.jsx`)

Renders in Sidebar header and MobileHeader. Shows unread count badge.

```jsx
// Props: none (reads from useNotificationsStore)
// Behavior:
//   - Shows Bell icon (from NAV_ICONS.notifiche)
//   - If unreadCount > 0: red dot with count (max "99+")
//   - Click: opens NotificationDropdown (desktop) or navigates to /notifiche (mobile)
//   - Dropdown: last 10 notifications, "Segna tutte come lette", "Vedi tutte" link
```

**UX specification:**

| Element | Desktop | Mobile |
|---------|---------|--------|
| Bell icon location | Top of Sidebar, right of "Mikai Eventi" title | Right side of MobileHeader |
| Click behavior | Opens dropdown panel (320px wide, max-h-[480px]) | Navigates to /notifiche |
| Badge | Red circle, white text, top-right of bell | Same |
| Badge text | Number if <=99, "99+" if more | Same |
| Dropdown position | Below bell, aligned right | N/A (full page) |

**Dropdown panel contents:**
1. Header: "Notifiche" + "Segna tutte come lette" link (only if unread > 0)
2. List of last 10 notifications, each showing:
   - Type icon (from `NOTIFICA_ICONS`) with color dot
   - `titolo` (bold if unread)
   - `messaggio` (truncated to 2 lines, gray text)
   - Relative time ("3 min fa", "2 ore fa", "ieri")
   - Click: marks as read + navigates to `link`
3. Footer: "Vedi tutte le notifiche" link to /notifiche
4. Empty state: "Nessuna notifica" with bell icon

**Accessibility:**
- `aria-label="Notifiche, X non lette"` on bell button
- `role="menu"` on dropdown
- `aria-live="polite"` on badge count
- Escape key closes dropdown
- Focus trap inside dropdown when open

### 4.5 Notification List Page (`src/pages/notifiche/NotifichePage.jsx`)

Replaces the current `<ComingSoon>` at `/notifiche`.

**Layout:**
- `<PageHeader title="Notifiche" />` with action: "Segna tutte come lette"
- Filter bar: Tipo (select from TIPO_NOTIFICA) + Stato (tutte / non lette / lette)
- Notification cards in a single-column list
- Infinite scroll (load 50 at a time)
- Each card: icon + titolo + messaggio + relative time + "Segna come letta" button (if unread)
- Click on card: navigates to `link`
- Unread cards: white background with left blue border (like event cards with color band)
- Read cards: slightly muted (bg-gray-50)

**Empty state:** "Tutto in ordine! Non hai notifiche." with bell-off icon.

### 4.6 Sidebar Integration

Modify `src/components/layout/Sidebar.jsx`:
- Add `<NotificationBell />` component in the header area, next to "Mikai Eventi"
- The existing navItem for `/notifiche` stays in the nav list (for users who prefer full page)
- Bell icon is the quick-access entry point

```jsx
// In Sidebar header:
<div className="p-5 border-b border-gray-200 flex items-center justify-between">
  <h1 className="text-xl font-bold text-mikai-400">Mikai Eventi</h1>
  <NotificationBell />
</div>
```

### 4.7 Mobile Bell Integration (via AppShell)

Do NOT modify `MobileHeader.jsx` with a per-page `showBell` prop — that approach is fragile and requires every page to pass the prop.

Instead, add the bell icon directly in `AppShell.jsx`'s mobile layout, positioned globally next to the MobileHeader component. This ensures the bell appears on all mobile pages without per-page changes.

```jsx
// In AppShell.jsx, mobile layout area (visible on md:hidden):
<div className="fixed top-0 left-0 right-0 z-40 md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200">
  <MobileHeader />
  <NotificationBell />
</div>
```

This mirrors the desktop approach (bell in Sidebar header) and keeps bell visibility consistent across all pages.

### 4.8 Realtime Subscription Lifecycle

In `src/components/layout/AppShell.jsx` (or a new `NotificationProvider`):

```jsx
// On mount (user is authenticated):
useEffect(() => {
  const userId = profile?.id
  if (!userId) return

  fetchUnreadCount()
  const channel = subscribeRealtime(userId)

  return () => {
    supabase.removeChannel(channel)
  }
}, [profile?.id])
```

This ensures:
- Unread count is loaded on app init
- Realtime subscription is active while user is logged in
- Cleanup on logout or unmount

---

## 5. Feature 2 — Automatic Notification Triggers

### 5.1 Trigger Matrix

| Trigger Event | Tipo Notifica | Recipients | Titolo Template | Link |
|---|---|---|---|---|
| Event state changes | `evento_stato_cambiato` | promotore + event staff | "L'evento '{titolo}' e' ora {nuovo_stato}" | `/eventi/{id}` |
| Event proposed (needs approval) | `approvazione_richiesta` | Users with `approva_eventi` permission | "Nuovo evento da approvare: '{titolo}'" | `/eventi/{id}` |
| Event approved | `approvazione_completata` | promotore | "Il tuo evento '{titolo}' e' stato approvato" | `/eventi/{id}` |
| Event rejected | `approvazione_completata` | promotore | "Il tuo evento '{titolo}' e' stato rifiutato" | `/eventi/{id}` |
| Activity assigned to user | `attivita_assegnata` | assegnato_a user | "Ti e' stata assegnata: '{descrizione}' per '{evento_titolo}'" | `/eventi/{event_id}` |
| Activity deadline in 3 days | `attivita_in_scadenza` | assegnato_a (or all with permesso_responsabile if unassigned) | "Scadenza tra 3 giorni: '{descrizione}'" | `/eventi/{event_id}` |
| Activity deadline in 1 day | `attivita_in_scadenza` | assegnato_a (or all with permesso_responsabile if unassigned) | "Scadenza domani: '{descrizione}'" | `/eventi/{event_id}` |
| Activity overdue | `attivita_scaduta` | assegnato_a + users with permesso_responsabile | "In ritardo: '{descrizione}' per '{evento_titolo}'" | `/eventi/{event_id}` |
| Material conflict detected | `conflitto_materiale` | richiesto_da user | "Conflitto materiale: '{material_nome}' gia' assegnato" | `/eventi/{event_id}` |
| Material return overdue | `rientro_scaduto` | movement responsabile + users with `gestione_magazzino` | "Rientro scaduto: '{material_nome}' da '{evento_titolo}'" | `/materiale/{material_id}` |
| Preventivo approved | `preventivo_stato` | preventivo creator (from event promotore) | "Preventivo approvato: {fornitore} per '{evento_titolo}'" | `/eventi/{event_id}` |
| Preventivo rejected | `preventivo_stato` | preventivo creator | "Preventivo rifiutato: {fornitore} per '{evento_titolo}'" | `/eventi/{event_id}` |
| Preventivo needs approval | `approvazione_richiesta` | Users with `approva_preventivi` | "Nuovo preventivo da approvare: {fornitore} per '{evento_titolo}'" | `/eventi/{event_id}` |
| Escalation (overdue 3+ days) | `escalation` | Manager of responsible role | "Escalation: '{descrizione}' in ritardo da {N} giorni" | `/eventi/{event_id}` |

### 5.2 Implementation: DB Triggers (synchronous, for state changes)

These fire immediately on data changes. Implemented as PostgreSQL trigger functions.

#### Trigger 1: Event state change

```sql
CREATE OR REPLACE FUNCTION notify_event_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _staff RECORD;
  _approver RECORD;
  _titolo TEXT;
  _link TEXT;
BEGIN
  -- Only fire when stato actually changes
  IF OLD.stato = NEW.stato THEN RETURN NEW; END IF;

  _titolo := NEW.titolo;
  _link := '/eventi/' || NEW.id;

  -- Notify promotore (only if active, with dedup)
  IF NEW.promotore_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM users WHERE id = NEW.promotore_id AND attivo = true)
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'event_state_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
  THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      NEW.promotore_id,
      CASE
        WHEN NEW.stato = 'confermato' THEN 'approvazione_completata'
        WHEN NEW.stato = 'rifiutato' THEN 'approvazione_completata'
        ELSE 'evento_stato_cambiato'
      END,
      CASE
        WHEN NEW.stato = 'confermato' THEN 'Evento approvato: ' || _titolo
        WHEN NEW.stato = 'rifiutato' THEN 'Evento rifiutato: ' || _titolo
        ELSE 'Evento ' || _titolo || ' → ' || NEW.stato
      END,
      NULL,
      _link,
      'Vai all''evento',
      'event',
      NEW.id,
      'event_state_' || NEW.id
    );
  END IF;

  -- Notify event staff (from event_staff table)
  FOR _staff IN
    SELECT DISTINCT es.user_id FROM event_staff es
    JOIN users u ON u.id = es.user_id
    WHERE es.event_id = NEW.id AND es.user_id != NEW.promotore_id
    AND u.attivo = true
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'event_state_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _staff.user_id,
      'evento_stato_cambiato',
      'Evento ' || _titolo || ' → ' || NEW.stato,
      NULL,
      _link,
      'Vai all''evento',
      'event',
      NEW.id,
      'event_state_' || NEW.id
    );
  END LOOP;

  -- If event proposed → notify approvers
  IF NEW.stato = 'proposto' AND OLD.stato IS DISTINCT FROM 'proposto' THEN
    FOR _approver IN
      SELECT DISTINCT u.id FROM users u
      JOIN user_permissions up ON up.user_id = u.id
      WHERE up.permission = 'approva_eventi'
      AND u.id != NEW.promotore_id
      AND u.attivo = true
      AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'event_approval_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
    LOOP
      INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
      VALUES (
        _approver.id,
        'approvazione_richiesta',
        'Nuovo evento da approvare: ' || _titolo,
        'Proposto da ' || (SELECT nome || ' ' || cognome FROM users WHERE id = NEW.promotore_id),
        _link,
        'Rivedi evento',
        'event',
        NEW.id,
        'event_approval_' || NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_state_change
  AFTER UPDATE OF stato ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_state_change();

-- Also fire on INSERT when a new event is created with stato = 'proposto'
-- (the first creation is an INSERT, not an UPDATE)
CREATE OR REPLACE FUNCTION notify_event_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _approver RECORD;
  _titolo TEXT;
  _link TEXT;
  _gruppo TEXT;
BEGIN
  _titolo := NEW.titolo;
  _link := '/eventi/' || NEW.id;
  _gruppo := 'event_approval_' || NEW.id;

  FOR _approver IN
    SELECT DISTINCT u.id FROM users u
    JOIN user_permissions up ON up.user_id = u.id
    WHERE up.permission = 'approva_eventi'
    AND u.id != NEW.promotore_id
    AND u.attivo = true
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND created_at > NOW() - INTERVAL '1 hour')
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _approver.id,
      'approvazione_richiesta',
      'Nuovo evento da approvare: ' || _titolo,
      'Proposto da ' || (SELECT nome || ' ' || cognome FROM users WHERE id = NEW.promotore_id),
      _link,
      'Rivedi evento',
      'event',
      NEW.id,
      _gruppo
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  WHEN (NEW.stato = 'proposto')
  EXECUTE FUNCTION notify_event_created();
```

#### Trigger 2: Activity assigned

```sql
CREATE OR REPLACE FUNCTION notify_activity_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento RECORD;
BEGIN
  -- Only fire when assegnato_a changes from NULL or to a different user
  IF NEW.assegnato_a IS NULL THEN RETURN NEW; END IF;
  IF OLD.assegnato_a IS NOT DISTINCT FROM NEW.assegnato_a THEN RETURN NEW; END IF;

  -- Check that the assigned user is active
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.assegnato_a AND attivo = true) THEN
    RETURN NEW;
  END IF;

  SELECT titolo INTO _evento FROM events WHERE id = NEW.event_id;

  -- Dedup: skip if same notification sent within the last hour
  IF NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'activity_assign_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour') THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      NEW.assegnato_a,
      'attivita_assegnata',
      'Nuova attivita'' assegnata: ' || NEW.descrizione,
      'Per l''evento: ' || _evento.titolo,
      '/eventi/' || NEW.event_id,
      'Vai all''evento',
      'activity',
      NEW.id,
      'activity_assign_' || NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_assigned
  AFTER UPDATE OF assegnato_a ON event_activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_activity_assigned();
```

#### Trigger 3: Preventivo state change

```sql
CREATE OR REPLACE FUNCTION notify_preventivo_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _evento RECORD;
  _fornitore TEXT;
  _promotore_id UUID;
  _approver RECORD;
BEGIN
  IF OLD.stato = NEW.stato THEN RETURN NEW; END IF;

  SELECT id, titolo, promotore_id INTO _evento FROM events WHERE id = NEW.event_id;
  _promotore_id := _evento.promotore_id;

  -- Handle NULL fornitore_id (manual fornitore_nome instead of contact reference)
  _fornitore := COALESCE(
    (SELECT COALESCE(nome, '') || ' ' || COALESCE(cognome, '') FROM contacts WHERE id = NEW.fornitore_id),
    NEW.fornitore_nome,
    'fornitore sconosciuto'
  );

  -- Notify promotore when preventivo is approved/rejected (only if promotore is active)
  IF NEW.stato IN ('approvato', 'rifiutato', 'in_revisione') AND _promotore_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM users WHERE id = _promotore_id AND attivo = true)
    AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'preventivo_state_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
  THEN
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
    VALUES (
      _promotore_id,
      'preventivo_stato',
      'Preventivo ' || NEW.stato || ': ' || TRIM(_fornitore),
      'Per l''evento: ' || _evento.titolo,
      '/eventi/' || NEW.event_id,
      'Vai ai costi',
      'preventivo',
      NEW.id,
      'preventivo_state_' || NEW.id
    );
  END IF;

  -- Notify approvers when new preventivo is pending
  IF NEW.stato = 'in_attesa' AND OLD.stato IS DISTINCT FROM 'in_attesa' THEN
    FOR _approver IN
      SELECT DISTINCT u.id FROM users u
      JOIN user_permissions up ON up.user_id = u.id
      WHERE up.permission = 'approva_preventivi'
      AND u.attivo = true
      AND NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = 'preventivo_approval_' || NEW.id AND created_at > NOW() - INTERVAL '1 hour')
    LOOP
      INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, link_label, entity_type, entity_id, gruppo)
      VALUES (
        _approver.id,
        'approvazione_richiesta',
        'Preventivo da approvare: ' || TRIM(_fornitore),
        _evento.titolo || ' — ' || COALESCE(NEW.importo::TEXT, '?') || ' EUR',
        '/eventi/' || NEW.event_id,
        'Rivedi preventivo',
        'preventivo',
        NEW.id,
        'preventivo_approval_' || NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_preventivo_state_change
  AFTER UPDATE OF stato ON event_preventivi
  FOR EACH ROW
  EXECUTE FUNCTION notify_preventivo_state_change();

-- Also for INSERT (new preventivo in_attesa)
CREATE TRIGGER trg_preventivo_created
  AFTER INSERT ON event_preventivi
  FOR EACH ROW
  WHEN (NEW.stato = 'in_attesa')
  EXECUTE FUNCTION notify_preventivo_state_change();
```

#### Trigger 4: Material conflict (inline in checkConflict)

Material conflicts are detected client-side in `useMaterialsStore.checkConflict`. Rather than a DB trigger, we create the notification from the store action when a conflict is found. This is a pragmatic choice: the conflict detection logic already exists in the frontend.

In `useMaterialsStore.checkConflict`, after detecting conflicts:

```js
// If conflicts found, create notification for the requesting user
if (data.length > 0 && requestingUserId) {
  await supabase.from('notifications').insert({
    user_id: requestingUserId,
    tipo: 'conflitto_materiale',
    titolo: `Conflitto materiale: ${materialName}`,
    messaggio: `Gia' assegnato a: ${data.map(c => c.event?.titolo).join(', ')}`,
    link: `/eventi/${eventId}`,
    link_label: 'Vai al materiale',
    entity_type: 'material',
    entity_id: materialId,
  })
}
```

### 5.3 Implementation: Edge Functions (async, for deadline checks)

#### Prerequisites

The project does not currently have a `supabase/functions/` directory. Before implementing Edge Functions:

1. **Create directory:** `mkdir -p supabase/functions/deadline-checker supabase/functions/overdue-returns-checker supabase/functions/email-digest`
2. **Enable extensions:** Enable `pg_cron` and `pg_net` extensions in the Supabase Dashboard (Database > Extensions)
3. **Configure secrets:** Add `SUPABASE_SERVICE_ROLE_KEY` as an Edge Function secret via `npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>`
4. **Local testing:** Test each function locally with `npx supabase functions serve` before deploying
5. **Deploy:** Use `npx supabase functions deploy <function-name>` for each function

#### Edge Function: `deadline-checker`

Runs via pg_cron every day at 07:00 CET. Checks all open activities for upcoming and overdue deadlines.

```
supabase/functions/deadline-checker/index.ts
```

**Logic:**
1. Query `event_activities` WHERE stato IN ('da_fare', 'in_corso') AND deadline IS NOT NULL
2. Join with `events` to get titolo and filter only active events (stato NOT IN cancellato, rifiutato, concluso)
3. For each activity:
   - Calculate days until deadline
   - If days == 3: create `attivita_in_scadenza` notification (if not already sent today — dedup by gruppo)
   - If days == 1: create `attivita_in_scadenza` notification
   - If days < 0 (overdue): create `attivita_scaduta` notification (daily, deduped)
4. Recipients:
   - If `assegnato_a` is set: notify that user
   - If `assegnato_a` is NULL: notify all users who have the `permesso_responsabile` permission

**Deduplication:**
Use `gruppo` column: `deadline_{activity_id}_{date}`. Before inserting, check if a notification with the same `gruppo` already exists.

#### Edge Function: `overdue-returns-checker`

Runs via pg_cron every day at 07:00 CET. Checks for overdue material returns.

**Logic:**
1. Query `material_movements` WHERE tipo = 'uscita' AND data_rientro_prevista < NOW()
2. Join with `materials` to check posizione_attuale != 'in_magazzino'
3. For each overdue return:
   - Notify `responsabile_id` from the movement
   - Notify all users with `gestione_magazzino` permission
   - Dedup: `rientro_scaduto_{movement_id}_{date}`

### 5.4 pg_cron Setup

```sql
-- Enable pg_cron extension (Supabase has it available)
-- Schedule daily at 07:00 UTC (08:00 CET winter, 09:00 CEST summer)
-- Actual scheduling done via Supabase Dashboard > Database > Extensions > pg_cron

SELECT cron.schedule(
  'deadline-checker',
  '0 7 * * *',  -- 07:00 UTC daily
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/deadline-checker',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'
  )$$
);

SELECT cron.schedule(
  'overdue-returns-checker',
  '0 7 * * *',
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/overdue-returns-checker',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'
  )$$
);
```

---

## 6. Feature 3 — Email Digest

### 6.1 Edge Function: `email-digest`

Two schedules:
- **Daily digest:** `0 7 * * 1-5` (07:00 UTC, weekdays only)
- **Weekly digest:** `0 7 * * 1` (07:00 UTC, Monday)

### 6.2 Daily Digest Content

For each user where `notification_preferences.email_daily = true`:

1. **Approvazioni in attesa** — count of pending event approvals + pending preventivi
2. **Attivita' in scadenza oggi/domani** — list with event name and deadline
3. **Attivita' in ritardo** — list with event name and how many days overdue
4. **Eventi di oggi** — list of events with data_inizio = today
5. **Rientri scaduti** — list of overdue material returns (only for gestione_magazzino users)

If a user has nothing pending, skip the email entirely.

### 6.3 Weekly Digest Content (Monday)

For each user where `notification_preferences.email_weekly = true`:

1. **Questa settimana:** events starting Mon-Sun
2. **Riepilogo settimana scorsa:** N events completed, N activities completed
3. **Budget alert:** events where actual costs exceed preventivo by >20% (only for gestione_costi users)
4. **Attivita' critiche:** overdue mandatory activities across all events

### 6.4 Email Template

Simple HTML email — no external CSS, inline styles only (for email client compatibility).

```
Subject: [Mikai Eventi] Riepilogo giornaliero — {date}

Body:
┌────────────────────────────────────────────┐
│  MIKAI EVENTI                              │
│  Riepilogo del {data}                      │
├────────────────────────────────────────────┤
│                                            │
│  DA APPROVARE (2)                          │
│  ● Workshop Torino — proposto da Marco     │
│  ● Preventivo Meier — Congresso Roma       │
│                                            │
│  IN SCADENZA OGGI (1)                      │
│  ● Preparare locandina — Workshop Torino   │
│                                            │
│  IN RITARDO (3)                            │
│  ● Conferma hotel — Corso Milano (-2gg)    │
│  ● Spedizione materiale — Live Surgery (-1)│
│  ● Packing list — Cadaver Lab Padova (-4)  │
│                                            │
│  EVENTI OGGI                               │
│  ● Congresso SIOT Roma (9:00-17:00)        │
│                                            │
├────────────────────────────────────────────┤
│  Apri Mikai Eventi: https://...            │
│  Per non ricevere piu' queste email,       │
│  modifica le preferenze nelle Impostazioni │
└────────────────────────────────────────────┘
```

### 6.5 Email Sending

Use Supabase's built-in email via `supabase.auth.admin` or a simple SMTP integration via Edge Function.

**Option A (recommended for MVP):** Use Supabase's Resend integration (free tier: 100 emails/day — sufficient for ~15 users).

**Option B (fallback):** Use `pg_net` to call an external SMTP API (Mailgun, SendGrid free tier).

### 6.6 Unsubscribe

- Each email footer links to `/impostazioni` (or a dedicated `/notifiche/preferenze` page)
- Users can toggle `email_daily` and `email_weekly` independently
- Users can mute specific notification types from email (still receive in-app)
- The preference UI is a simple form in the notification preferences section

---

## 7. Feature 4 — Escalation Rules

### 7.1 Escalation Logic

Escalation is handled by the `deadline-checker` Edge Function (same cron, extended logic).

| Condition | Action | Recipient |
|---|---|---|
| Activity overdue by 3+ days, assigned to a user | Create `escalation` notification | Users with next-level permission (see chain below) |
| Activity overdue by 3+ days, unassigned | Create `escalation` notification | All users with the activity's `permesso_responsabile` + their managers |
| Approval pending 48+ hours (event) | Re-send `approvazione_richiesta` + create `escalation` | Original approvers + direzione |
| Approval pending 48+ hours (preventivo) | Re-send `approvazione_richiesta` + create `escalation` | Original approvers + direzione |

### 7.2 Escalation Chain (Permission-Based)

The escalation chain maps each permission to its manager-level permission. This reflects the company hierarchy without hardcoding people.

```js
// In Edge Function config (not in frontend constants — server-side only)
const ESCALATION_CHAIN = {
  // If assignee has this permission → escalate to users with the escalated permission
  'gestione_spedizioni':       'gestione_magazzino',     // Ivan's tasks → magazzino manager
  'gestione_magazzino':        'approva_eventi',         // magazzino → direzione/AM
  'gestione_marketing':        'approva_eventi',         // marketing → direzione/AM
  'gestione_organizzazione':   'approva_eventi',         // organizzazione → direzione/AM
  'richiedi_materiale':        'gestione_magazzino',     // commerciale → magazzino
  'gestione_logistica':        'gestione_organizzazione', // logistica → organizzazione
  'gestione_costi':            'approva_preventivi',     // costi → approver
  'approva_eventi':            null,                     // direzione — top of chain, no further escalation
  'approva_preventivi':        null,                     // top of chain
}
```

### 7.3 Escalation Notification Content

```
Titolo: "Escalation: {descrizione} in ritardo da {N} giorni"
Messaggio: "L'attivita' '{descrizione}' per l'evento '{evento_titolo}' e' in ritardo da {N} giorni.
Assegnata a: {nome_assegnato || 'nessuno'}. Permesso responsabile: {permesso_responsabile}."
Link: /eventi/{event_id}
```

### 7.4 Escalation Deduplication

- Escalation notifications use `gruppo`: `escalation_{entity_id}_{escalation_level}_{week_number}`
- This means one escalation per entity per level per week — avoids daily spam
- If the activity is completed, no more escalations (the cron skips completed activities)

### 7.5 Configurable Escalation Parameters

Stored as Supabase Edge Function environment variables (not in DB — these rarely change):

```
ESCALATION_OVERDUE_DAYS=3       # days overdue before escalating
APPROVAL_PENDING_HOURS=48       # hours before re-notifying approvers
ESCALATION_RENOTIFY_DAYS=7      # days between repeated escalation notifications
```

---

## 8. Component APIs — Summary

### New Files

| File | Type | Purpose |
|------|------|---------|
| `src/hooks/useNotifications.js` | Store | Notification state, realtime, preferences |
| `src/components/ui/NotificationBell.jsx` | Component | Bell icon + badge + dropdown |
| `src/components/ui/NotificationDropdown.jsx` | Component | Dropdown panel with recent notifications |
| `src/components/ui/NotificationCard.jsx` | Component | Single notification row (reused in dropdown + page) |
| `src/pages/notifiche/NotifichePage.jsx` | Page | Full notification list with filters |
| `supabase/functions/deadline-checker/index.ts` | Edge Function | Daily deadline + escalation check |
| `supabase/functions/overdue-returns-checker/index.ts` | Edge Function | Daily overdue returns check |
| `supabase/functions/email-digest/index.ts` | Edge Function | Daily + weekly email digest |
| `supabase/migrations/XXXX_notifications.sql` | Migration | Tables + triggers |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/constants.js` | Add `TIPO_NOTIFICA`, `TIPO_NOTIFICA_COLORE` |
| `src/lib/icons.js` | Add `NOTIFICA_ICONS` map, import `BellRing`, `BellDot`, `BellOff`, `Megaphone` |
| `src/components/layout/Sidebar.jsx` | Add `<NotificationBell />` in header |
| `src/components/layout/AppShell.jsx` | Initialize realtime subscription + add bell icon in mobile layout (globally, next to MobileHeader) |
| `src/App.jsx` | Replace `<ComingSoon>` with `<NotifichePage>` |
| `src/hooks/useMaterials.js` | Add notification creation in `checkConflict` |

---

## 9. Notification Templates — Complete Catalog

### 9.1 All notification text templates (Italian)

| Tipo | Titolo | Messaggio | Link Label |
|------|--------|-----------|------------|
| `approvazione_richiesta` (event) | "Nuovo evento da approvare: {titolo}" | "Proposto da {nome} {cognome}" | "Rivedi evento" |
| `approvazione_richiesta` (preventivo) | "Preventivo da approvare: {fornitore}" | "{evento_titolo} — {importo} EUR" | "Rivedi preventivo" |
| `approvazione_completata` (approved) | "Evento approvato: {titolo}" | null | "Vai all'evento" |
| `approvazione_completata` (rejected) | "Evento rifiutato: {titolo}" | "Motivo: {motivo}" | "Vai all'evento" |
| `attivita_scaduta` | "In ritardo: {descrizione}" | "Evento: {evento_titolo} — scaduta da {N} giorni" | "Vai all'evento" |
| `attivita_in_scadenza` (3 days) | "Scadenza tra 3 giorni: {descrizione}" | "Evento: {evento_titolo}" | "Vai all'evento" |
| `attivita_in_scadenza` (1 day) | "Scadenza domani: {descrizione}" | "Evento: {evento_titolo}" | "Vai all'evento" |
| `attivita_assegnata` | "Nuova attivita' assegnata: {descrizione}" | "Evento: {evento_titolo}" | "Vai all'evento" |
| `conflitto_materiale` | "Conflitto materiale: {material_nome}" | "Gia' assegnato a: {eventi_in_conflitto}" | "Vai al materiale" |
| `rientro_scaduto` | "Rientro scaduto: {material_nome}" | "Da: {evento_titolo} — previsto il {data_rientro}" | "Vai al materiale" |
| `preventivo_stato` (approved) | "Preventivo approvato: {fornitore}" | "Evento: {evento_titolo}" | "Vai ai costi" |
| `preventivo_stato` (rejected) | "Preventivo rifiutato: {fornitore}" | "Evento: {evento_titolo} — {nota}" | "Vai ai costi" |
| `preventivo_stato` (revision) | "Preventivo in revisione: {fornitore}" | "Evento: {evento_titolo} — {nota}" | "Vai ai costi" |
| `evento_stato_cambiato` | "Evento {titolo} → {nuovo_stato}" | null | "Vai all'evento" |
| `escalation` | "Escalation: {descrizione} in ritardo da {N}gg" | "Evento: {evento_titolo}. Assegnata a: {assegnato}" | "Vai all'evento" |

---

## 10. Migration Plan

### Migration: `YYYYMMDDHHMMSS_notifications_system.sql`

Single migration containing:
1. `notifications` table + indexes + RLS
2. `notification_preferences` table + RLS
3. Trigger function: `notify_event_state_change` + trigger on `events`
4. Trigger function: `notify_activity_assigned` + trigger on `event_activities`
5. Trigger function: `notify_preventivo_state_change` + triggers on `event_preventivi`
6. Realtime publication: `ALTER PUBLICATION supabase_realtime ADD TABLE notifications;`

### Separate deployment: Edge Functions

Edge Functions are deployed separately via Supabase CLI:
```bash
npx supabase functions deploy deadline-checker
npx supabase functions deploy overdue-returns-checker
npx supabase functions deploy email-digest
```

### pg_cron schedules (run manually in SQL editor after deployment)

```sql
-- Daily deadline check at 07:00 UTC
SELECT cron.schedule('deadline-checker-daily', '0 7 * * *', ...);
-- Daily overdue returns at 07:00 UTC
SELECT cron.schedule('overdue-returns-daily', '0 7 * * *', ...);
-- Daily email digest at 07:00 UTC weekdays
SELECT cron.schedule('email-digest-daily', '0 7 * * 1-5', ...);
-- Weekly email digest at 07:00 UTC Monday
SELECT cron.schedule('email-digest-weekly', '0 7 * * 1', ...);
```

---

## 11. Edge Cases & Error Handling

### 11.1 Notification volume control
- **Max 100 unread notifications per user.** When inserting the 101st, the oldest unread is auto-marked as read (handled by trigger or Edge Function).
- **Cleanup cron:** Delete notifications older than 90 days. Schedule: weekly Sunday 03:00 UTC.

```sql
SELECT cron.schedule('notification-cleanup', '0 3 * * 0',
  $$DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days'$$
);
```

### 11.2 Deduplication
- The `gruppo` column prevents duplicate notifications for the same event within the same logical batch.
- DB triggers check: `NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND created_at > NOW() - INTERVAL '1 hour')` before inserting.

### 11.3 Deleted entities
- If an event is deleted, `ON DELETE CASCADE` on `notifications.entity_id` would remove related notifications. However, events are never deleted in this app (they are cancelled). So `entity_id` is a plain UUID without FK constraint — notifications survive entity state changes.
- If a user navigates to a `link` for a deleted entity, the target page shows its normal "not found" state. The notification is still marked as read on click.

### 11.4 User deactivation
- When a user is deactivated, their notifications remain (for audit). But the `notifications_user_unread` index ensures they don't affect performance.
- Deactivated users don't receive new notifications (the trigger checks `users.attivo = true` before inserting).

### 11.5 Realtime connection loss
- If the WebSocket disconnects, the client falls back to polling `fetchUnreadCount` every 60 seconds.
- On reconnect, the client re-fetches the full notification list to catch up.

### 11.6 Race conditions
- Two simultaneous event state changes could create duplicate notifications. The `gruppo` + dedup check handles this.
- The dedup window is 1 hour — if the same event changes state twice in 1 hour, only the first notification is created for each `gruppo`.

### 11.7 Performance
- The `notifications` table could grow large. The `idx_notifications_user_unread` partial index ensures unread count queries are fast.
- The 90-day cleanup cron keeps the table manageable.
- Realtime subscription is per-user (filtered by `user_id`), so each client only receives their own notifications.

---

## 12. UX Mockup Descriptions

### 12.1 Bell Icon (Sidebar — Desktop)

```
┌─────────────────────────────────┐
│  Mikai Eventi            🔔 3  │  ← Bell with red badge "3"
├─────────────────────────────────┤
│  🔍 Cerca...          Ctrl+K   │
├─────────────────────────────────┤
│  📊 Riepilogo                  │
│  📅 Eventi                     │
│  ...                           │
```

When bell is clicked, dropdown appears:

```
┌─────────────────────────────────┐
│  Notifiche    Segna tutte lette │
├─────────────────────────────────┤
│  ● Nuovo evento da approvare:  │  ← Blue dot = unread
│    Workshop Torino              │
│    3 minuti fa                  │
├─────────────────────────────────┤
│  ● Scadenza domani: Locandina  │
│    Evento: Congresso SIOT       │
│    2 ore fa                     │
├─────────────────────────────────┤
│    Preventivo approvato: Meier  │  ← No dot = read
│    Corso Milano                 │
│    ieri                         │
├─────────────────────────────────┤
│    Vedi tutte le notifiche →    │
└─────────────────────────────────┘
```

### 12.2 Bell Icon (MobileHeader)

```
┌────────────────────────────────────────┐
│  ← Eventi                    🔔 3     │
└────────────────────────────────────────┘
```

Tapping the bell navigates to `/notifiche` (no dropdown on mobile — full page always).

### 12.3 Notification Page (`/notifiche`)

```
┌────────────────────────────────────────────────────┐
│  Notifiche                    [Segna tutte lette]  │
│                                                    │
│  Tipo: [Tutte ▾]  Stato: [Non lette ▾]            │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🔵│ ⏰ Nuovo evento da approvare:            │  │
│  │   │    Workshop Torino                       │  │
│  │   │    Proposto da Marco Rossi               │  │
│  │   │    3 minuti fa            [Rivedi evento] │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🔵│ ⚠️ Scadenza domani: Preparare locandina  │  │
│  │   │    Evento: Congresso SIOT                │  │
│  │   │    2 ore fa              [Vai all'evento] │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │   │ ✅ Preventivo approvato: Meier           │  │  ← gray bg = read
│  │   │    Evento: Corso Milano                  │  │
│  │   │    ieri                   [Vai ai costi]  │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│           Carica altre notifiche...                │
└────────────────────────────────────────────────────┘
```

### 12.4 Notification Card Component

```
┌─────────────────────────────────────────────────┐
│  [TypeIcon]  Titolo della notifica              │
│  ●           Messaggio descrittivo opzionale    │
│              che puo' andare su due righe max   │
│                                                 │
│              3 minuti fa         [Link Label →] │
└─────────────────────────────────────────────────┘
```

- Left edge: 3px blue/mikai border for unread, no border for read
- TypeIcon: colored per `TIPO_NOTIFICA_COLORE`
- Blue dot (●) next to icon for unread
- Time: relative ("3 min fa", "2 ore fa", "ieri", "3 giorni fa", then full date)
- Link Label: text button, navigates and marks as read

### 12.5 Notification Preferences (in /impostazioni or dedicated section)

```
┌────────────────────────────────────────────────┐
│  Preferenze Notifiche                          │
│                                                │
│  Email giornaliera (lun-ven alle 8:00)         │
│  [═══════●] Attiva                             │
│                                                │
│  Email settimanale (lunedi' alle 8:00)         │
│  [═══════●] Attiva                             │
│                                                │
│  Silenzia per email (le notifiche in-app       │
│  restano attive):                              │
│  [ ] Attivita' in scadenza                     │
│  [ ] Cambio stato evento                       │
│  [ ] Rientri materiale                         │
│                                                │
│  [Salva preferenze]                            │
└────────────────────────────────────────────────┘
```

---

## 13. Relative Time Formatting

Add to `src/lib/date-utils.js`:

```js
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

export function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()

  // Less than 1 minute
  if (diffMs < 60_000) return 'adesso'

  // Use date-fns for "3 minuti fa", "2 ore fa", etc.
  return formatDistanceToNow(date, { addSuffix: true, locale: it })
}
```

---

## 14. Implementation Order

### Step 1: Database (1 migration)
- Create `notifications` table + indexes + RLS
- Create `notification_preferences` table + RLS
- Enable Realtime on `notifications`
- Create trigger functions + triggers (event state, activity assigned, preventivo state)

### Step 2: Frontend Core
- Add constants (`TIPO_NOTIFICA`, `TIPO_NOTIFICA_COLORE`)
- Add icons (`NOTIFICA_ICONS`)
- Add `formatRelativeTime` to date-utils
- Create `useNotifications.js` store
- Create `NotificationCard.jsx` component
- Create `NotificationDropdown.jsx` component
- Create `NotificationBell.jsx` component

### Step 3: UI Integration
- Modify `Sidebar.jsx` — add bell in header
- Modify `AppShell.jsx` — initialize realtime subscription + add bell icon in mobile layout (globally, next to MobileHeader)
- Create `NotifichePage.jsx` — full notification list
- Update `App.jsx` — replace ComingSoon with NotifichePage

### Step 4: Material Conflict Notification
- Modify `useMaterials.js` — create notification on conflict detection

### Step 5: Edge Functions
- `deadline-checker` — daily deadline + escalation check
- `overdue-returns-checker` — daily overdue returns
- `email-digest` — daily + weekly email

### Step 6: Cron Schedules
- Configure pg_cron for all Edge Functions
- Configure cleanup cron (90-day retention)

### Step 7: Notification Preferences UI
- Add preferences form (in /impostazioni or dedicated page)
- Wire to `useNotifications.updatePreferences`

---

## 15. Testing Checklist

- [ ] Create event as commerciale → approver receives `approvazione_richiesta`
- [ ] Approve event → promotore receives `approvazione_completata`
- [ ] Reject event → promotore receives `approvazione_completata` (with rifiutato in title)
- [ ] Assign activity to user → user receives `attivita_assegnata`
- [ ] Activity deadline approaches (3 days, 1 day) → assignee receives `attivita_in_scadenza`
- [ ] Activity overdue → assignee + permission holders receive `attivita_scaduta`
- [ ] Activity overdue 3+ days → escalation chain receives `escalation`
- [ ] Material conflict → requester receives `conflitto_materiale`
- [ ] Material return overdue → responsabile + magazzino receive `rientro_scaduto`
- [ ] Create preventivo → approvers receive `approvazione_richiesta`
- [ ] Approve preventivo → creator receives `preventivo_stato`
- [ ] Bell icon shows correct unread count
- [ ] Clicking notification marks as read + navigates
- [ ] "Segna tutte come lette" works
- [ ] Realtime: new notification appears without page refresh
- [ ] Notification page filters work (tipo, read/unread)
- [ ] Notification page infinite scroll loads more
- [ ] Email digest sends correctly (mock/test with single user)
- [ ] User can opt out of email digest
- [ ] Deduplication prevents duplicate notifications
- [ ] 90-day cleanup removes old notifications
- [ ] Approval pending 48+ hours → re-notification + escalation

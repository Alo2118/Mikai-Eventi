# Phase 5B — Notifications & Communication — Implementation Plan

**Data:** 2026-03-24
**Spec:** `docs/superpowers/specs/2026-03-24-phase5b-notifications-design.md`
**Estimated tasks:** 20

---

## Task 1: Database Migration — Tables, Indexes, RLS

**What:** Create the `notifications` and `notification_preferences` tables with indexes, RLS policies, and the CHECK constraint for notification types. Enable Supabase Realtime on the `notifications` table.

**Files to create:**
- `supabase/migrations/20260324120000_notifications_system.sql`

**Code changes:**

```sql
-- Drop legacy notification system (migration 20260315000009_notifications.sql created these with a different schema)
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS template_suggestions CASCADE;
DROP TYPE IF EXISTS notifica_categoria;
DROP TYPE IF EXISTS notifica_canale;

-- 1. notifications table
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,
  titolo        TEXT NOT NULL,
  messaggio     TEXT,
  link          TEXT,
  link_label    TEXT,
  letta         BOOLEAN NOT NULL DEFAULT false,
  entity_type   TEXT,
  entity_id     UUID,
  gruppo        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CHECK constraint (not ENUM — easier to extend)
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

-- Indexes
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, letta) WHERE letta = false;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role inserts notifications"
  ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users delete own notifications"
  ON notifications FOR DELETE USING (user_id = auth.uid());

-- 2. notification_preferences table
CREATE TABLE notification_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_daily   BOOLEAN NOT NULL DEFAULT true,
  email_weekly  BOOLEAN NOT NULL DEFAULT true,
  mute_types    TEXT[] NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

**Dependencies:** None (first task).

**Verification:**
- Run `source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"`
- Verify migration passes without errors
- In Supabase Dashboard: confirm tables exist, RLS is enabled, Realtime publication includes `notifications`
- Test: manually INSERT a notification row via SQL editor and confirm it appears only when querying as the correct user

---

## Task 2: Database Migration — Trigger Functions & Triggers

**What:** Create the four trigger functions for automatic notification generation: event created, event state change, activity assignment, and preventivo state change. Separate migration from Task 1 to keep each migration focused.

**Files to create:**
- `supabase/migrations/20260324120001_notification_triggers.sql`

**Code changes:**

```sql
-- Trigger 0: notify_event_created
-- Fires AFTER INSERT ON events WHEN stato = 'proposto'
-- Notifies all users with approva_eventi permission
-- Dedup: gruppo = 'event_created_{event_id}', check NOT EXISTS within 1 hour
-- Active user check: only notify users WHERE attivo = true

CREATE OR REPLACE FUNCTION notify_event_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _approver RECORD;
  _gruppo TEXT;
BEGIN
  _gruppo := 'event_created_' || NEW.id;

  FOR _approver IN
    SELECT u.id FROM users u
    JOIN user_permissions up ON up.user_id = u.id
    WHERE up.permission = 'approva_eventi' AND u.attivo = true
  LOOP
    INSERT INTO notifications (user_id, tipo, titolo, messaggio, link, gruppo)
    SELECT _approver.id, 'approvazione_richiesta',
      'Nuovo evento proposto',
      'L''evento "' || NEW.titolo || '" richiede approvazione',
      '/eventi/' || NEW.id,
      _gruppo
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications WHERE gruppo = _gruppo AND created_at > NOW() - INTERVAL '1 hour'
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

-- Trigger 1: notify_event_state_change
-- Fires AFTER UPDATE OF stato ON events
-- Creates notifications for:
--   - promotore (approvazione_completata or evento_stato_cambiato)
--   - event staff (evento_stato_cambiato)
--   - approvers when event is proposed (approvazione_richiesta)
-- Guard: IF OLD.stato = NEW.stato THEN RETURN NEW (no-op on same state)
-- Dedup: gruppo = 'event_state_{event_id}', check NOT EXISTS within 1 hour
-- Active user check: only notify users WHERE attivo = true (in users table)

CREATE OR REPLACE FUNCTION notify_event_state_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ ... $$;

CREATE TRIGGER trg_event_state_change
  AFTER UPDATE OF stato ON events
  FOR EACH ROW EXECUTE FUNCTION notify_event_state_change();

-- Trigger 2: notify_activity_assigned
-- Fires AFTER UPDATE OF assegnato_a ON event_activities
-- Guard: skip if assegnato_a is NULL or unchanged
-- Looks up event titolo for the messaggio field

CREATE OR REPLACE FUNCTION notify_activity_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ ... $$;

CREATE TRIGGER trg_activity_assigned
  AFTER UPDATE OF assegnato_a ON event_activities
  FOR EACH ROW EXECUTE FUNCTION notify_activity_assigned();

-- Trigger 3: notify_preventivo_state_change
-- Fires AFTER UPDATE OF stato ON event_preventivi
-- AND AFTER INSERT ON event_preventivi WHEN stato = 'in_attesa'
-- Notifies:
--   - promotore when preventivo is approved/rejected/in_revisione
--   - all users with approva_preventivi when new preventivo is in_attesa (AND u.attivo = true)
-- Looks up: events.titolo, events.promotore_id, contacts.nome/cognome for fornitore
-- Fornitore name lookup with COALESCE fallback:
--   _fornitore := COALESCE(
--     (SELECT COALESCE(nome, '') || ' ' || COALESCE(cognome, '') FROM contacts WHERE id = NEW.fornitore_id),
--     NEW.fornitore_nome,
--     'fornitore sconosciuto'
--   );

CREATE OR REPLACE FUNCTION notify_preventivo_state_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ ... $$;

CREATE TRIGGER trg_preventivo_state_change
  AFTER UPDATE OF stato ON event_preventivi
  FOR EACH ROW EXECUTE FUNCTION notify_preventivo_state_change();

CREATE TRIGGER trg_preventivo_created
  AFTER INSERT ON event_preventivi
  FOR EACH ROW WHEN (NEW.stato = 'in_attesa')
  EXECUTE FUNCTION notify_preventivo_state_change();
```

**IMPORTANT: `attivo = true` filter on ALL user queries in ALL triggers:**
- Trigger 0 (`notify_event_created`): `WHERE up.permission = 'approva_eventi' AND u.attivo = true` — already shown above
- Trigger 1 (`notify_event_state_change`): when querying `event_staff` for staff notifications, JOIN `users u ON u.id = es.user_id WHERE u.attivo = true`; when querying approvers, `WHERE up.permission = 'approva_eventi' AND u.attivo = true`
- Trigger 2 (`notify_activity_assigned`): when looking up the assignee, verify `SELECT 1 FROM users WHERE id = NEW.assegnato_a AND attivo = true` before inserting
- Trigger 3 (`notify_preventivo_state_change`): when querying approvers with `approva_preventivi`, `WHERE up.permission = 'approva_preventivi' AND u.attivo = true`; when notifying promotore, verify `SELECT attivo FROM users WHERE id = _promotore_id` is true

Full SQL for each function: copy verbatim from spec sections 5.2 (Triggers 0-3), adding dedup check before each INSERT:

```sql
-- Dedup pattern — EVERY INSERT in EVERY trigger must be wrapped with this check:
-- Either as a WHERE NOT EXISTS subquery (as shown in Trigger 0 above):
INSERT INTO notifications (...) SELECT ...
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE gruppo = _gruppo AND created_at > NOW() - INTERVAL '1 hour');

-- Or as an IF block:
IF NOT EXISTS (
  SELECT 1 FROM notifications
  WHERE gruppo = _gruppo AND created_at > NOW() - INTERVAL '1 hour'
) THEN
  INSERT INTO notifications (...) VALUES (...);
END IF;

-- This applies to ALL four triggers (0, 1, 2, 3). No INSERT without dedup.
```

**Dependencies:** Task 1 (tables must exist).

**Verification:**
- Push migration
- In Supabase SQL editor: update an event's stato from 'proposto' to 'confermato'
- Query `SELECT * FROM notifications` and confirm a row was created for the promotore
- Assign an activity to a user, confirm `attivita_assegnata` notification appears
- Create a preventivo with stato='in_attesa', confirm approvers get notified

---

## Task 3: Add Constants — TIPO_NOTIFICA & TIPO_NOTIFICA_COLORE

**What:** Add notification type labels and color mappings to the constants file.

**Files to modify:**
- `src/lib/constants.js`

**Code changes:** Add at the end of the file (before any closing comments):

```js
// Tipo notifica
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

**Dependencies:** None.

**Verification:** `npm run build` succeeds. Constants are importable from other files.

---

## Task 4: Add Icons — NOTIFICA_ICONS

**What:** Add notification-specific icon imports and the `NOTIFICA_ICONS` map to the centralized icon registry.

**Files to modify:**
- `src/lib/icons.js`

**Code changes:**

1. Add to the lucide-react import block:
```js
import { BellRing, BellDot, BellOff, Megaphone } from 'lucide-react'
```

2. Add new icon map after the existing `COSTI_ICONS`:
```js
export const NOTIFICA_ICONS = {
  approvazione_richiesta:   Clock,
  approvazione_completata:  CheckCircle,
  attivita_scaduta:         Timer,
  attivita_in_scadenza:     AlertTriangle,
  attivita_assegnata:       UserCheck,
  conflitto_materiale:      AlertTriangle,
  rientro_scaduto:          RotateCcw,
  preventivo_stato:         FileText,
  evento_stato_cambiato:    Calendar,
  escalation:               Megaphone,
  bell_ring:                BellRing,
  bell_dot:                 BellDot,
  bell_off:                 BellOff,
}
```

**Dependencies:** None.

**Verification:** `npm run build` succeeds. No unused import warnings.

---

## Task 5: Add formatRelativeTime to date-utils

**What:** Add a relative time formatting function for notification timestamps ("3 minuti fa", "2 ore fa", "ieri").

**Files to modify:**
- `src/lib/date-utils.js`

**Code changes:**

Add import at top:
```js
import { formatDistanceToNow } from 'date-fns'
```

Add function:
```js
export function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()

  // Less than 1 minute
  if (diffMs < 60_000) return 'adesso'

  return formatDistanceToNow(date, { addSuffix: true, locale: it })
}
```

Note: `it` locale and `date-fns` are already imported in this file. Verify `formatDistanceToNow` is available in date-fns v4.x (it is — stable API).

**Dependencies:** None.

**Verification:** `npm run build` succeeds. Manually test in browser console: `formatRelativeTime(new Date(Date.now() - 180000).toISOString())` should return "3 minuti fa".

---

## Task 6: Create useNotifications Zustand Store

**What:** Create the notification state management store with fetch, mark-as-read, realtime subscription, and preferences management.

**Files to create:**
- `src/hooks/useNotifications.js`

**Code changes — store shape:**

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useNotificationsStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  preferences: null,

  // Actions
  fetchNotifications: async (limit = 50, offset = 0) => { ... },
  // Query: supabase.from('notifications').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  // If offset === 0: replace notifications array; else append

  fetchUnreadCount: async () => { ... },
  // Query: supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('letta', false)
  // Updates: set({ unreadCount: count || 0 })

  markAsRead: async (id) => { ... },
  // Query: supabase.from('notifications').update({ letta: true }).eq('id', id)
  // Optimistic update: map notification, decrement unreadCount

  markAllAsRead: async () => { ... },
  // Query: supabase.from('notifications').update({ letta: true }).eq('letta', false)
  // Updates: map all to letta: true, set unreadCount to 0

  subscribeRealtime: (userId) => { ... },
  // Channel: supabase.channel(`notifications:${userId}`)
  // Listen: postgres_changes, INSERT, table: notifications, filter: user_id=eq.${userId}
  // On new: prepend to notifications array, increment unreadCount
  // Returns: channel reference (for cleanup)

  fetchPreferences: async () => { ... },
  // Query: supabase.from('notification_preferences').select('*').single()

  updatePreferences: async (updates) => { ... },
  // Upsert pattern: if preferences is null, INSERT with user_id; else UPDATE by id
}))
```

Full implementation follows the spec section 4.3 verbatim.

**Dependencies:** Task 1 (tables must exist for queries to work).

**Verification:** `npm run build` succeeds. In browser devtools, after login: `useNotificationsStore.getState().fetchUnreadCount()` returns `{ count: 0, error: null }`.

---

## Task 7: Create NotificationCard Component

**What:** Reusable notification card component used in both the dropdown and the full page. Renders: type icon (colored), title (bold if unread), message (truncated), relative time, link button.

**Files to create:**
- `src/components/ui/NotificationCard.jsx`

**Code changes — component signature:**

```jsx
export function NotificationCard({ notification, compact = false, onNavigate }) {
  // notification: { id, tipo, titolo, messaggio, link, link_label, letta, created_at }
  // compact: true for dropdown (smaller padding, single-line message)
  // onNavigate: callback after marking as read and navigating

  // Uses:
  // - NOTIFICA_ICONS[notification.tipo] for the icon
  // - TIPO_NOTIFICA_COLORE[notification.tipo] for icon color
  // - formatRelativeTime(notification.created_at) for time display
  // - useNavigate() for link navigation
  // - useNotificationsStore(s => s.markAsRead) for click handler

  // Layout:
  // - Left border: 3px mikai-400 if !letta, none if letta
  // - Background: bg-white if !letta, bg-gray-50 if letta
  // - Icon with colored background circle (matching TIPO_NOTIFICA_COLORE)
  // - Blue dot indicator for unread (small circle next to icon)
  // - Titolo: font-semibold if !letta
  // - Messaggio: text-sm text-gray-500, line-clamp-2 (or line-clamp-1 if compact)
  // - Footer row: relative time (left) + link_label button (right)
  // - Click on entire card: markAsRead + navigate to link
  // - min-h-[48px] on clickable area

  return (
    <div
      className={`...`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      ...
    </div>
  )
}
```

**Dependencies:** Tasks 3, 4, 5, 6.

**Verification:** `npm run build` succeeds. Component renders correctly with mock data in isolation.

---

## Task 8: Create NotificationDropdown Component

**What:** Desktop-only dropdown panel showing the last 10 notifications, with "Segna tutte come lette" header action and "Vedi tutte" footer link.

**Files to create:**
- `src/components/ui/NotificationDropdown.jsx`

**Code changes — component signature:**

```jsx
export function NotificationDropdown({ open, onClose }) {
  // Props:
  //   open: boolean
  //   onClose: () => void (called on outside click, Escape key, or navigation)

  // State:
  //   Uses useNotificationsStore selectors: notifications, unreadCount, markAllAsRead, fetchNotifications
  //   On open: fetchNotifications(10, 0) to get latest 10

  // Layout:
  //   - Positioned absolute, below bell icon, right-aligned
  //   - w-[340px] max-h-[480px] overflow-y-auto
  //   - Header: "Notifiche" title + "Segna tutte come lette" text button (only if unreadCount > 0)
  //   - List: up to 10 NotificationCard components with compact={true}
  //   - Empty state: "Nessuna notifica" with BellOff icon (from NOTIFICA_ICONS.bell_off)
  //   - Footer: "Vedi tutte le notifiche" NavLink to /notifiche

  // Behavior:
  //   - useEffect: add event listener for Escape key → onClose
  //   - useEffect: add click-outside listener → onClose
  //   - Focus trap: first focusable element gets focus on open
  //   - Clicking a NotificationCard: onClose() after navigation

  // Accessibility:
  //   - role="menu" on the dropdown container
  //   - aria-label="Notifiche recenti"

  return open ? (
    <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-xl border border-gray-200 shadow-xl z-50 ...">
      {/* Header */}
      {/* Notification list */}
      {/* Footer */}
    </div>
  ) : null
}
```

**Dependencies:** Task 7 (NotificationCard).

**Verification:** `npm run build` succeeds. Renders correctly when passed `open={true}` with mock data.

---

## Task 9: Create NotificationBell Component

**What:** Bell icon button with unread count badge. On desktop: toggles dropdown. On mobile: navigates to /notifiche.

**Files to create:**
- `src/components/ui/NotificationBell.jsx`

**Code changes — component signature:**

```jsx
export function NotificationBell() {
  // State:
  //   const unreadCount = useNotificationsStore(s => s.unreadCount)
  //   const [dropdownOpen, setDropdownOpen] = useState(false)

  // Desktop vs mobile detection:
  //   Use a ref + media query check, or simply render dropdown conditionally
  //   On mobile (md:hidden), use useNavigate to go to /notifiche onClick
  //   On desktop (hidden md:block), toggle dropdown

  // Badge rendering:
  //   - If unreadCount === 0: no badge
  //   - If unreadCount <= 99: show number
  //   - If unreadCount > 99: show "99+"
  //   - Badge: absolute positioned top-right of bell icon
  //     bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1

  // Container: relative (for dropdown positioning)
  // Bell button: min-h-[48px] min-w-[48px]
  //   aria-label={`Notifiche, ${unreadCount} non lette`}
  //   aria-live="polite" on the badge span

  return (
    <div className="relative">
      {/* Mobile: link to /notifiche */}
      <button className="md:hidden ..." onClick={() => navigate('/notifiche')} aria-label={...}>
        <Icon icon={NAV_ICONS.notifiche} size={24} />
        {unreadCount > 0 && <span className="...">{badgeText}</span>}
      </button>

      {/* Desktop: toggle dropdown */}
      <button className="hidden md:flex ..." onClick={() => setDropdownOpen(!dropdownOpen)} aria-label={...}>
        <Icon icon={NAV_ICONS.notifiche} size={24} />
        {unreadCount > 0 && <span className="...">{badgeText}</span>}
      </button>

      {/* Desktop dropdown */}
      <NotificationDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </div>
  )
}
```

**Dependencies:** Tasks 6, 8.

**Verification:** `npm run build` succeeds. Bell renders with badge. Clicking toggles dropdown on desktop.

---

## Task 10: Integrate Bell into Sidebar + BottomBar Badge

**What:** Add the NotificationBell component to the Sidebar header, next to "Mikai Eventi". Also add an unread count badge to the BottomBar's notifiche link for mobile users.

**Files to modify:**
- `src/components/layout/Sidebar.jsx`

**Code changes:**

1. Add import:
```js
import { NotificationBell } from '../ui/NotificationBell'
```

2. Replace the header div:
```jsx
// Before:
<div className="p-5 border-b border-gray-200">
  <h1 className="text-xl font-bold text-mikai-400">Mikai Eventi</h1>
</div>

// After:
<div className="p-5 border-b border-gray-200 flex items-center justify-between">
  <h1 className="text-xl font-bold text-mikai-400">Mikai Eventi</h1>
  <NotificationBell />
</div>
```

3. **Also add an unread count badge to BottomBar's notifiche link** for mobile users:

In `src/components/layout/BottomBar.jsx`:
```js
import { useNotificationsStore } from '../../hooks/useNotifications'
```
In the notifiche nav item rendering, add a badge similar to the bell:
```jsx
// Inside the notifiche BottomBar link:
const unreadCount = useNotificationsStore(s => s.unreadCount)
// Render a small red badge (absolute positioned) on the notifiche icon if unreadCount > 0
{unreadCount > 0 && (
  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
    {unreadCount > 99 ? '99+' : unreadCount}
  </span>
)}
```

**Dependencies:** Task 9.

**Verification:** `npm run build` succeeds. On desktop, the bell icon appears to the right of "Mikai Eventi" in the sidebar. Clicking it opens the dropdown. Unread count badge displays correctly. On mobile, the BottomBar notifiche link shows an unread count badge.

---

## Task 11: Integrate Bell into Mobile Layout via AppShell

**What:** Add a fixed-position NotificationBell in the mobile layout. Do NOT modify MobileHeader.jsx — the spec explicitly says: "Do NOT modify MobileHeader.jsx with a per-page showBell prop — that approach is fragile." Instead, add the bell once in AppShell.jsx, visible only on mobile.

**Files to modify:**
- `src/components/layout/AppShell.jsx`

**Code changes:**

1. Add import (if not already present from Task 12):
```js
import { NotificationBell } from '../ui/NotificationBell'
```

2. Add a fixed-position bell in the mobile layout, inside the AppShell return:
```jsx
return (
  <div className="flex min-h-screen bg-gray-50">
    <Sidebar />
    <main className="flex-1 pb-20 md:pb-0">
      <Outlet />
    </main>
    <BottomBar />

    {/* Mobile notification bell — fixed top-right, hidden on desktop (Sidebar has its own bell) */}
    <div className="fixed top-3 right-3 z-40 md:hidden">
      <NotificationBell />
    </div>

    <ToastContainer />
    <GlobalSearch />
  </div>
)
```

3. The bell is positioned in the top-right corner of the mobile viewport with `fixed top-3 right-3 z-40 md:hidden`. It uses the same `NotificationBell` component from Task 9, which already handles mobile behavior (navigates to /notifiche on tap).

**Dependencies:** Task 9.

**Verification:** `npm run build` succeeds. On mobile viewport, a bell icon with unread badge appears in the top-right corner on every page. Tapping navigates to /notifiche. On desktop (`md:+`), the mobile bell is hidden (Sidebar has its own bell from Task 10).

---

## Task 12: Initialize Realtime Subscription in AppShell

**What:** Set up the Supabase Realtime subscription for notifications when the user is authenticated, and clean up on unmount/logout. Also fetch initial unread count. Add polling fallback for connection loss.

**Files to modify:**
- `src/components/layout/AppShell.jsx`

**Code changes:**

```jsx
import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../hooks/useAuth'
import { useNotificationsStore } from '../../hooks/useNotifications'
import { supabase } from '../../lib/supabase'

export function AppShell() {
  const profile = useAuthStore(s => s.profile)
  const fetchUnreadCount = useNotificationsStore(s => s.fetchUnreadCount)
  const subscribeRealtime = useNotificationsStore(s => s.subscribeRealtime)
  const channelRef = useRef(null)

  useEffect(() => {
    const userId = profile?.id
    if (!userId) return

    // Initial unread count
    fetchUnreadCount()

    // Realtime subscription
    const channel = subscribeRealtime(userId)
    channelRef.current = channel

    // Polling fallback: every 60s re-fetch unread count
    // (handles WebSocket disconnects gracefully)
    const pollInterval = setInterval(() => {
      fetchUnreadCount()
    }, 60_000)

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      clearInterval(pollInterval)
    }
  }, [profile?.id, fetchUnreadCount, subscribeRealtime])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <BottomBar />
      <ToastContainer />
      <GlobalSearch />
    </div>
  )
}
```

**Dependencies:** Task 6 (store), Task 1 (Realtime enabled on table).

**Verification:**
- `npm run build` succeeds
- Login to the app; open browser Network tab > WS: confirm a Realtime WebSocket channel is subscribed
- Insert a notification for the logged-in user via Supabase SQL editor; confirm the unread count badge updates within seconds without page refresh
- Navigate away and back: subscription persists
- Logout: subscription is cleaned up (no WS messages after logout)

---

## Task 13: Create NotifichePage — Full Notification List

**What:** Replace the `<ComingSoon>` placeholder at `/notifiche` with a full notification list page including filters, infinite scroll, and "segna tutte come lette" action.

**Files to create:**
- `src/pages/notifiche/NotifichePage.jsx`

**Code changes — component structure:**

```jsx
import { useEffect, useState, useCallback } from 'react'
import { useNotificationsStore } from '../../hooks/useNotifications'
import { PageHeader } from '../../components/ui/PageHeader'
import { NotificationCard } from '../../components/ui/NotificationCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { Button } from '../../components/ui/Button'
import { TIPO_NOTIFICA } from '../../lib/constants'
import { NOTIFICA_ICONS } from '../../lib/icons'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'

export function NotifichePage() {
  // State:
  const notifications = useNotificationsStore(s => s.notifications)
  const unreadCount = useNotificationsStore(s => s.unreadCount)
  const loading = useNotificationsStore(s => s.loading)
  const fetchNotifications = useNotificationsStore(s => s.fetchNotifications)
  const markAllAsRead = useNotificationsStore(s => s.markAllAsRead)

  // Local filter state:
  const [filterTipo, setFilterTipo] = useState('')
  const [filterStato, setFilterStato] = useState('') // '' | 'non_lette' | 'lette'
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  // Initial fetch
  useEffect(() => { fetchNotifications(PAGE_SIZE, 0) }, [])

  // Load more (infinite scroll)
  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchNotifications(PAGE_SIZE, nextPage * PAGE_SIZE)
  }, [page, fetchNotifications])

  // Filter notifications client-side (fetched data is already loaded)
  const filtered = notifications.filter(n => {
    if (filterTipo && n.tipo !== filterTipo) return false
    if (filterStato === 'non_lette' && n.letta) return false
    if (filterStato === 'lette' && !n.letta) return false
    return true
  })

  // Layout:
  // - Breadcrumb: [{ label: 'Notifiche' }]
  // - MobileHeader: title="Notifiche"
  // - PageHeader with action button: "Segna tutte come lette" (disabled if unreadCount === 0)
  // - Filter bar: select for Tipo (from TIPO_NOTIFICA) + select for Stato
  // - List: filtered.map(n => <NotificationCard notification={n} />)
  // - Empty state: "Tutto in ordine! Non hai notifiche." with bell_off icon
  // - Load more button at bottom if notifications.length is multiple of PAGE_SIZE

  return (...)
}
```

**Dependencies:** Task 7 (NotificationCard), Task 6 (store).

**Verification:** `npm run build` succeeds. Navigate to /notifiche: shows list of notifications (or empty state if none). Filters work. "Segna tutte come lette" marks all and clears the bell badge.

---

## Task 14: Update App.jsx Routing

**What:** Replace the `<ComingSoon>` route for `/notifiche` with the real `<NotifichePage>` component.

**Files to modify:**
- `src/App.jsx`

**Code changes:**

1. Add import:
```js
import { NotifichePage } from './pages/notifiche/NotifichePage'
```

2. Replace route:
```jsx
// Before:
<Route path="/notifiche" element={<ComingSoon title="Notifiche" description="Le notifiche in tempo reale saranno disponibili nella prossima versione." />} />

// After:
<Route path="/notifiche" element={<NotifichePage />} />
```

3. If `ComingSoon` is no longer imported elsewhere, remove the import. Check with grep first.

**Dependencies:** Task 13.

**Verification:** `npm run build` succeeds. Navigate to /notifiche: renders the real NotifichePage, not the ComingSoon placeholder.

---

## Task 15: Material Conflict Notification (Frontend-Side Insert)

**What:** When a material conflict is detected in `useMaterials.checkConflict`, create a notification for the requesting user. This is a pragmatic choice because conflict detection already happens client-side.

**Files to modify:**
- `src/hooks/useMaterials.js`

**Code changes:**

In `checkConflict` function, after the conflict query returns results:

```js
checkConflict: async (materialId, startDate, endDate, excludeRequestId) => {
  let query = supabase
    .from('event_materials')
    .select('*, event:events(titolo, data_inizio, data_fine)')
    .eq('material_id', materialId)
    .neq('stato', 'rifiutato')
  // ... existing filter logic ...

  const { data, error } = await query

  // NEW: Create notification if conflicts found
  if (data && data.length > 0) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const conflictEvents = data.map(c => c.event?.titolo).filter(Boolean).join(', ')
      await supabase.from('notifications').insert({
        user_id: user.id,
        tipo: 'conflitto_materiale',
        titolo: 'Conflitto materiale rilevato',
        messaggio: 'Gia\' assegnato a: ' + conflictEvents,
        link: '/materiale/' + materialId,
        link_label: 'Vai al materiale',
        entity_type: 'material',
        entity_id: materialId,
        gruppo: 'conflict_' + materialId + '_' + new Date().toISOString().slice(0, 10),
      })
    }
  }

  return { data: data || [], error }
},
```

Note: The `gruppo` includes the date to prevent duplicate notifications for the same material on the same day.

**Dependencies:** Task 1 (notifications table must exist).

**Verification:** Request a material that conflicts with another event. Check that a notification appears in the bell/notifications page for the current user.

---

## Prerequisite: Edge Functions Setup

Before starting Tasks 16-18, complete these setup steps:

1. `mkdir -p supabase/functions`
2. Enable `pg_cron` and `pg_net` extensions in Supabase Dashboard > Database > Extensions
3. Run: `npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`
4. Test locally: `npx supabase functions serve`

---

## Task 16: Edge Function — deadline-checker

**What:** Create a Supabase Edge Function that runs daily via pg_cron. Checks all open activities for approaching and overdue deadlines, creates notifications, and handles escalation logic.

**Files to create:**
- `supabase/functions/deadline-checker/index.ts`

**Code changes — function structure:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ESCALATION_OVERDUE_DAYS = parseInt(Deno.env.get('ESCALATION_OVERDUE_DAYS') || '3')
const APPROVAL_PENDING_HOURS = parseInt(Deno.env.get('APPROVAL_PENDING_HOURS') || '48')

const ESCALATION_CHAIN: Record<string, string | null> = {
  'gestione_spedizioni':       'gestione_magazzino',
  'gestione_magazzino':        'approva_eventi',
  'gestione_marketing':        'approva_eventi',
  'gestione_organizzazione':   'approva_eventi',
  'richiedi_materiale':        'gestione_magazzino',
  'gestione_logistica':        'gestione_organizzazione',
  'gestione_costi':            'approva_preventivi',
  'approva_eventi':            null,
  'approva_preventivi':        null,
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // 1. Fetch open activities with deadlines, joined with events
  const { data: activities } = await supabase
    .from('event_activities')
    .select('*, evento:events!event_activities_event_id_fkey(id, titolo, stato)')
    .in('stato', ['da_fare', 'in_corso'])
    .not('deadline', 'is', null)

  // Filter: only active events
  const activeActivities = (activities || []).filter(a =>
    a.evento && !['cancellato', 'rifiutato', 'concluso'].includes(a.evento.stato)
  )

  for (const activity of activeActivities) {
    const deadline = new Date(activity.deadline)
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Approaching deadline (3 days, 1 day)
    if (diffDays === 3 || diffDays === 1) {
      const gruppo = `deadline_${activity.id}_${todayStr}`
      // Dedup check, then INSERT attivita_in_scadenza
      // Recipients: assegnato_a, or all users with permesso_responsabile if unassigned
    }

    // Overdue
    if (diffDays < 0) {
      const gruppo = `overdue_${activity.id}_${todayStr}`
      // Dedup check, then INSERT attivita_scaduta
      // Recipients: assegnato_a + users with permesso_responsabile

      // Escalation (overdue by 3+ days)
      const overdueDays = Math.abs(diffDays)
      if (overdueDays >= ESCALATION_OVERDUE_DAYS) {
        const weekNum = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000))
        const escalationGruppo = `escalation_${activity.id}_1_${weekNum}`
        // Dedup check, then INSERT escalation
        // Recipients: determined by ESCALATION_CHAIN[activity.permesso_responsabile]
      }
    }
  }

  // 2. Check pending approvals (events pending > 48 hours)
  const { data: pendingEvents } = await supabase
    .from('events')
    .select('id, titolo, promotore_id, updated_at')
    .eq('stato', 'proposto')
  // Filter: updated_at older than APPROVAL_PENDING_HOURS
  // For each: re-send approvazione_richiesta + escalation to direzione

  // 3. Check pending preventivi (> 48 hours)
  const { data: pendingPreventivi } = await supabase
    .from('event_preventivi')
    .select('id, event_id, fornitore_id, created_at, evento:events(titolo)')
    .eq('stato', 'in_attesa')
  // Filter: created_at older than APPROVAL_PENDING_HOURS
  // For each: re-send + escalation

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

**Dependencies:** Task 1 (notifications table), Task 2 (trigger patterns for reference).

**Verification:**
- Deploy: `npx supabase functions deploy deadline-checker`
- Test manually: `curl -H "Authorization: Bearer <service_role_key>" https://ncjpbbvlucquopyihios.supabase.co/functions/v1/deadline-checker`
- Create a test activity with deadline = yesterday, confirm `attivita_scaduta` notification is created
- Create a test activity with deadline = 3 days from now, confirm `attivita_in_scadenza` is created

---

## Task 17: Edge Function — overdue-returns-checker

**What:** Create a Supabase Edge Function that runs daily. Checks for overdue material returns (movements with past due return dates where material is still not in warehouse).

**Files to create:**
- `supabase/functions/overdue-returns-checker/index.ts`

**Code changes — function structure:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const todayStr = new Date().toISOString().slice(0, 10)

  // 1. Query overdue movements
  // material_movements WHERE tipo = 'uscita' AND data_rientro_prevista < NOW()
  // JOIN materials WHERE posizione_attuale != 'in_magazzino'
  const { data: movements } = await supabase
    .from('material_movements')
    .select('*, material:materials!material_movements_material_id_fkey(id, nome, posizione_attuale)')
    .eq('tipo', 'uscita')
    .lt('data_rientro_prevista', todayStr)

  const overdue = (movements || []).filter(m =>
    m.material && m.material.posizione_attuale !== 'in_magazzino'
  )

  // 2. For each overdue return:
  for (const movement of overdue) {
    const gruppo = `rientro_scaduto_${movement.id}_${todayStr}`

    // Dedup check
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('gruppo', gruppo)
    if (count && count > 0) continue

    // Notify responsabile_id from movement
    if (movement.responsabile_id) {
      await supabase.from('notifications').insert({
        user_id: movement.responsabile_id,
        tipo: 'rientro_scaduto',
        titolo: 'Rientro scaduto: ' + movement.material.nome,
        messaggio: 'Previsto il ' + movement.data_rientro_prevista,
        link: '/materiale/' + movement.material.id,
        link_label: 'Vai al materiale',
        entity_type: 'material',
        entity_id: movement.material.id,
        gruppo,
      })
    }

    // Notify all users with gestione_magazzino permission
    const { data: warehouseUsers } = await supabase
      .from('user_permissions')
      .select('user_id')
      .eq('permission', 'gestione_magazzino')

    for (const u of (warehouseUsers || [])) {
      if (u.user_id === movement.responsabile_id) continue // skip duplicate
      await supabase.from('notifications').insert({
        user_id: u.user_id,
        tipo: 'rientro_scaduto',
        titolo: 'Rientro scaduto: ' + movement.material.nome,
        messaggio: 'Previsto il ' + movement.data_rientro_prevista,
        link: '/materiale/' + movement.material.id,
        link_label: 'Vai al materiale',
        entity_type: 'material',
        entity_id: movement.material.id,
        gruppo,
      })
    }
  }

  return new Response(JSON.stringify({ ok: true, checked: overdue.length }), { status: 200 })
})
```

**Dependencies:** Task 1 (notifications table).

**Verification:**
- Deploy: `npx supabase functions deploy overdue-returns-checker`
- Test manually with curl
- Create a material movement with `data_rientro_prevista` in the past, confirm notifications are created

---

## Task 18: Edge Function — email-digest

**What:** Create the email digest Edge Function. Two schedules: daily (weekdays) and weekly (Monday). Aggregates pending items per user and sends a summary email.

**Files to create:**
- `supabase/functions/email-digest/index.ts`

**Code changes — function structure:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json().catch(() => ({}))
  const mode = body.mode || 'daily' // 'daily' | 'weekly'

  // 1. Fetch all users with their preferences
  const { data: users } = await supabase.from('users').select('id, nome, cognome, email, attivo')
  const { data: prefs } = await supabase.from('notification_preferences').select('*')
  const prefsMap = Object.fromEntries((prefs || []).map(p => [p.user_id, p]))

  for (const user of (users || [])) {
    if (!user.attivo || !user.email) continue

    const userPrefs = prefsMap[user.id] || { email_daily: true, email_weekly: true, mute_types: [] }

    if (mode === 'daily' && !userPrefs.email_daily) continue
    if (mode === 'weekly' && !userPrefs.email_weekly) continue

    // 2. Aggregate sections for this user
    const sections = []

    if (mode === 'daily') {
      // a. Pending approvals (events + preventivi) — filtered by user permissions
      // b. Activities due today/tomorrow — assigned to user or matching permissions
      // c. Overdue activities
      // d. Events happening today
      // e. Overdue returns (only for gestione_magazzino users)
    }

    if (mode === 'weekly') {
      // a. Events this week
      // b. Last week summary (N events completed, N activities completed)
      // c. Budget alerts (costs > preventivo by 20%)
      // d. Critical overdue activities
    }

    // Filter out muted types
    // ...

    // 3. Skip if nothing to report
    if (sections.length === 0) continue

    // 4. Build HTML email (inline styles for email client compatibility)
    const html = buildEmailHtml(user, sections, mode)
    const subject = mode === 'daily'
      ? `[Mikai Eventi] Riepilogo giornaliero — ${new Date().toLocaleDateString('it-IT')}`
      : `[Mikai Eventi] Riepilogo settimanale — ${new Date().toLocaleDateString('it-IT')}`

    // 5. Send email
    // Option A: Resend API (recommended for MVP — free tier 100 emails/day)
    //   fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY }, body: JSON.stringify({ from, to, subject, html }) })
    // Option B: Supabase built-in SMTP
    //   (configure in Supabase Dashboard > Auth > SMTP)
  }

  return new Response(JSON.stringify({ ok: true, mode }), { status: 200 })
})

function buildEmailHtml(user, sections, mode) {
  // Simple HTML with inline styles
  // Header: "MIKAI EVENTI — Riepilogo del {data}"
  // Each section: title + bulleted list
  // Footer: link to app + unsubscribe instructions
  return `<!DOCTYPE html><html>...`
}
```

**Dependencies:** Task 1 (notifications table, preferences table).

**Verification:**
- Deploy: `npx supabase functions deploy email-digest`
- Test: `curl -X POST -H "Authorization: Bearer ..." -d '{"mode":"daily"}' .../functions/v1/email-digest`
- Verify email is received (or check Resend dashboard for delivery status)
- Verify users with `email_daily: false` do NOT receive the email
- Verify empty digest (nothing pending) does NOT send email

---

## Task 19: pg_cron Schedules & Cleanup

**What:** Configure pg_cron schedules for all Edge Functions and the 90-day notification cleanup. This is done via SQL in the Supabase SQL editor (not a migration, since pg_cron schedules are runtime config).

**Files to create:**
- `supabase/migrations/20260324120002_notification_cleanup_cron.sql` (for the cleanup SQL only, as documentation)

**Code changes — SQL to run in Supabase Dashboard SQL editor:**

```sql
-- 1. Daily deadline checker at 07:00 UTC
SELECT cron.schedule(
  'deadline-checker-daily',
  '0 7 * * *',
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/deadline-checker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  )$$
);

-- 2. Daily overdue returns checker at 07:00 UTC
SELECT cron.schedule(
  'overdue-returns-daily',
  '0 7 * * *',
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/overdue-returns-checker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  )$$
);

-- 3. Daily email digest at 07:00 UTC weekdays
SELECT cron.schedule(
  'email-digest-daily',
  '0 7 * * 1-5',
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/email-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"mode":"daily"}'::jsonb
  )$$
);

-- 4. Weekly email digest at 07:00 UTC Monday
SELECT cron.schedule(
  'email-digest-weekly',
  '0 7 * * 1',
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/email-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"mode":"weekly"}'::jsonb
  )$$
);

-- 5. Weekly cleanup: delete notifications older than 90 days (Sunday 03:00 UTC)
SELECT cron.schedule(
  'notification-cleanup',
  '0 3 * * 0',
  $$DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days'$$
);
```

**Dependencies:** Tasks 16, 17, 18 (Edge Functions must be deployed first).

**Verification:**
- Run `SELECT * FROM cron.job;` in SQL editor to confirm all 5 jobs are scheduled
- Wait for next scheduled run (or manually trigger via `SELECT cron.schedule('test-deadline', 'NOW', ...)`)
- Check logs in Supabase Dashboard > Edge Functions for successful invocation

---

## Task 20: Notification Preferences UI

**What:** Create a notification preferences section. This can be a section within the existing `/impostazioni` page or, if that page doesn't exist yet (it's currently admin-only), a section at the bottom of the `/notifiche` page accessible via a "Preferenze" tab or button.

**Files to create:**
- `src/components/notifiche/NotificationPreferences.jsx`

**Files to modify:**
- `src/pages/notifiche/NotifichePage.jsx` (add a "Preferenze" tab or settings button)

**Code changes — component structure:**

```jsx
export function NotificationPreferences() {
  const preferences = useNotificationsStore(s => s.preferences)
  const fetchPreferences = useNotificationsStore(s => s.fetchPreferences)
  const updatePreferences = useNotificationsStore(s => s.updatePreferences)
  const addToast = useToastStore(s => s.add)

  const [localPrefs, setLocalPrefs] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchPreferences() }, [])
  useEffect(() => { if (preferences) setLocalPrefs(preferences) }, [preferences])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await updatePreferences({
      email_daily: localPrefs.email_daily,
      email_weekly: localPrefs.email_weekly,
      mute_types: localPrefs.mute_types,
    })
    setSaving(false)
    if (error) addToast('Errore nel salvataggio', 'error')
    else addToast('Preferenze salvate', 'success')
  }

  // Layout:
  // - Section title: "Preferenze Notifiche"
  // - Toggle: "Email giornaliera (lun-ven alle 8:00)" — checkbox/switch
  // - Toggle: "Email settimanale (lunedi alle 8:00)" — checkbox/switch
  // - Section: "Silenzia per email:" — list of TIPO_NOTIFICA with checkboxes
  //   (checking a type adds it to mute_types array)
  // - Note: "Le notifiche in-app restano sempre attive"
  // - Save button

  return (...)
}
```

**Integration in NotifichePage:** Add a settings icon button in the PageHeader that toggles showing the preferences panel (or use Tabs with "Notifiche" | "Preferenze").

**Dependencies:** Task 6 (store preferences actions), Task 13 (NotifichePage).

**Verification:**
- `npm run build` succeeds
- Navigate to /notifiche, open preferences
- Toggle email_daily off, save — confirm `notification_preferences` row is updated in DB
- Toggle back on, add a muted type, save — confirm array is updated

---

## Execution Order Summary

| Order | Task | Description | Depends on |
|-------|------|-------------|------------|
| 1 | Task 1 | DB migration: tables + indexes + RLS + Realtime | — |
| 2 | Task 2 | DB migration: trigger functions + triggers | Task 1 |
| 3 | Task 3 | Constants: TIPO_NOTIFICA, TIPO_NOTIFICA_COLORE | — |
| 4 | Task 4 | Icons: NOTIFICA_ICONS + new Lucide imports | — |
| 5 | Task 5 | date-utils: formatRelativeTime | — |
| 6 | Task 6 | Zustand store: useNotifications.js | Task 1 |
| 7 | Task 7 | Component: NotificationCard | Tasks 3, 4, 5, 6 |
| 8 | Task 8 | Component: NotificationDropdown | Task 7 |
| 9 | Task 9 | Component: NotificationBell | Tasks 6, 8 |
| 10 | Task 10 | Sidebar + BottomBar badge integration | Task 9 |
| 11 | Task 11 | AppShell mobile bell (fixed position) | Task 9 |
| 12 | Task 12 | AppShell: Realtime subscription init | Task 6 |
| 13 | Task 13 | Page: NotifichePage | Task 7 |
| 14 | Task 14 | App.jsx: route update | Task 13 |
| 15 | Task 15 | useMaterials: conflict notification | Task 1 |
| 16 | Task 16 | Edge Function: deadline-checker + escalation | Task 1 |
| 17 | Task 17 | Edge Function: overdue-returns-checker | Task 1 |
| 18 | Task 18 | Edge Function: email-digest | Task 1 |
| 19 | Task 19 | pg_cron schedules + cleanup | Tasks 16, 17, 18 |
| 20 | Task 20 | Notification preferences UI | Tasks 6, 13 |

**Parallelizable groups:**
- Tasks 3, 4, 5 can run in parallel (independent file changes)
- Tasks 10, 11, 12 can run in parallel after Task 9
- Tasks 15, 16, 17, 18 can run in parallel (independent after Task 1)

---

## Post-Implementation Verification Checklist

Run `npm run build` after all frontend tasks. Then manually test:

1. Create event as commerciale → approver sees `approvazione_richiesta` in bell
2. Approve event → promotore sees `approvazione_completata`
3. Assign activity → assignee sees `attivita_assegnata`
4. Bell badge shows correct unread count
5. Click notification → marks as read + navigates to link
6. "Segna tutte come lette" clears all + resets badge
7. Realtime: insert notification via SQL editor → appears in bell without refresh
8. /notifiche page: filters work, infinite scroll loads more
9. /notifiche preferences: save/load works
10. Material conflict → notification created for requester
11. Edge Functions: invoke manually, confirm notifications appear
12. Email digest: test with single user, confirm delivery

---

## Risk Notes

- **Realtime quotas:** Supabase free tier allows 200 concurrent connections. With ~15 users this is fine, but monitor if scaling.
- **Email sending:** Resend free tier = 100 emails/day. With ~15 users x daily digest = ~15 emails/day. Plenty of headroom.
- **pg_cron + pg_net:** Must be enabled in Supabase Dashboard > Database > Extensions. Verify both are active before Task 19.
- **Trigger performance:** The event state change trigger queries `event_staff` and `user_permissions` tables. These are small tables (<100 rows), so no performance concern. Add indexes if needed later.
- **INSERT RLS policy `WITH CHECK (true)`:** This allows any authenticated user to insert notifications. The triggers run as SECURITY DEFINER (superuser context), so this is fine. But it means a malicious frontend could theoretically insert fake notifications. Acceptable risk for an internal app with ~15 trusted users. If needed later, restrict INSERT to service_role only.

---

## Rollback

If triggers cause issues in production, drop them immediately:

```sql
DROP TRIGGER IF EXISTS trg_event_state_change ON events;
DROP TRIGGER IF EXISTS trg_event_created ON events;
DROP TRIGGER IF EXISTS trg_activity_assigned ON event_activities;
DROP TRIGGER IF EXISTS trg_preventivo_state_change ON event_preventivi;
DROP TRIGGER IF EXISTS trg_preventivo_created ON event_preventivi;
```

This removes all automatic notification generation without affecting the notifications table or the frontend. Notifications already created will remain visible. The Edge Functions (deadline-checker, overdue-returns-checker, email-digest) can be disabled independently by removing their pg_cron schedules:

```sql
SELECT cron.unschedule('deadline-checker-daily');
SELECT cron.unschedule('overdue-returns-daily');
SELECT cron.unschedule('email-digest-daily');
SELECT cron.unschedule('email-digest-weekly');
SELECT cron.unschedule('notification-cleanup');
```

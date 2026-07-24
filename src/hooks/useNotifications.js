import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { nowISO } from '../lib/date-utils'

export const useNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  preferences: null,

  fetchNotifications: async (limit = 50, offset = 0) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, tipo, titolo, messaggio, letta, created_at, link, link_label, entity_type, entity_id, gruppo')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      set({ loading: false, error: error.message })
      return { data: null, error: error.message }
    }

    if (offset === 0) {
      set({ notifications: data || [], loading: false })
    } else {
      set((s) => ({
        notifications: [...s.notifications, ...(data || [])],
        loading: false,
      }))
    }
    return { data, error: null }
  },

  fetchUnreadCount: async () => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('letta', false)

    if (!error) {
      set({ unreadCount: count || 0 })
    }
    return { count, error: error?.message || null }
  },

  markAsRead: async (id) => {
    // Skip if already read
    const notification = get().notifications.find((n) => n.id === id)
    if (notification?.letta) return { error: null }

    // Optimistic update
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, letta: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))

    const { error } = await supabase
      .from('notifications')
      .update({ letta: true })
      .eq('id', id)

    if (error) {
      // Rollback on error
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, letta: false } : n
        ),
        unreadCount: s.unreadCount + 1,
      }))
      return { error: error.message }
    }
    return { error: null }
  },

  markAllAsRead: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Sessione scaduta' }

    const prev = get().notifications
    const prevCount = get().unreadCount

    // Optimistic update
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, letta: true })),
      unreadCount: 0,
    }))

    const { error } = await supabase
      .from('notifications')
      .update({ letta: true })
      .eq('user_id', user.id)
      .eq('letta', false)

    if (error) {
      set({ notifications: prev, unreadCount: prevCount })
      return { error: error.message }
    }
    return { error: null }
  },

  deleteReadNotifications: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Sessione scaduta' }

    const prev = get().notifications
    const prevUnread = get().unreadCount

    // Optimistic update: remove all read notifications from local state
    set((s) => ({
      notifications: s.notifications.filter((n) => !n.letta),
    }))

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('letta', true)

    if (error) {
      set({ notifications: prev, unreadCount: prevUnread })
      return { error: error.message }
    }
    return { error: null }
  },

  deleteNotification: async (id) => {
    const prev = get().notifications
    const prevUnread = get().unreadCount
    const notification = prev.find((n) => n.id === id)
    const wasUnread = notification && !notification.letta

    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
      unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
    }))

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) {
      set({ notifications: prev, unreadCount: prevUnread })
      return { error: error.message }
    }
    return { error: null }
  },

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
          set((s) => ({
            notifications: [payload.new, ...s.notifications],
            unreadCount: s.unreadCount + 1,
          }))
        }
      )
      .subscribe()

    return channel
  },

  unsubscribeRealtime: (channel) => {
    if (channel) {
      supabase.removeChannel(channel)
    }
  },

  fetchPreferences: async () => {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .single()

    if (!error) {
      set({ preferences: data })
    }
    return { data: data || null, error: error?.message || null }
  },

  updatePreferences: async (updates) => {
    const existing = get().preferences
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Sessione scaduta' }

    if (existing) {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single()

      if (!error) set({ preferences: data })
      return { data, error: error?.message || null }
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .insert({ ...updates, user_id: user.id })
      .select()
      .single()

    if (!error) set({ preferences: data })
    return { data, error: error?.message || null }
  },

  // ── Web Push ──────────────────────────────────────────────
  // Salva/aggiorna una subscription push (upsert per endpoint univoco).
  // `sub` = { endpoint, p256dh, auth, user_agent } prodotto da push-notifications.js.
  savePushSubscription: async (sub) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Sessione scaduta' }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          user_agent: sub.user_agent || null,
          updated_at: nowISO(),
        },
        { onConflict: 'endpoint' }
      )
      .select()
      .single()

    return { data, error: error?.message || null }
  },

  // Rimuove la subscription di questo dispositivo dal DB (dopo unsubscribe).
  deletePushSubscription: async (endpoint) => {
    if (!endpoint) return { error: null }
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
    return { error: error?.message || null }
  },
}))

-- ============================================
-- Mikai Eventi — Security Fixes
-- Fix: Function Search Path Mutable warnings
-- ============================================

-- Set search_path on all functions to prevent search path injection
ALTER FUNCTION public.get_user_role() SET search_path = '';
ALTER FUNCTION public.has_permission(permission_type) SET search_path = '';
ALTER FUNCTION public.can_see_event(uuid) SET search_path = '';
ALTER FUNCTION public.update_updated_at() SET search_path = '';
ALTER FUNCTION public.sync_material_position() SET search_path = '';
ALTER FUNCTION public.set_event_manager() SET search_path = '';

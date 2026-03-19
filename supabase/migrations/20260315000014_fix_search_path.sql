-- Fix: search_path = '' breaks table lookups
-- Use 'public' instead to keep security while allowing table access

ALTER FUNCTION public.get_user_role() SET search_path = 'public';
ALTER FUNCTION public.has_permission(permission_type) SET search_path = 'public';
ALTER FUNCTION public.can_see_event(uuid) SET search_path = 'public';
ALTER FUNCTION public.update_updated_at() SET search_path = 'public';
ALTER FUNCTION public.sync_material_position() SET search_path = 'public';
ALTER FUNCTION public.set_event_manager() SET search_path = 'public';

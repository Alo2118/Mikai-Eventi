-- Grant execute on create_app_user to authenticated role
-- so PostgREST can expose it via the REST API
GRANT EXECUTE ON FUNCTION create_app_user(text, text, text, text, user_role) TO authenticated;

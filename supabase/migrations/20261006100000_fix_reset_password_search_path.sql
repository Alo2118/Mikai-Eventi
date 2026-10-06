-- 20260727100600_prevent_role_escalation ha ridefinito reset_user_password con
-- SET search_path = public: crypt()/gen_salt() (pgcrypto, schema extensions) non
-- vengono più risolte e il reset password da admin fallisce. Ripristiniamo il
-- search_path di 20260402120001_fix_reset_password_searchpath.

ALTER FUNCTION reset_user_password(uuid, text) SET search_path = public, extensions, auth;

---
description: Create and push a new Supabase migration
---

Create a new database migration: $ARGUMENTS

## Process

1. **Check existing schema:** Read relevant migration files in `supabase/migrations/` to understand current state
2. **Generate timestamp:** Use format `YYYYMMDDHHMMSS_description.sql`
3. **Write migration:** 
   - Idempotent where possible (IF NOT EXISTS, CREATE OR REPLACE)
   - All functions must set `search_path = public`
   - `ALTER TYPE ... ADD VALUE` must be in a SEPARATE migration from policies that reference the new values
   - Never modify existing migrations — always create a new file
4. **Push to remote:**
   ```bash
   source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"
   ```
5. **Verify:** Check migration status
   ```bash
   source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase migration list -p "$SUPABASE_DB_PASSWORD"
   ```
6. **Update frontend:** If new columns/tables were added, update the relevant Zustand store queries to match the new schema exactly

---
name: migrate
description: Create and push a new Supabase migration. Use when DB schema changes are needed (new tables, columns, policies, functions).
disable-model-invocation: true
argument-hint: [migration-description]
allowed-tools: Read Grep Glob Bash Edit Write
---

Create a new database migration: $ARGUMENTS

## 1. Understand current schema

Read relevant migration files in `supabase/migrations/` for the tables being modified.

Current migration count:
```!
ls supabase/migrations/*.sql 2>/dev/null | wc -l
```

## 2. Write migration

- **Filename:** `YYYYMMDDHHMMSS_description.sql`
- **Idempotent:** `IF NOT EXISTS`, `CREATE OR REPLACE`, `DO $$ BEGIN ... EXCEPTION WHEN ... END $$`
- **Functions:** always `SET search_path = public`
- **Enums:** `ALTER TYPE ... ADD VALUE` in a SEPARATE migration from policies referencing the new value
- **Never modify existing migrations**
- **RLS:** add policies for new tables (`USING` for SELECT, `WITH CHECK` for INSERT/UPDATE)
- **Indexes:** on frequently filtered/joined columns
- **FK constraints:** specify `ON DELETE` behavior (CASCADE / SET NULL / RESTRICT)
- **Triggers:** for audit logging on key tables if needed

## 3. Push to Supabase

```bash
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push -p "$SUPABASE_DB_PASSWORD"
```

## 4. Verify

```bash
source .env && SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase migration list -p "$SUPABASE_DB_PASSWORD"
```

## 5. Update frontend

- Update relevant Zustand store's `.select()` to include new columns
- Verify ALL column names in queries match the migration exactly
- Add constants/labels in `constants.js` if needed
- Update components to display new data

## 6. Build check

`npm run build` — zero errors.

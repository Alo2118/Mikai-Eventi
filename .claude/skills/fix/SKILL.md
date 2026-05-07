---
name: fix
description: Systematic debugging — investigate root cause before fixing. Use for any bug, unexpected behavior, or error. NEVER guess at fixes.
argument-hint: [bug-description]
allowed-tools: Read Grep Glob Bash Edit Write
---

Debug and fix: $ARGUMENTS

## Step 1: Reproduce & understand

- What is the expected behavior?
- What is the actual behavior?
- Trace the execution path: component → store action → Supabase query → DB

## Step 2: Root cause analysis

Read the relevant code and check for these common traps:

**Supabase/PostgREST:**
- Column names don't match DB schema (verify against `supabase/migrations/`)
- PostgREST silently ignores unknown fields on INSERT/UPDATE → data loss
- Missing RLS policies blocking access
- FK join aliases wrong (`promotore:users!events_promotore_id_fkey(...)`)
- `.single()` on queries returning 0 or multiple rows
- Missing `.error` check after calls

**Zustand:**
- Stale closures (state read at creation time, not execution time)
- Missing `set()` after async operations
- Action not returning `{ data, error }`

**React:**
- Hooks called conditionally or after early returns
- Missing effect dependencies
- Key prop issues in lists

**DB:**
- Missing CASCADE on FK deletions → orphaned records
- Enum values not yet added (needs separate migration)

Identify the EXACT line(s) causing the issue.

## Step 3: Fix

- Minimal fix addressing the root cause only
- No refactoring of surrounding code
- If DB migration needed: new file, never edit existing ones
- Verify ALL column names in touched Supabase queries

## Step 4: Verify

- `npm run build` — zero errors
- Check sibling components aren't broken
- If fix touches shared code, grep for all usages

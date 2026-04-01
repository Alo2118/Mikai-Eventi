---
description: Systematic debugging — investigate root cause before fixing
---

Debug and fix the following issue: $ARGUMENTS

Follow the systematic-debugging approach (NEVER guess at fixes):

## Step 1: Reproduce & Understand
- What is the expected behavior?
- What is the actual behavior?
- Where in the code does this happen? (trace the execution path)

## Step 2: Root Cause Analysis
- Read the relevant code (components, stores, migrations)
- Check Supabase queries for correct column names (cross-reference migrations)
- Check for common traps: silent PostgREST failures, missing RLS policies, stale Zustand state, missing CASCADE on FKs
- Identify the EXACT line(s) causing the issue

## Step 3: Fix
- Apply the minimal fix that addresses the root cause
- Don't refactor surrounding code or add unrelated improvements
- If a DB migration is needed, create a new file (never edit existing migrations)

## Step 4: Verify
- Run `npm run build` to check for regressions
- If the fix touches Supabase queries, verify column names against migration files
- Check that the fix doesn't break sibling components

---
description: Code review with project-specific checks for Eventi conventions
---

Review recent code changes: $ARGUMENTS

Dispatch 3 parallel review agents:

## Agent 1 — Correctness
- Check for bugs, data loss risks, race conditions
- Verify Supabase column names against migration files
- Check FK relationships and CASCADE behavior
- Look for orphaned records risks
- Verify error handling (no silent failures)

## Agent 2 — Conventions
- CLAUDE.md compliance (icon system, date-utils, format-utils, style constants)
- Named exports only (except App.jsx)
- Zustand selector pattern (never destructure store)
- Component structure (< 300 lines, < 50 line functions)
- No dead code, unused imports
- Italian UI text, no emoji, no tech jargon

## Agent 3 — UX/Accessibility
- Touch targets (48px min)
- Mobile-first responsive (mobile default, md: desktop)
- Color not the only differentiator
- aria-label on icon-only buttons
- EmptyState for empty lists
- ConfirmDialog for destructive actions
- Disabled state explained (hint text)

Consolidate findings ranked by severity. Present as actionable items.

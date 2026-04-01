---
description: Run a comprehensive audit of a specific area of the codebase using 3 parallel expert agents
---

Run a comprehensive audit of the area described by the user: $ARGUMENTS

Follow this process:

1. **Dispatch 3 parallel agents** (mandatory — per project convention):
   - **Agent 1 — Bug Hunter:** Search for bugs, data loss risks, silent failures, orphaned records, missing error handling. Check Supabase queries for unverified column names (cross-reference with migration files). Check for missing CASCADE/SET NULL on FK relationships.
   - **Agent 2 — UX/Consistency Reviewer:** Compare sibling components (all tabs in the same detail page, all list pages, all admin pages). Check for: CARD_STYLE/FORM_CONTAINER_STYLE/SUMMARY_BAR_STYLE usage, heading styles (h3 font-semibold text-lg), spacing (space-y-6 outer, space-y-3 cards, gap-3 buttons), touch targets (48px min), EmptyState usage, Icon system compliance (no direct lucide imports, no emoji).
   - **Agent 3 — Architecture/Performance:** Check for: direct Supabase calls outside stores, date-fns imports outside date-utils, inline currency formatting, missing selectors on Zustand stores, large components (>300 lines), dead code, unused imports.

2. **Consolidate findings** into a ranked list (critical → minor).

3. **Fix all issues found**, starting from critical.

4. **Re-run the audit** after fixes to verify nothing was missed (per project convention: always re-check after fixes).

5. Run `npm run build` to verify no regressions.

Project context:
- This is a React + Supabase + Zustand + TailwindCSS v4 app
- All conventions are in CLAUDE.md — read it first
- UI text must be in Italian
- Icons: only through Icon.jsx + icons.js (never direct lucide-react imports)
- Dates: only through date-utils.js (never direct date-fns imports)
- Style constants: CARD_STYLE, FORM_CONTAINER_STYLE, etc. from constants.js

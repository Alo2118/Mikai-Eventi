---
name: verify
description: Verification before completion — evidence before assertions. Use before claiming any task is done. Auto-invoke after /feature, /fix, or any significant change.
when_to_use: After completing a feature, fix, or any code change. Before telling the user something is "done". When the user asks to check or validate work.
argument-hint: [what-to-verify]
allowed-tools: Read Grep Glob Bash
---

Verify that recent changes are correct and complete: $ARGUMENTS

## 1. Build

```!
cd /mnt/c/Users/Nicola_MussolinAdmin/Documents/Mikai/Eventi && npm run build 2>&1 | tail -5
```

Must pass with zero errors.

## 2. Convention compliance (grep-verify each)

Run these checks on changed files and report pass/fail:

| Check | Grep pattern | Allowed only in |
|-------|-------------|-----------------|
| No direct lucide imports | `from 'lucide-react'` | `icons.js` |
| No direct date-fns imports | `from 'date-fns'` | `date-utils.js` |
| No inline Date ISO | `new Date().toISOString()` | `date-utils.js` |
| No inline currency | `toLocaleString.*currency` | `format-utils.js` |
| No Supabase in components | `supabase.from` | `src/hooks/use*.js` |
| No emoji in UI | emoji Unicode in JSX | nowhere |

## 3. Supabase query safety

For every Supabase query in changed files:
- Cross-reference each field in `.select()/.insert()/.update()/.eq()/.order()` against column names in `supabase/migrations/`
- Verify FK join aliases match constraint names

## 4. Sibling consistency

- Tab changed → compare with other tabs in same detail page
- List page changed → compare with other list pages
- Check: heading styles, spacing, style constants, EmptyState, touch targets

## 5. Touch targets & accessibility

- Interactive elements: `min-h-[48px] min-w-[48px]`
- Icon-only buttons: `aria-label` present
- Color not the only differentiator
- Errors: `role="alert"`, loading: `role="status"`

## 6. Error handling

- Every Supabase `.error` is checked
- Errors surface via toast or inline message
- Destructive actions use `<ConfirmDialog>`

## Report

Present as checklist:
- ✓ item — pass
- ✗ item — fail (with details and file:line)

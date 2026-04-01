---
description: Verification before completion — evidence before assertions
---

Verify that recent changes are correct and complete: $ARGUMENTS

## Mandatory checks

1. **Build check:** Run `npm run build` — must pass with zero errors
2. **Convention compliance:**
   - No direct lucide-react imports (only through icons.js + Icon.jsx)
   - No direct date-fns imports (only through date-utils.js)
   - No inline `new Date().toISOString()` (use todayISO/nowISO/toISO)
   - No inline currency formatting (use formatCurrency/formatCurrencyDecimals)
   - No hardcoded card/form class strings (use CARD_STYLE/FORM_CONTAINER_STYLE/etc.)
   - No Supabase calls in components (only in Zustand stores)
   - No emoji in UI
   - All UI text in Italian
3. **Supabase query safety:** Every field name in .insert()/.update()/.select()/.order()/.eq() matches actual DB column names from migrations
4. **Sibling consistency:** Changed components match the patterns of their siblings (tabs, list pages, admin pages)
5. **Touch targets:** All interactive elements have min-h-[48px]
6. **Error handling:** No silent failures — errors surface via toast or inline message

## Report
Present findings as a checklist with pass/fail for each item.

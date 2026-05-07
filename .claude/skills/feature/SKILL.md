---
name: feature
description: Start the full feature development flow (brainstorm → plan → execute → verify). Use when building new features, pages, or significant behavior changes.
argument-hint: [feature-description]
allowed-tools: Read Grep Glob Agent Bash Edit Write
---

Develop a new feature for the Eventi app: $ARGUMENTS

## Current project scale
- !`ls src/hooks/use*.js 2>/dev/null | wc -l` Zustand stores in `src/hooks/`
- !`ls src/components/ui/*.jsx 2>/dev/null | wc -l` UI components in `src/components/ui/`
- !`ls supabase/migrations/*.sql 2>/dev/null | wc -l` DB migrations

## Step 1: Brainstorming (mandatory before ANY code)

Research the existing codebase, then answer:
- **Problem:** What does this solve for Mikai users? (variable digital literacy — must work for WhatsApp-only users)
- **Lifecycle fit:** Where does it sit in Proposta → Approvazione → Preparazione → Esecuzione → Chiusura?
- **DB schema:** Check existing tables in `supabase/migrations/`. What needs adding?
- **Reuse:** Which existing UI components and stores can be leveraged?
- **Edge cases:** Mobile usage, offline, empty states, permission variations

Present the brainstorm to the user for approval before proceeding.

## Step 2: Planning

Create a step-by-step implementation plan covering:
1. DB migration (if needed) — `YYYYMMDDHHMMSS_description.sql`
2. Zustand store — extend existing `src/hooks/use*.js` or create new
3. Components — prefer editing existing over creating new
4. Route in `App.jsx` (React.lazy + Suspense)
5. Navigation (Sidebar + BottomBar if new page)
6. Icons in `icons.js`, constants/labels in `constants.js`
7. Sibling consistency — compare with similar existing features

## Step 3: Execution

Execute the plan following project conventions:
- Named exports only (except App.jsx)
- Zustand selectors: `useStore(s => s.field)`
- Supabase calls only in stores, FK aliases on joins
- Dates via `date-utils.js`, formatting via `format-utils.js`
- Style constants from `constants.js` (CARD_STYLE, FORM_CONTAINER_STYLE, etc.)
- Icons via `<Icon>` + `icons.js` maps only
- Mobile-first: base = mobile, `md:` = desktop
- Touch targets: `min-h-[48px]` on interactive elements
- Italian UI text, no emoji, no jargon

After each logical chunk → run `/simplify`.

## Step 4: Verification

Run `/verify` to confirm everything is correct.

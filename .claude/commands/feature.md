---
description: Start the full feature development flow (brainstorm → plan → execute → verify)
---

Develop a new feature for the Eventi app: $ARGUMENTS

Follow the mandatory decision flow from CLAUDE.md:

## Step 1: Brainstorming
Before writing ANY code, brainstorm the feature design:
- What problem does this solve for Mikai's users (sales reps, area managers, back-office)?
- How does it fit into the existing event lifecycle (Proposta → Approvazione → Preparazione → Esecuzione → Chiusura)?
- What DB tables/columns are needed? (Check existing migrations first)
- What components exist that can be reused?
- What are the edge cases for users with low digital literacy?

Present the design to the user for approval before proceeding.

## Step 2: Planning
After design approval, create a step-by-step implementation plan:
- DB migration (if needed)
- Zustand store (hooks/)
- Components (which existing ones to modify vs new ones)
- Routes (App.jsx)
- Navigation (Sidebar/BottomBar)
- Icons (icons.js) and constants (constants.js)

## Step 3: Execution
Execute the plan step-by-step. After each logical chunk:
- Run `/simplify` to check code quality
- Verify consistency with sibling components

## Step 4: Verification
- Run `npm run build`
- Check all files follow CLAUDE.md conventions
- Verify Italian text, no emoji, Icon system, date-utils, style constants

Project conventions reminder:
- Named exports only (except App.jsx)
- Zustand selectors (never destructure store)
- Supabase calls only in stores
- Mobile-first responsive design
- 48px min touch targets
- All text in Italian

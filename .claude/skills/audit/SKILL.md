---
name: audit
description: Run a comprehensive audit of a specific area of the codebase using 3 parallel expert agents. Use when asked to audit, review deeply, or check quality of a module/page/feature.
argument-hint: [area-to-audit]
allowed-tools: Read Grep Glob Agent Bash
---

Run a comprehensive audit of: $ARGUMENTS

## Process

### 1. Dispatch 3 parallel agents (mandatory)

Launch these 3 agents simultaneously using the Agent tool:

- **bug-hunter agent** — Analyze the target area for bugs, data loss risks, Supabase query safety, race conditions
- **ux-reviewer agent** — Check UX consistency, accessibility, style constant usage, sibling comparison
- **arch-reviewer agent** — Check architecture, file ownership, performance, convention compliance

Each agent must receive:
- The specific area/files to analyze
- Context about what was recently changed (if applicable)

### 2. Consolidate findings

Merge results from all 3 agents into a single ranked list:
- **CRITICAL** — Data loss, crashes, security issues
- **MAJOR** — Incorrect behavior, accessibility violations, broken patterns
- **MINOR** — Style inconsistencies, minor improvements

### 3. Fix all issues, starting from critical

### 4. Re-audit after fixes (mandatory)

Run the 3 agents again on the fixed code to verify nothing was missed and no regressions introduced.

### 5. Build check

Run `npm run build` — must pass with zero errors.

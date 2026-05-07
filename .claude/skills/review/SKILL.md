---
name: review
description: Code review with project-specific checks for Eventi conventions. Use when reviewing PRs, recent changes, or code quality. Dispatches 3 parallel expert agents.
argument-hint: [files-or-area-to-review]
allowed-tools: Read Grep Glob Agent Bash
---

Review recent code changes: $ARGUMENTS

## Recent changes context

```!
git diff --stat HEAD~3 2>/dev/null || echo "no recent commits"
```

## Process

### 1. Dispatch 3 parallel review agents

Launch simultaneously using the Agent tool:

- **bug-hunter agent** — Correctness, data integrity, Supabase query safety, error handling
- **ux-reviewer agent** — UX consistency, accessibility, component system compliance
- **arch-reviewer agent** — Architecture, conventions, performance, file ownership

Each agent receives the specific files/area to review.

### 2. Consolidate

Merge all findings into a single ranked list:
- **CRITICAL** — Data loss, crashes, security
- **MAJOR** — Incorrect behavior, broken patterns
- **MINOR** — Style, minor improvements

### 3. Present as actionable items

For each finding include:
- Severity level
- File path and line number
- What's wrong
- How to fix it

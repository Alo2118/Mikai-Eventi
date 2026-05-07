---
name: deploy
description: Build, commit, and deploy to GitHub Pages. Use when ready to ship changes to production.
disable-model-invocation: true
argument-hint: [optional-commit-message]
allowed-tools: Read Grep Glob Bash
---

Deploy the current changes to production: $ARGUMENTS

## Pre-deploy checklist

### 1. Build
`npm run build` — must pass with zero errors.

### 2. Convention quick-check

```!
echo "=== lucide-react imports outside icons.js ===" && grep -r "from 'lucide-react'" src/ --include="*.js" --include="*.jsx" -l 2>/dev/null | grep -v icons.js || echo "OK"
echo "=== date-fns imports outside date-utils.js ===" && grep -r "from 'date-fns'" src/ --include="*.js" --include="*.jsx" -l 2>/dev/null | grep -v date-utils.js || echo "OK"
echo "=== .env files ===" && git status --short | grep -i "\.env" || echo "OK"
```

### 3. Git status
Check for uncommitted changes. Stage and commit everything needed.

## Deploy process

1. **Commit** to `master` with descriptive message
2. **Merge to main:** `git checkout main && git merge master`
3. **Push:** `git push origin main`
4. **Back to master:** `git checkout master`
5. **Verify CI started:** `gh run list --limit 1`

## Post-deploy

- Confirm GitHub Actions completed: `gh run list --limit 1`
- Remind user to verify the live site
- If migrations were added, they MUST be pushed to Supabase BEFORE this deploy

## Important
- Base path: `/Mikai-Eventi/`
- SPA routing: `public/404.html` redirect trick
- CI/CD: `.github/workflows/deploy.yml`
- Secrets: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in GitHub repository settings

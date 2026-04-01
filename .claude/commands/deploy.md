---
description: Build, commit, and deploy to GitHub Pages
---

Deploy the current changes to production: $ARGUMENTS

## Pre-deploy checklist

1. **Build check:** `npm run build` — must pass with zero errors
2. **Git status:** Check for uncommitted changes, ensure everything is staged
3. **Convention check (quick):**
   - No direct lucide-react imports outside icons.js
   - No direct date-fns imports outside date-utils.js
   - No `.env` files being committed
   - Build output size is reasonable

## Deploy process

1. Commit changes to `master` with a descriptive message
2. Push to `main` branch (CI/CD auto-deploys via GitHub Actions)
3. Verify the GitHub Actions workflow starts: `gh run list --limit 1`
4. Wait for deployment to complete

## Post-deploy
- Check the live site at the GitHub Pages URL
- Verify no console errors in the deployed version

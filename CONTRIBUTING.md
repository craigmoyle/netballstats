# Contributing to netballstats

Thank you for your interest in contributing to netballstats! This guide explains how to develop and submit changes.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Opening a Pull Request](#opening-a-pull-request)
- [Code Review Process](#code-review-process)
- [Merge and Deployment](#merge-and-deployment)
- [Style Guides](#style-guides)
- [Questions or Issues](#questions-or-issues)

---

## Getting Started

### Prerequisites

- **Git** and GitHub account access to [craigmoyle/netballstats](https://github.com/craigmoyle/netballstats)
- **Node.js** (v22 recommended; matches CI environment) and npm for frontend development
- **R** (v4.0+) and [renv](https://rstudio.github.io/renv/) for backend development
- **Docker** (optional) for local API testing
- GitHub CLI (`gh`) for convenient command-line operations

### Repository Structure

```
netballstats/
├── api/                        # R Plumber API service
│   ├── plumber.R              # API entry point
│   ├── R/                      # Helper modules
│   └── ...
├── assets/                     # Shared frontend scripts and styles
├── scripts/                    # Data refresh and utilities
├── infra/                      # Azure infrastructure (Bicep)
├── azure.yaml                  # Azure deployment configuration
├── package.json                # Frontend dependencies
├── AGENTS.md                   # Repository context and decisions
├── CONTRIBUTING.md             # This file
└── .github/
    ├── BRANCH_PROTECTION.md    # Branch protection policy
    ├── CODEOWNERS              # Code ownership
    └── workflows/              # GitHub Actions
```

For detailed system architecture, see [AGENTS.md](./AGENTS.md).

---

## Development Setup

### Clone the Repository

```bash
# Clone
git clone https://github.com/craigmoyle/netballstats.git
cd netballstats

# Create a new feature branch (never work on main)
git checkout -b feature/my-feature
```

### Frontend Development

```bash
# Install dependencies
npm install

# Build and verify the static site (matches CI)
npm run build:verify

# Output is in dist/
ls dist/
```

### Backend Development (R/API)

```bash
# Restore R dependencies with renv
Rscript -e "renv::restore()"

# Test the API locally (if Docker available)
docker build -f Dockerfile.azure -t netballstats-api .
docker run -p 8000:8000 netballstats-api

# Or validate R syntax
Rscript -e "parse(file='api/plumber.R')"
```

### Database Development

- The database is Azure PostgreSQL Flexible Server (production)
- See `scripts/build_database.R` for schema and refresh logic
- See `AGENTS.md` for database conventions and helper functions

---

## Making Changes

### Code Quality Standards

Follow the standards outlined in [AGENTS.md](./AGENTS.md):

#### Frontend
- Use vanilla JavaScript with shared UI helpers from `assets/config.js`
- Maintain the warm amber and teal palette
- Support both light and dark themes
- Ensure WCAG AA accessibility
- Use the typography system: Fraunces (body) and Teko (display)

#### Backend (R)
- Use parameterized SQL for all queries (SQLite + PostgreSQL compatible)
- Validate all inputs strictly (no silent fallbacks)
- Log errors explicitly, not in broad try/catch wrappers
- Follow existing helper patterns in `api/R/helpers.R`

#### General
- Keep commits focused (one logical change per commit)
- Write clear commit messages in present tense
  - ✅ "Add international player stats page"
  - ❌ "Added stuff" or "fixed bugs"
- Update AGENTS.md if you change operational decisions

### Validation Before Pushing

```bash
# Frontend validation
npm run build:verify             # Verify build and validation succeeds

# Backend validation
Rscript -e "parse(file='api/plumber.R')"
Rscript -e "parse(file='api/R/helpers.R')"

# Git checks
git status                       # Review changes
git diff --cached                # Review staged changes
```

### Testing

The repository uses these validation approaches:

- **Frontend**: `npm run build:verify` validates syntax, runs checks, and outputs artifacts
- **Backend**: `Rscript -e "parse(file='...')"` validates R syntax
- **API**: Regression tests in `scripts/test_api_regression.R`
- **Container**: `scan-container` workflow scans for vulnerabilities

See [AGENTS.md](./AGENTS.md) for detailed testing patterns and data conventions.

---

## Opening a Pull Request

### Before Pushing

```bash
# Ensure you're on a feature branch
git branch

# Commit your changes
git add .
git commit -m "Add international player stats page"

# Keep commits clean
git log --oneline -5

# Push to GitHub
git push origin feature/my-feature
```

### Creating the PR on GitHub

1. Go to https://github.com/craigmoyle/netballstats
2. Click **"Compare & pull request"** (or use `gh pr create`)
3. Write a clear PR title and description:

   **Title**: Should be concise and describe the change
   - ✅ "Add international player stats page"
   - ✅ "Fix: Handle empty dataset in chart"
   - ❌ "Updates" or "stuff"

   **Description**: Should explain:
   - What changed and why
   - Any user-facing effects
   - Any breaking changes or database migrations
   - Links to related issues (if any)

   Example:
   ```
   ## Description
   Adds a new page for browsing international netball player statistics,
   complementing the existing Super Netball data.

   ## Changes
   - New international player stats page at /international/players/
   - Query endpoint /api/international/players
   - Shared styling with existing player pages

   ## Related Issues
   Closes #123

   ## Testing
   Verified with sample data in local dev environment.
   ```

4. Set a reviewer (usually auto-assigned via CODEOWNERS)
5. Ensure your branch is up-to-date with `main`

### Branch Status After Pushing

Once you push, GitHub automatically:
1. Runs **status checks**:
   - `Scan container image / scan` (required on every PR, optimized for frontend changes)
2. Requests **code owner reviews** (via CODEOWNERS)
3. Blocks merging until all checks pass

---

## Code Review Process

### Expecting Review Feedback

- Code owners will review your changes within 24–48 hours
- Feedback may request changes — **this is normal and valuable**
- Address feedback by pushing updates to your branch
- Old approvals automatically dismiss when you push new commits
- You don't need to request re-review; the reviewer will check the updates

### Handling Review Comments

Example workflow:
1. Reviewer requests: "This function needs a comment explaining the logic"
2. You make the change, commit, and push
3. Old approval is dismissed automatically
4. Reviewer sees the update and approves again

### If Status Checks Fail

**Frontend build failure**:
```bash
npm run build           # Run locally to see the error
# Fix the issue
git add .
git commit -m "Fix: Build error in theme.js"
git push origin feature/my-feature
```

**Container scan failure**:
- Review the scan report in GitHub Actions
- Fix vulnerabilities in dependencies or code
- Push your fix — the scan re-runs automatically

---

## Merge and Deployment

### When You're Ready to Merge

All of these must be true:
- ✅ **At least 1 code owner approval** (shown as "Approved" in PR)
- ✅ **All status checks pass** (green checkmarks)
- ✅ **No unresolved comments** (all review feedback addressed)
- ✅ **Branch is up-to-date** with `main`

### Merging Your PR

1. Click **"Squash and merge"** (or **"Rebase and merge"** if you have multiple logical commits)
   - **Do not use "Create a merge commit"** — this violates linear history
2. Confirm the merge
3. Delete your feature branch

**After merge**:
- GitHub automatically deploys to Azure Static Web Apps
- Azure Container Apps refresh jobs run on their scheduled times
- You can delete your local branch: `git branch -d feature/my-feature`

### Deployment Timeline

| Step | Time | What Happens |
|------|------|--------------|
| Merge to main | Immediate | GitHub Actions triggered |
| Frontend deploy | ~2–3 min | npm build runs, outputs to dist/ |
| Static Web App deploy | ~2–5 min | dist/ synced to Azure Static Web Apps |
| Live | ~5–10 min total | Changes visible at https://netballstats.com |
| API/Database | Scheduled | Refresh jobs run Tuesday, Friday, Saturday, Sunday (see AGENTS.md) |

---

## Style Guides

### Commit Messages

Use the present tense, imperative mood:
- ✅ "Add international player stats page"
- ✅ "Fix: Correct typo in stat label"
- ✅ "Refactor: Extract shared table logic to helper"
- ❌ "Added page" or "Fixed stuff"

### Frontend Code

- Use **vanilla JavaScript** with shared helpers from `assets/config.js`
- Use **descriptive variable names**
  - ✅ `const playerLeadersTable = document.getElementById('player-leaders-table')`
  - ❌ `const t = document.getElementById('tbl')`
- **Format labels** using `window.NetballStatsUI.formatStatLabel(key)`
- **Don't hardcode** stat names or custom styles when shared utilities exist
- Maintain **warm amber and teal** palette (unless there's strong product reason)
- Support **dark and light themes** via CSS variables

### Backend Code (R)

- Use **parameterized queries** with `append_integer_in_filter()` (SQLite compatible)
- **Validate inputs** explicitly, no silent fallbacks
- **Log errors** clearly (use structured logging patterns from helpers.R)
- **Comment complex logic** (especially database queries and business rules)
- **Reuse helpers** from `api/R/helpers.R` rather than duplicating logic

### Documentation

- Update **AGENTS.md** if you change operational decisions
- Update **README.md** if you change how to build/deploy
- Include **inline comments** for non-obvious logic
- Document **data contracts** (what the API returns, what fields mean)

---

## Validation Checklist

Before opening a PR, confirm:

- [ ] Branch is created from latest `main`
- [ ] All changes are committed to your feature branch
- [ ] Build succeeds locally (`npm run build`)
- [ ] Backend syntax is valid (`Rscript -e "parse(file='api/plumber.R')"`)
- [ ] No accidental console logs or debug code
- [ ] Commit messages are clear and present-tense
- [ ] AGENTS.md is updated if operational decisions changed
- [ ] README.md is updated if build/deploy instructions changed
- [ ] No sensitive data (API keys, passwords, credentials) in code
- [ ] Code follows the style guides above

---

## Questions or Issues?

### Getting Help

- **Questions about contributing**: Open a GitHub Discussion
- **Bug reports**: Open a GitHub Issue with steps to reproduce
- **Security concerns**: Please email the maintainer privately (don't open a public issue)
- **Branch protection or process questions**: See [.github/BRANCH_PROTECTION.md](./.github/BRANCH_PROTECTION.md)

### Common Issues

**"Why is my PR blocked from merging?"**
- Check that all status checks pass (green checkmarks)
- Ensure you have at least 1 approval
- Make sure all comments are resolved
- Your branch should be up-to-date with main

**"How do I update my branch with the latest main?"**
```bash
git fetch origin
git rebase origin/main
git push origin feature/my-feature --force-with-lease
```

**"Can I commit directly to main?"**
No. All changes go through pull requests. See [BRANCH_PROTECTION.md](./.github/BRANCH_PROTECTION.md).

**"What if a status check keeps failing?"**
- Check the GitHub Actions workflow logs for details
- Common causes: build errors, linting, security scan issues
- Fix locally and push again — checks re-run automatically

---

## Recognition

Contributors are recognized in:
- Pull request history on GitHub
- Commit log (via git)
- GitHub Contributors page

Thank you for helping improve netballstats! 🎉

---

**Last Updated**: May 22, 2026  
**Related Files**: [AGENTS.md](./AGENTS.md), [.github/BRANCH_PROTECTION.md](./.github/BRANCH_PROTECTION.md), [.github/CODEOWNERS](./.github/CODEOWNERS)

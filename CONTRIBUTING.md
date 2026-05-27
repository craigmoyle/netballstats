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
- **Container**: `Scan container image / scan` check scans for vulnerabilities

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

4. Set a reviewer (usually auto-assigned via CODEOWNERS)
5. Ensure your branch is up-to-date with `main`

### Branch Status After Pushing

Once you push, GitHub automatically:
1. Runs **status checks**:
   - `Scan container image / scan` (required on every PR, optimized for frontend changes)
2. Requests **code owner reviews** where relevant
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

1. Read the comment carefully
2. Make the necessary fix in your local branch
3. Commit and push the change
4. Mark the conversation as resolved when appropriate

### Review Best Practices

- Be respectful and constructive in all review comments
- Focus on the code, not the person
- Ask clarifying questions if a comment is unclear
- Prefer small, focused changes over large, risky rewrites

---

## Merge and Deployment

### When Ready to Merge

Before merging, confirm:

- [ ] All status checks are passing
- [ ] Review feedback is resolved
- [ ] The PR is current with `main`
- [ ] The change is documented if needed

### Merge Method

Use **Squash and merge** or **Rebase and merge**. Do not create merge commits.

### After Merge

- The frontend deploys automatically via Azure Static Web Apps
- Database refresh jobs remain synchronized through the Azure deployment process
- Monitor deployment status and logs if something looks off

---

## Style Guides

- Use the existing editorial tone and netball terminology
- Preserve the warm amber and teal palette
- Keep the typography system intact
- Follow the repo guidance in `AGENTS.md`

---

## Questions or Issues

- See [TROUBLESHOOTING.md](./.github/TROUBLESHOOTING.md)
- Review [BRANCH_PROTECTION.md](./.github/BRANCH_PROTECTION.md)
- Check [AGENTS.md](./AGENTS.md) for repository context

---

**Last Updated**: May 27, 2026

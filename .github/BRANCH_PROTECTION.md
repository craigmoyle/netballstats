# Branch Protection Policy for netballstats

**Status**: ✅ Active and enforced on the `main` branch

---

## Overview

This document describes the branch protection rules configured for the `netballstats` repository. These rules enforce code quality, security, and deployment readiness standards before changes can be merged to production. The configuration supports a single-maintainer setup where the repository owner can approve their own PRs while maintaining all quality and security gates.

---

## Protection Rules for `main` Branch

### 1. **Pull Request Reviews** (REQUIRED)
- **Minimum 1 approval required** before merging
- **Owner can self-approve** (practical for solo maintainer)
- **CODEOWNERS file** defines review responsibility (informational, not enforced)
- **Stale reviews dismissed** when new commits are pushed
- **Last push approval required** — last commit must be approved by a reviewer

**Why this matters**: Ensures human review of all changes, preventing mistakes and maintaining quality. The owner (sole admin) can approve their own PRs while still maintaining quality gates and code owner guidance via the CODEOWNERS file.

### 2. **Status Checks** (REQUIRED)
All of the following must pass before merge is allowed:

#### `Scan container image / scan`
- **Always runs** on every pull request (all branches, all changes)
- Scans container images for HIGH and CRITICAL vulnerabilities only
- Optimized: Skips Docker build for frontend-only changes (fast no-op for frontend PRs)
- Must pass before merge is allowed (required check)
- Ensures API (R Plumber service) meets security standards

**Strict mode**: Status checks are validated against the most recent commit on your branch, not the base branch. This ensures fresh scans after you push updates.

**Note**: The `Deploy Azure Static Web App` workflow is a post-merge deployment check (runs after merge to `main`), not a PR requirement. Frontend validation during PR review is performed locally via `npm run build:verify`.

### 3. **Conversation Resolution** (REQUIRED)
- All comments and feedback must be resolved before merging
- Prevents outdated concerns from being missed

### 4. **Linear History** (ENFORCED)
- Requires a linear commit history (no merge commits allowed)
- All PRs must be rebased or squashed, not merged
- Keeps `main` clean and history readable

### 5. **Administrator Enforcement**
- Rules apply to **all users, including administrators**
- No exceptions or workarounds available
- Ensures consistency and accountability

### 6. **Force Push Prevention**
- Force pushes to `main` are **blocked**
- Protects against accidental history rewrites

### 7. **Deletion Prevention**
- The `main` branch **cannot be deleted**
- Prevents accidental loss of the production branch

### 8. **Require Signed Commits**
- Not currently enforced, but available as an enhancement

---

## Why These Rules Exist

The `netballstats` system is a complex, production service with:

- **Static frontend** deployed to Azure Static Web Apps
- **Read-only API** (R Plumber service) deployed to Azure Container Apps
- **PostgreSQL database** with automated refresh jobs
- **Real user data** across multiple Super Netball seasons
- **Privacy commitments** (telemetry is sanitized and privacy-safe)
- **High availability requirements** (users expect reliable access)

These protection rules ensure:

1. **Quality**: Code is reviewed and tested before reaching production
2. **Security**: Vulnerabilities are caught and containers are scanned
3. **Deployment Readiness**: Build artifacts are verified to work
4. **Accountability**: Changes are traced to authors and reviewers
5. **Incident Prevention**: Reduces risk of production outages

---

## Review Policy

**Single-Maintainer Configuration**

This repository is configured for a single maintainer who is the sole administrator. The branch protection policy reflects this practical setup:

- **Pull request reviews are required** (minimum 1 approval)
- **The owner can self-approve** their own PRs (since they are the only reviewer)
- **CODEOWNERS file** is maintained for organizational clarity and future scaling
- **All other quality gates** remain strictly enforced (status checks, conversation resolution, linear history)

**This means:**
- The owner can approve and merge their own PRs without waiting for external review
- Code quality and security checks are still required (status checks must pass)
- The process is practical and efficient for solo maintenance
- If the project grows to multiple maintainers, the review enforcement can be re-enabled


## Development Workflow

### Starting a Feature

```bash
# Create a feature branch
git checkout -b feature/my-feature

# Make changes, commit, and push
git push origin feature/my-feature
```

### Opening a Pull Request

1. Push your branch to GitHub
2. Open a PR against `main` via the GitHub web interface
3. Add a clear description of what changed and why
4. Link any related issues
5. Assign yourself as the author

### Getting Approval

1. **Code Owner Review** will be automatically requested
2. Address any feedback from the reviewer
3. Keep pushing updates to your branch — old approvals auto-dismiss
4. **Status checks must pass**:
   - Check the deployment preview (Azure Static Web Apps)
   - Confirm no security issues in the container scan
5. Once approved and all checks pass, you can merge

### Merging

- Click **"Squash and merge"** or **"Rebase and merge"** (depending on commit history preference)
- **Do not use regular "Merge"** — this would violate the linear history requirement
- Delete the feature branch after merging

### If Status Checks Fail

**Frontend build failure** (`deploy-azure-static-web-app`):
```bash
# Run the build locally
npm run build

# Fix any errors, commit, and push
git push origin feature/my-feature
```

**Security scan failure** (`scan-container`):
- Review the scan report in the GitHub Actions workflow
- Fix vulnerabilities in the container image or dependencies
- The scan re-runs automatically on your next push

---

## CODEOWNERS

The following teams/individuals are designated as code owners and must review certain changes:

```
# See .github/CODEOWNERS for the full list
```

Code owner reviews are **required** and ensure domain expertise is applied to changes in sensitive areas (API, database, infrastructure, etc.).

---

## Branch Strategy

### Branching Model

- **`main`**: Production branch. Always stable, always deployable.
  - Protected with strict rules
  - Automatically deployed to Azure after merge
  
- **Feature branches**: Developer branches for work in progress.
  - Naming: `feature/*`, `fix/*`, `docs/*`, etc.
  - Develop against `main`
  - Merged via pull request only
  
- **Release branches** (if needed):
  - Naming: `release/v*`
  - For coordinating production releases
  - Merged back to `main` after release

### Commit Standards

While not enforced by branch protection, follow these conventions:

- **Commit messages**: Clear, present tense
  - ✅ "Add international player stats page"
  - ❌ "Added stuff" or "fixed bugs"
  
- **Scope**: Keep commits focused
  - ✅ One logical change per commit
  - ❌ Mixing unrelated fixes
  
- **Size**: Keep PRs reviewable
  - ✅ 200–500 lines per PR
  - ⚠️ >1000 lines should be split
  
- **Testing**: Include test coverage where applicable
  - ✅ New features have tests
  - ✅ Bug fixes include regression tests

---

## FAQ

### Q: Can I bypass these rules?
**A**: No. These rules apply to everyone, including administrators. This ensures consistency and accountability.

### Q: What if my status check fails?
**A**: Fix the issue locally, push your changes, and the check will re-run automatically. The `Scan container image / scan` check can fail due to:
- **API/container vulnerabilities** → Fix dependencies in `Dockerfile.azure`, `api/`, or `renv.lock`
- **Network issues** → Re-run by pushing an empty commit (`git commit --allow-empty -m "Re-run checks"`)
- **Frontend-only PR** → No Docker build needed; scan will complete quickly with a pass

For frontend changes (HTML/CSS/JS only), the scan runs in optimized mode and completes fast.

### Q: Can I merge without an approval?
**A**: No. At least one code owner approval is required. If you're the only developer, ask a colleague to review, or contact the repository administrator.

### Q: What's the difference between "Squash" and "Rebase" merge?
- **Squash**: Combines all commits in your PR into one commit on `main`. Good for clean history.
- **Rebase**: Replays your commits on top of `main`. Good for detailed commit history.
- **Merge** (standard): Forbidden — creates merge commits and violates linear history.

Use **Squash and Merge** if unsure.

### Q: How do I update my branch with the latest `main`?
```bash
# Fetch latest changes
git fetch origin

# Rebase your branch
git rebase origin/main

# Force-push your branch (safe; only affects your branch)
git push origin feature/my-feature --force-with-lease
```

### Q: Can I commit directly to `main`?
**A**: No. All changes go through pull requests. This is non-negotiable and applies to all users.

### Q: How long does the status check take?
- **Container scan**: ~1–2 minutes (frontend-only PRs, optimized)
- **Container scan**: ~4–6 minutes (API changes, includes Docker build)
- **Total**: ~5–10 minutes from push to checks complete

Faster scans for frontend-only PRs because we skip the Docker build step.

---

## Maintenance & Updates

### Updating Protection Rules

The branch protection configuration is defined in:
- **Script**: `.github/branch-protection-config.sh`
- **Documentation**: This file (`.github/BRANCH_PROTECTION.md`)

To update rules:
```bash
# Edit the script
vim .github/branch-protection-config.sh

# Re-run it to apply changes
./.github/branch-protection-config.sh
```

### Monitoring Compliance

To see merge activity and check compliance:
```bash
# View recent merges
gh pr list --state merged --limit 10

# Check branch protection status
gh api repos/craigmoyle/netballstats/branches/main/protection
```

---

## Related Documents

- **[CONTRIBUTING.md](../CONTRIBUTING.md)**: General contribution guidelines
- **[AGENTS.md](../AGENTS.md)**: Repository context and operational decisions
- **[GitHub Workflows](./workflows/)**: Automated checks (build, scan, deploy)
- **[CODEOWNERS](./CODEOWNERS)**: Code ownership and review requirements

---

## Questions?

If you're blocked by branch protection rules or have questions:

1. **Check the FAQ** above
2. **Review the error message** from GitHub — it usually tells you what's wrong
3. **Contact the repository maintainer**

---

**Last Updated**: May 22, 2026  
**Configured by**: Configuration script `.github/branch-protection-config.sh`

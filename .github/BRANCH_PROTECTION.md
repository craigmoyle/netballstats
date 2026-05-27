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

1. **Code Owner Review** may be requested automatically for relevant paths
2. Address any feedback from the reviewer
3. Keep pushing updates to your branch — old approvals auto-dismiss
4. **Status checks must pass**:
   - Confirm no security issues in the container scan
5. Once approved and all checks pass, you can merge

### Merging

- Click **"Squash and merge"** or **"Rebase and merge"** (depending on commit history preference)
- **Do not use regular "Merge"** — this would violate the linear history requirement
- Delete the feature branch after merging

### If Status Checks Fail

**Frontend build failure**:
```bash
# Run the build locally
npm run build:verify

# Fix any errors, commit, and push
git push origin feature/my-feature
```

**Security scan failure** (`Scan container image / scan`):
- Review the scan report in the GitHub Actions workflow
- Fix vulnerabilities in the container image or dependencies
- The scan re-runs automatically on your next push

---

## CODEOWNERS

The following teams/individuals are designated as code owners and may be requested to review certain changes:

```
# See .github/CODEOWNERS for the full list
```

Code owner reviews provide domain guidance for sensitive areas (API, database, infrastructure, etc.), even when self-approval is allowed.

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

### Q: Can I push directly to main?
**A**: No. The branch is protected. All changes must go through pull requests.

### Q: What if I'm blocked by a status check?
**A**: Fix the issue locally, commit, and push. The check re-runs automatically. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

### Q: What if a reviewer doesn't respond?
**A**: After 48 hours, politely ping them in the PR. Code owners are expected to review within 24–48 hours.

### Q: Can I request review from someone other than the code owner?
**A**: Yes. Click "Request review" on the PR and select whoever you want. Code owner guidance is still available for relevant paths.

### Q: What if I disagree with a review comment?
**A**: Discuss in the PR comment thread. You can push a different fix and explain why. The reviewer will reconsider.

### Q: Can I merge without addressing all feedback?
**A**: No. All conversations must be resolved, and the reviewer must approve. You can't bypass this.

### Q: How do I update my branch with the latest main?
```bash
git fetch origin
git rebase origin/main
```

### Q: Can I force push my feature branch?
**A**: Yes, but use caution. Force pushes to `main` are blocked.

### Q: Why is there a single-maintainer review policy?
**A**: It allows the repository owner to move quickly while preserving quality gates and review discipline.

---

## Related Files

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Detailed contribution workflow
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Solutions to common issues
- [CODEOWNERS](./CODEOWNERS) - Code ownership definitions
- [SETUP_SUMMARY.md](./SETUP_SUMMARY.md) - Branch protection setup record
- [branch-protection-config.sh](./branch-protection-config.sh) - Script to re-apply protection rules

---

**Last Updated**: May 27, 2026  
**Status**: ✅ Active and enforced

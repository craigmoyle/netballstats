# Branch Protection Setup Summary

**Status**: ✅ **COMPLETE** — All branch protection rules are now active on the `main` branch.

**Date Configured**: May 22, 2026  
**Configuration Method**: GitHub API via `branch-protection-config.sh` script

---

## What Was Configured

### 🛡️ Main Branch Protection Rules

The following rules are **now enforced** on the `main` branch:

| Rule | Status | Details |
|------|--------|---------|
| **Pull Request Reviews** | ✅ Enabled | Minimum 1 approval required; code owner reviews required |
| **Stale Review Dismissal** | ✅ Enabled | Old approvals auto-dismiss when new commits are pushed |
| **Last Push Approval** | ✅ Enabled | Most recent commit must be approved |
| **Status Checks (Strict)** | ✅ Enabled | `deploy-azure-static-web-app` + `scan-container` must pass |
| **Conversation Resolution** | ✅ Enabled | All comments must be resolved before merging |
| **Linear History** | ✅ Enabled | No merge commits allowed; must squash or rebase |
| **Enforce for Admins** | ✅ Enabled | Rules apply to everyone, including administrators |
| **Force Push Prevention** | ✅ Enabled | Force pushes to `main` are blocked |
| **Deletion Prevention** | ✅ Enabled | `main` branch cannot be deleted |

### 📋 Supporting Documentation Created

| File | Purpose |
|------|---------|
| **[BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md)** | Complete policy documentation and user guide |
| **[CODEOWNERS](./CODEOWNERS)** | Defines who reviews what (auto-assigned via GitHub) |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Solutions for common issues developers encounter |
| **[CONTRIBUTING.md](../CONTRIBUTING.md)** | Comprehensive contribution workflow guide |
| **[branch-protection-config.sh](./branch-protection-config.sh)** | Configuration automation script |
| **[SETUP_SUMMARY.md](./SETUP_SUMMARY.md)** | This file — deployment record |

---

## How to Use

### For Developers

1. **Read**: [CONTRIBUTING.md](../CONTRIBUTING.md) (complete workflow)
2. **Bookmark**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) (for when things go wrong)
3. **Reference**: [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) (policy details)

### For Administrators

To **update or modify** branch protection rules:

```bash
# Edit the configuration script
vim .github/branch-protection-config.sh

# Re-run to apply changes
./.github/branch-protection-config.sh

# Verify changes
gh api -X GET repos/craigmoyle/netballstats/branches/main/protection
```

To **temporarily disable** rules (emergency only):

```bash
# Delete all protection (NOT recommended)
gh api -X DELETE repos/craigmoyle/netballstats/branches/main/protection

# Re-apply rules
./.github/branch-protection-config.sh
```

---

## Development Workflow

### Typical Steps

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# ... edit files ...

# 3. Validate locally
npm run build                    # Frontend
Rscript -e "parse(file='api/plumber.R')"  # Backend

# 4. Commit and push
git add .
git commit -m "Add international player stats page"
git push origin feature/my-feature

# 5. Open pull request on GitHub
# (GitHub automatically triggers status checks)

# 6. Address review feedback
# (reviewer will request changes if needed)

# 7. When approved and all checks pass, merge
# (use "Squash and merge" or "Rebase and merge")
```

### Branch Naming Conventions (Recommended)

- `feature/*` — New features (e.g., `feature/international-stats`)
- `fix/*` — Bug fixes (e.g., `fix/player-search-typo`)
- `docs/*` — Documentation (e.g., `docs/api-reference`)
- `refactor/*` — Code refactoring (e.g., `refactor/extract-helpers`)
- `perf/*` — Performance improvements (e.g., `perf/cache-api-responses`)

---

## Key Rules and Why They Matter

### ✅ 1-Approval Requirement

**What**: At least one code owner must approve before merge.

**Why**: 
- Catches mistakes and maintains quality
- Ensures knowledge sharing
- Prevents single points of failure

**For Solo Developers**: You still need external review. Ask colleagues or contact the maintainer.

### ✅ Code Owner Reviews

**What**: Certain files require specific people to review (see [CODEOWNERS](./CODEOWNERS)).

**Why**:
- API changes should be reviewed by API experts
- Infrastructure changes should be reviewed by DevOps experts
- Frontend changes should be reviewed by design-aware developers

**CODEOWNERS Includes**:
- `api/` → API owner (must review all API changes)
- `infra/` → Infrastructure owner (must review all Azure/Bicep changes)
- `assets/` → Frontend owner (must review all shared UI changes)
- etc.

### ✅ Status Checks (Strict Mode)

**What**: Two automated checks must pass:
1. `deploy-azure-static-web-app` — Frontend build succeeds
2. `scan-container` — Container image has no high/critical vulnerabilities

**Why**:
- Ensures code actually compiles and builds
- Catches security issues before production
- Strict mode = checks based on your branch tip, not old base commit

### ✅ Linear History

**What**: No "merge commits" allowed. Must squash or rebase.

**Why**:
- Keeps main branch history clean and readable
- Makes `git log` and `git bisect` more useful
- Prevents branch-merge clutter

**How to Merge**:
- Use GitHub's **"Squash and merge"** (recommended)
- Or **"Rebase and merge"** if you have multiple related commits
- Never use **"Create a merge commit"**

### ✅ Conversation Resolution

**What**: All PR comments/feedback must be marked "resolved" before merge.

**Why**: Prevents forgetting feedback or committing without addressing concerns.

**How**: Reviewer or author can click "Resolve" on comments in the PR.

### ✅ Stale Review Dismissal

**What**: If you push new commits after getting approval, the approval is dismissed.

**Why**: Ensures reviewers actually review your final code, not an earlier version.

**What Happens**:
1. You get approval
2. You push a new commit to fix something
3. Approval is automatically dismissed
4. Reviewer sees the update and approves again

---

## Status Check Details

### deploy-azure-static-web-app

- **What it checks**: Frontend build succeeds (`npm run build`)
- **How long**: ~2–3 minutes
- **When it runs**: Every PR to `main`, and `main` itself
- **Failure meaning**: Frontend has build errors (syntax, missing modules, etc.)
- **How to fix**:
  ```bash
  npm run build
  # Fix errors
  git add .
  git commit -m "Fix: Build error"
  git push origin feature/my-feature
  ```

### scan-container

- **What it checks**: Container image for security vulnerabilities
- **How long**: ~3–5 minutes
- **When it runs**: Every PR targeting `main`
- **Failure meaning**: High or critical vulnerabilities found
- **How to fix**:
  1. Review the scan report in GitHub Actions
  2. Update vulnerable dependencies
  3. Push the fix — scan re-runs automatically

---

## Common Developer Questions

### Q: Can I push directly to main?
**A**: No. The branch is protected. All changes must go through pull requests.

### Q: What if I'm blocked by a status check?
**A**: Fix the issue locally, commit, and push. The check re-runs automatically. See [TROUBLESHOOTING.md](./.github/TROUBLESHOOTING.md).

### Q: What if a reviewer doesn't respond?
**A**: After 48 hours, politely ping them in the PR. Code owners are expected to review within 24–48 hours.

### Q: Can I request review from someone other than the code owner?
**A**: Yes. Click "Request review" on the PR and select whoever you want. Code owner is still required, so you need both.

### Q: What if I disagree with a review comment?
**A**: Discuss in the PR comment thread. You can push a different fix and explain why. The reviewer will reconsider.

### Q: Can I merge without addressing all feedback?
**A**: No. All conversations must be resolved, and the reviewer must approve. You can't bypass this.

### Q: How do I update my branch with the latest main?
```bash
git fetch origin
git rebase origin/main
git push origin feature/my-feature --force-with-lease
```

---

## Monitoring and Verification

### Check Current Protection Status

```bash
# View all protection rules
gh api -X GET repos/craigmoyle/netballstats/branches/main/protection --jq .

# View just required status checks
gh api -X GET repos/craigmoyle/netballstats/branches/main/protection --jq '.required_status_checks'

# View PR/review requirements
gh api -X GET repos/craigmoyle/netballstats/branches/main/protection --jq '.required_pull_request_reviews'
```

### Recent Merges and Compliance

```bash
# View recently merged PRs
gh pr list --state merged --limit 10

# View a specific PR's checks
gh pr view 123 --json statusCheckRollup
```

---

## Future Enhancements

### Possible Additions (Not Enabled Yet)

- **Commit signing requirement**: Require GPG-signed commits
- **Auto-merge rules**: Automatically merge PR when all checks pass
- **Dismiss on-code-push**: Even stricter: reviewer must re-approve after any push
- **Multiple approvals**: Require 2+ approvals for high-risk changes
- **Protected branches for releases**: Create `release/*` branches with their own rules

### To Enable These

Edit `branch-protection-config.sh` and add the parameters, then re-run:

```bash
./.github/branch-protection-config.sh
```

---

## Files Modified/Created

```
.github/
├── BRANCH_PROTECTION.md              [NEW] Policy documentation
├── CODEOWNERS                        [NEW] Code ownership definitions
├── TROUBLESHOOTING.md                [NEW] Troubleshooting guide
├── branch-protection-config.sh       [NEW] Configuration script
└── SETUP_SUMMARY.md                  [NEW] This summary

CONTRIBUTING.md                        [NEW] Contribution workflow guide
```

---

## Rollback Instructions

If you need to disable branch protection entirely (emergency only):

```bash
# DELETE ALL PROTECTION
gh api -X DELETE repos/craigmoyle/netballstats/branches/main/protection

# To restore, run the config script again
./.github/branch-protection-config.sh
```

---

## Next Steps for Team

1. **Read the docs**: Share [CONTRIBUTING.md](../CONTRIBUTING.md) with your team
2. **Bookmark troubleshooting**: [TROUBLESHOOTING.md](./.github/TROUBLESHOOTING.md)
3. **Test a PR**: Create a test PR to verify the workflow works
4. **Feedback**: If rules are too strict, we can adjust (edit the script and re-run)

---

## Questions or Issues?

- **How do I...?** → See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **My PR is blocked!** → See [TROUBLESHOOTING.md](./.github/TROUBLESHOOTING.md)
- **I want to change rules** → Edit `.github/branch-protection-config.sh` and re-run
- **Something's broken** → Check [TROUBLESHOOTING.md](./.github/TROUBLESHOOTING.md) or open an issue

---

**Configuration completed successfully on May 22, 2026.**

For the full policy details, see [BRANCH_PROTECTION.md](./.github/BRANCH_PROTECTION.md).

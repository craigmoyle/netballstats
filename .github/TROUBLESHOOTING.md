# Troubleshooting Branch Protection and PR Workflow

This guide helps resolve common issues you might encounter with the branch protection rules and pull request workflow.

---

## Status Checks Not Passing

### Problem: "deploy-azure-static-web-app" Check Failing

**Symptoms**: Red ✗ next to "deploy-azure-static-web-app" in your PR.

**Cause**: Frontend build failed. The code doesn't compile.

**Solution**:
```bash
# Run the build locally to see the error
npm run build

# Common errors:
# - Syntax errors in JavaScript
# - Missing imports or undefined variables
# - CSS issues
# - Build script configuration

# Fix the error, then commit and push
git add .
git commit -m "Fix: Resolve build error in [file]"
git push origin feature/my-feature

# The check will re-run automatically
```

**More Help**:
- Check the GitHub Actions workflow logs for detailed error output
- Click the failing check → "Details" → "Build logs"
- Look for error line numbers and messages

---

### Problem: "scan-container" Check Failing

**Symptoms**: Red ✗ next to "scan-container" in your PR.

**Cause**: Container image has security vulnerabilities.

**Solution**:
```bash
# 1. Check the scan report in GitHub Actions
# Click the failing check → "Details" → "Scan results"

# 2. Review vulnerabilities
# - High/Critical: Must fix before merge
# - Medium/Low: Consider fixing if easy

# 3. Fix dependencies (most common cause)
# Update vulnerable packages in your changes

# 4. Commit and push
git add .
git commit -m "Fix: Update vulnerable dependencies"
git push origin feature/my-feature

# The scan will re-run automatically
```

**If Scan Still Fails**:
- Some vulnerabilities are in transitive dependencies (dependencies of dependencies)
- Document the issue and contact the maintainer
- You may need a security exception for known, unavoidable issues

---

### Problem: Both Checks Pass But PR Won't Merge

**Symptoms**: Checks show green ✓, but "Merge" button is disabled.

**Cause**: Other requirements not met (see below).

**Check These**:
- [ ] PR has at least 1 approval from a code owner?
- [ ] All conversations are resolved (no unresolved comments)?
- [ ] Your branch is up-to-date with main (no conflict)?

If yes to all, wait a moment and refresh the page. GitHub sometimes needs a few seconds to update.

---

## Review and Approval Issues

### Problem: "Waiting on code owner review"

**Symptoms**: Code owner hasn't responded yet.

**What's Normal**:
- Code owner review typically takes 24–48 hours
- If you're in a different timezone, expect longer

**What You Can Do**:
- Ping the reviewer in a comment if it's been >48 hours
- Tag them: `@username, could you review when available?`
- Check if they're on vacation or have high PR load

### Problem: "Changes were requested, but I've fixed them"

**Symptoms**: Comment says "Changes requested" but you've pushed new commits.

**What Happens**:
- When you push new commits, old approvals automatically dismiss
- The code owner **will see the update** when they check
- You don't need to request re-review
- They'll review and approve again (or ask for more changes)

**Patience Note**: Give reviewers 24 hours to re-review after you push fixes.

---

## Merge Conflicts

### Problem: "This branch has conflicts that must be resolved"

**Symptoms**: Orange warning: "This branch has conflicts with the base branch"

**Cause**: Someone merged changes to main that conflict with your branch.

**Solution**:
```bash
# Fetch the latest main
git fetch origin

# Rebase your branch onto main
git rebase origin/main

# Git will pause if there are conflicts
# Edit the files with conflict markers (<<<<<<, ======, >>>>>>)
# Resolve the conflicts, keeping the logic you want

# Continue the rebase
git rebase --continue

# Force-push your branch (safe; only affects your branch)
git push origin feature/my-feature --force-with-lease
```

**If Rebase Fails**:
```bash
# Abort the rebase and try again
git rebase --abort

# Or merge instead of rebasing (if you prefer)
git merge origin/main
git push origin feature/my-feature
```

**In GitHub UI** (alternative):
- GitHub offers "Resolve conflicts" button in the PR
- This launches a web editor for simpler conflicts
- Works only for non-binary files

---

## Branch and History Issues

### Problem: "Require linear history" — can't merge

**Symptoms**: Error message mentions linear history.

**Cause**: You used "Create a merge commit" instead of "Squash" or "Rebase".

**Solution**:
- Close the merge dialog
- Use **"Squash and merge"** instead
- Or use **"Rebase and merge"** if you have multiple logical commits

**Why**:
- Linear history keeps the commit log clean
- Makes it easier to bisect and revert changes
- One commit = one feature/fix (squash) or related commits (rebase)

---

### Problem: Can't push to main / "branch is protected"

**Symptoms**: `git push origin main` fails with "Protected branch" error.

**This is Intentional**:
- You should never push directly to main
- All changes must go through pull requests
- Even administrators can't bypass this

**What to Do**:
1. Create a feature branch: `git checkout -b feature/my-feature`
2. Push that: `git push origin feature/my-feature`
3. Open a pull request on GitHub
4. Go through the review process
5. Merge via the PR

---

### Problem: Lost Commits After Force Push

**Symptoms**: Commits from your branch disappeared after `git push --force`.

**Prevention for Future**:
- Use `--force-with-lease` instead of `--force`
- This is safer: it fails if someone else has pushed to your branch
```bash
git push origin feature/my-feature --force-with-lease
```

**If You've Already Lost Commits**:
```bash
# Check the reflog to find the commit hash
git reflog

# Create a new branch from the lost commit
git checkout -b feature/recovered e1234567

# Push it back
git push origin feature/recovered
```

Then open a new PR if needed.

---

## Code Owner and Review Issues

### Problem: "Code owner review required" but I don't see who

**Symptoms**: PR says "Waiting for review" but no reviewer is listed.

**Why**:
- The CODEOWNERS file specifies who reviews what
- The owner might be `@craigmoyle` or a team

**Check**:
- Look at [.github/CODEOWNERS](.github/CODEOWNERS) for your files
- Check the "Reviewers" panel on the right side of the PR
- Look for the orange "Request review" section

**If Reviewer Isn't Showing**:
- Click "Request review" and select the owner manually
- Or mention them in a comment: `@username, ready for review`

### Problem: "Code owner review" requirement applies to my own PR

**Symptoms**: You opened a PR but it still requires code owner review (it's you).

**This is Intentional**:
- Even code owners must have their changes reviewed by someone else
- This ensures accountability and prevents mistakes
- Ask a colleague to review, or contact the repo maintainer

---

## Git and Local Issues

### Problem: "Your branch is behind 'origin/main'"

**Symptoms**: You're on `main` locally and behind the remote.

**Solution**:
```bash
# Only do this if you're on a feature branch (never on main)
git checkout feature/my-feature

# Fetch latest changes
git fetch origin

# Rebase your branch
git rebase origin/main

# Push
git push origin feature/my-feature
```

---

### Problem: "Detached HEAD" state

**Symptoms**: Git says you're not on a branch, or commands fail mysteriously.

**Cause**: You checked out a commit directly instead of a branch.

**Solution**:
```bash
# Check your current state
git status

# If you see "HEAD detached at...", switch to a branch
git checkout feature/my-feature

# Or create a new branch if you made commits in detached state
git checkout -b feature/new-branch
```

---

### Problem: "fatal: not a git repository"

**Symptoms**: Git commands fail with "not a git repository" error.

**Cause**: You're not in the repo directory.

**Solution**:
```bash
# Check where you are
pwd

# Navigate to the repo
cd /Users/craig/Git/netballstats

# Confirm
git status
```

---

## Build and Deployment Issues

### Problem: npm build fails locally

**Symptoms**: `npm run build` errors, but you need to commit and push.

**Don't Push**:
- The status check will also fail on GitHub
- Fix locally first

**To Debug**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build

# Check the output for the actual error
```

---

### Problem: renv or R dependencies broken

**Symptoms**: R scripts fail, or API won't start.

**Solution**:
```bash
# Restore R dependencies
Rscript -e "renv::restore()"

# Validate syntax
Rscript -e "parse(file='api/plumber.R')"
Rscript -e "parse(file='api/R/helpers.R')"
```

---

## Getting More Help

### If This Guide Doesn't Help

1. **Check the full documentation**:
   - [BRANCH_PROTECTION.md](./.github/BRANCH_PROTECTION.md)
   - [CONTRIBUTING.md](../CONTRIBUTING.md)
   - [AGENTS.md](../AGENTS.md)

2. **Search GitHub Issues**: https://github.com/craigmoyle/netballstats/issues

3. **Open an Issue**: https://github.com/craigmoyle/netballstats/issues/new

4. **Contact the Maintainer**: Craig Moyle

### When Reporting Issues

Include:
- What you did (command or action)
- What you expected
- What actually happened
- Error messages (exact text, not paraphrased)
- Your environment (OS, Node/R versions)

Example:
```
I ran `npm run build` and got:
  Error: Cannot find module '@tailwindcss/forms'

Environment:
  - macOS 14.4
  - Node v18.16.0
  - npm 9.6.7
```

---

**Last Updated**: May 22, 2026  
**Related Files**: [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md), [CONTRIBUTING.md](../CONTRIBUTING.md)

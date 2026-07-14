# GitHub Configuration for netballstats

This directory contains GitHub-specific configuration, workflows, and documentation for the netballstats repository.

---

## 🛡️ Branch Protection & Contribution Guide

The `main` branch is protected with strict rules to ensure code quality, security, and reliable deployments.

### For Developers

Start here: **[CONTRIBUTING.md](../CONTRIBUTING.md)**
- How to set up your environment
- Development workflow (branches → PR → review → merge)
- Code style and conventions
- Testing and validation

### If You're Stuck

See: **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**
- Status check failures (build, security scan)
- Review and approval issues
- Git and merge conflicts
- Local development problems

### Understanding the Rules

Read: **[BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md)**
- Complete policy reference
- Why each rule exists
- FAQ and examples

### Code Ownership

See: **[CODEOWNERS](./CODEOWNERS)**
- Who reviews what code
- Auto-enforced by GitHub
- Defines which files may request specific reviewers

---

## 📋 Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| **[CONTRIBUTING.md](../CONTRIBUTING.md)** | Development workflow and contribution guide | Everyone |
| **[AGENTS.md](../AGENTS.md)** | Canonical agent operating guidance | Agents, maintainers |
| **[CLAUDE.md](../CLAUDE.md)** | Product design context | Agents, designers |
| **[DESIGN.md](../DESIGN.md)** | Design tokens and system spec | Agents, designers |
| **[BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md)** | Branch protection policy and rules | Everyone |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Solutions for common issues | Developers |
| **[CODEOWNERS](./CODEOWNERS)** | Code ownership definitions | Developers, Maintainers |
| **[SETUP_SUMMARY.md](./SETUP_SUMMARY.md)** | Configuration details and record | Maintainers |

---

## ⚙️ Configuration Files

| File | Purpose |
|------|---------|
| **[branch-protection-config.sh](./branch-protection-config.sh)** | Automated branch protection setup (executable) |
| **[CODEOWNERS](./CODEOWNERS)** | Code ownership definitions for review guidance |
| **[dependabot.yml](./dependabot.yml)** | Automated dependency updates |

---

## 🔄 Workflows (CI/CD)

GitHub Actions workflows in [workflows/](./workflows/):

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **deploy-azure-static-web-app.yml** | Push to `main` | Build and deploy frontend to Azure Static Web Apps |
| **scan-container.yml** | PR to `main` | Security scan of container images |
| **cleanup-registry.yml** | Manual trigger | Remove old container images from registry |

These are referenced in branch protection rules and must pass before merge.

---

## 🚀 Getting Started

### 1. First Time Contributing?

```bash
# 1. Read the workflow
cat CONTRIBUTING.md

# 2. Clone the repo
git clone https://github.com/craigmoyle/netballstats.git
cd netballstats

# 3. Create a feature branch
git checkout -b feature/my-feature

# 4. Make your changes
npm run build:verify  # Frontend validation
Rscript -e "..."       # Backend validation

# 5. Push and create PR
git add .
git commit -m "Add my feature"
git push origin feature/my-feature
# Open PR on GitHub

# 6. Wait for review and status checks
# 7. Merge when approved
```

### 2. Need Help?

- **Workflow questions?** → [CONTRIBUTING.md](../CONTRIBUTING.md)
- **PR is blocked?** → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Policy questions?** → [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md)

### 3. Maintaining Branch Protection?

```bash
# View current rules
gh api -X GET repos/craigmoyle/netballstats/branches/main/protection

# Modify rules
vim branch-protection-config.sh
./branch-protection-config.sh

# Verify changes
gh api -X GET repos/craigmoyle/netballstats/branches/main/protection
```

---

## 📚 Quick Reference

### Branch Protection Rules

✅ **1 approval required**  
✅ **Status checks must pass** (strict mode)  
✅ **Conversation resolution required**  
✅ **Linear history** (squash/rebase, no merge commits)  
✅ **Force push prevention**  
✅ **Deletion prevention**  
✅ **Admin enforcement**  

### Status Checks

- `Scan container image / scan` — Security scanning

### Code Owners

- **API** (`api/`, `api/R/`) → @craigmoyle
- **Infrastructure** (`infra/`, `azure.yaml`) → @craigmoyle
- **Frontend** (`assets/`, `*.html`) → @craigmoyle
- Default → @craigmoyle

(See [CODEOWNERS](./CODEOWNERS) for complete list)

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| "Scan container image / scan failed" | Fix vulnerable dependencies, push again |
| "PR is blocked from merging" | Check approval, status checks, conversation resolution |
| "Branch is behind main" | `git rebase origin/main && git push --force-with-lease` |
| "Can't push to main" | Use a feature branch; all changes go through PRs |

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions.

---

## 📞 Support

- **Contributions**: See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Issues**: [GitHub Issues](https://github.com/craigmoyle/netballstats/issues)
- **Discussions**: [GitHub Discussions](https://github.com/craigmoyle/netballstats/discussions)

---

**Last Updated**: May 27, 2026  
**Status**: ✅ Active and enforced

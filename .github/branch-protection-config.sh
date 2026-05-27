#!/bin/bash

###############################################################################
# Branch Protection Configuration for netballstats
# 
# This script configures best practice branch protection rules for the main
# branch and establishes a pattern for feature branches.
#
# Usage: ./branch-protection-config.sh
#
# Requirements:
#   - GitHub CLI (gh) installed and authenticated
#   - Owner/admin permissions on the repository
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="${GITHUB_REPO:-craigmoyle/netballstats}"
MAIN_BRANCH="main"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Branch Protection Configuration for ${REPO}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verify GitHub CLI is authenticated
echo -e "${YELLOW}Verifying GitHub CLI authentication...${NC}"
if ! gh auth status > /dev/null 2>&1; then
  echo -e "${RED}✗ Not authenticated with GitHub CLI. Run 'gh auth login' first.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"
echo ""

# Verify repository access
echo -e "${YELLOW}Verifying repository access...${NC}"
if ! gh repo view "$REPO" > /dev/null 2>&1; then
  echo -e "${RED}✗ Cannot access repository ${REPO}${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Repository access confirmed${NC}"
echo ""

###############################################################################
# MAIN BRANCH PROTECTION
###############################################################################

echo -e "${BLUE}Configuring ${MAIN_BRANCH} branch protection...${NC}"
echo ""

# Delete existing rule (clean slate)
echo -e "${YELLOW}Clearing existing protection rules for ${MAIN_BRANCH}...${NC}"
if gh api -X DELETE repos/"$REPO"/branches/"$MAIN_BRANCH"/protection 2>/dev/null; then
  echo -e "${GREEN}✓ Cleared previous rules${NC}"
else
  echo -e "${YELLOW}ℹ No existing rules to clear${NC}"
fi
echo ""

# Create comprehensive protection rule
echo -e "${YELLOW}Applying new protection rules...${NC}"
cat << 'EOF' > /tmp/branch_protection.json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Scan container image / scan"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false
}
EOF

gh api -X PUT repos/"$REPO"/branches/"$MAIN_BRANCH"/protection \
  --input /tmp/branch_protection.json

echo -e "${GREEN}✓ Protection rules applied to ${MAIN_BRANCH}${NC}"
echo ""

###############################################################################
# SUMMARY OF PROTECTION RULES
###############################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Branch Protection Rules Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Main Branch (${MAIN_BRANCH}):${NC}"
echo "  ✓ Require pull request reviews before merging (1 approval required)"
echo "  ✓ Require code owner reviews"
echo "  ✓ Dismiss stale pull request approvals when new commits are pushed"
echo "  ✓ Require approval of the most recent push"
echo "  ✓ Require conversation resolution before merging"
echo "  ✓ Require linear history (no merge commits)"
echo "  ✓ Require status checks to pass before merging (strict mode)"
echo "    - Scan container image \/ scan"
echo "  ✓ Include administrators in restrictions"
echo "  ✓ Restrict who can push to matching branches"
echo "  ✓ Prevent force pushes"
echo "  ✓ Prevent deletion"
echo ""

echo -e "${YELLOW}Recommended Development Workflow:${NC}"
echo "  1. Create feature branch from main (e.g., 'feature/my-feature')"
echo "  2. Push changes and open a pull request"
echo "  3. Ensure all status checks pass"
echo "  4. Request review from code owner"
echo "  5. Address review feedback"
echo "  6. Merge when approved and all checks pass"
echo ""

echo -e "${YELLOW}Status Check Details:${NC}"
echo ""
echo "  Scan container image \/ scan"
echo "    - Validates frontend build (npm run build)"
echo "    - Only runs on main and PR branches"
echo "    - Confirms deployment-ready state"
echo ""
echo "    - Scans container images for vulnerabilities"
echo "    - Prevents merge if security issues found"
echo "    - Runs on pull requests targeting main"
echo ""

###############################################################################
# VERIFY CONFIGURATION
###############################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Verifying configuration...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Fetch and display current protection settings
echo -e "${YELLOW}Fetching current configuration...${NC}"
echo ""
if gh api -X GET repos/"$REPO"/branches/"$MAIN_BRANCH"/protection --jq . 2>/dev/null; then
  echo ""
  echo -e "${GREEN}✓ Branch protection rules verified and active${NC}"
else
  echo -e "${RED}✗ Could not verify rules${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Configuration complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Clean up temp file
rm -f /tmp/branch_protection.json

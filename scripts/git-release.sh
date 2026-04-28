#!/bin/bash
set -e

# Hardened Owner Guard: Verifies active GitHub CLI session identity
GH_USER=$(gh api user --jq '.login' 2>/dev/null || echo "anonymous")
if [ "$GH_USER" != "chitrank2050" ]; then
  echo "❌ Error: Unauthorized. Active GitHub session must be 'chitrank2050'."
  exit 1
fi

# Source the logger utility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/logger.sh"

log_header "🚀 Meterplex Release Pipeline"

# Get current version from package.json
VERSION=$(node -p "require('./package.json').version")

# Step 1: Generate Changelog
log_step 1 4 "Generating automated changelog..."
if ! command -v git-cliff &> /dev/null; then
    log_error "git-cliff is not installed. Please install it to generate changelogs."
    exit 1
fi

git-cliff --tag "v$VERSION" --output CHANGELOG.md
log_success "CHANGELOG.md updated."

# Step 2: Commit & Push Changelog
log_step 2 4 "Committing changelog updates..."
git add CHANGELOG.md
if ! git diff --cached --quiet; then
    git commit --no-verify -m "docs: update changelog for v$VERSION"
    log_wait "Pushing changelog to origin..."
    git push
    log_success "Changelog pushed."
else
    log_info "No changelog changes detected. Skipping commit."
fi

# Step 3: Extract Release Notes
log_step 3 4 "Extracting latest release notes..."
NOTES=$(git-cliff --latest --strip all 2>/dev/null)
if [ -z "$NOTES" ]; then
    log_warn "Could not extract specific notes for v$VERSION. Using generic title."
    NOTES="Release v$VERSION"
fi
log_success "Release notes extracted."

# Step 4: GitHub Release
log_step 4 4 "Creating GitHub Release..."
if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) is not installed. Cannot create remote release."
    exit 1
fi

if gh release edit "v$VERSION" --title "v$VERSION" --notes "$NOTES" 2>/dev/null; then
    log_success "Existing release v$VERSION updated."
else
    if gh release create "v$VERSION" --title "v$VERSION" --notes "$NOTES"; then
        log_success "New GitHub Release v$VERSION created!"
    else
        log_error "Failed to create GitHub Release."
        exit 1
    fi
fi

log_header "✅ v$VERSION Released Successfully!"
log_info "Release URL: https://github.com/chitrank2050/meterplex/releases/tag/v$VERSION"
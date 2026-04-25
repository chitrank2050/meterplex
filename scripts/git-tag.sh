#!/bin/bash
set -e

# Source the logger utility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/logger.sh"

log_header "🏷️  Project Tagging Protocol"

# Get current version from package.json
VERSION=$(node -p "require('./package.json').version")

log_wait "Preparing to tag v$VERSION..."

# Check if tag already exists
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
    log_error "Tag v$VERSION already exists locally."
    exit 1
fi

# Step 1: Create local tag
log_step 1 2 "Creating local tag v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"
log_success "Local tag created."

# Step 2: Push to remote
log_step 2 2 "Pushing tag v$VERSION to origin..."
if ! git push origin "v$VERSION"; then
    log_error "Failed to push tag to origin."
    exit 1
fi

log_success "Tag v$VERSION is now live on GitHub."
log_header "✅ v$VERSION Tagged Successfully"
#!/bin/bash

# Source the logger utility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/logger.sh"

# Define total steps
TOTAL_STEPS=5

log_header "🪄  Initiating Obliviate Protocols..."

# Step 1: Build artifacts
log_step 1 $TOTAL_STEPS "Removing build artifacts..."
rm -rf dist
rm -rf generated
log_success "Build folders cleared."

# Step 2: Dependencies
log_step 2 $TOTAL_STEPS "Destroying dependencies..."
rm -rf node_modules
log_success "node_modules removed."

# Step 3: Lockfiles
log_step 3 $TOTAL_STEPS "Deleting lockfiles..."
rm -f pnpm-lock.yaml package-lock.json yarn.lock bun.lockb
log_success "Lockfiles purged."

# Step 4: Test & Lint artifacts
log_step 4 $TOTAL_STEPS "Clearing test & lint caches..."
rm -rf coverage
rm -f .eslintcache
log_success "Caches cleared."

# Step 5: Caches & Hooks
log_step 5 $TOTAL_STEPS "Wiping infrastructure caches..."
rm -rf .husky/_ .turbo .lefthook site
log_success "Lefthook & MkDocs caches cleared."

log_header "✨ Meterplex is now a blank slate."
log_info "Run 'pnpm install' or './scripts/install.sh' to rebuild."

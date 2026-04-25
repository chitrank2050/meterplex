#!/bin/bash

# Source the logger utility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/logger.sh"

# Define total steps
TOTAL_STEPS=6

log_header "Meterplex - Installation Protocol"

# Step 1: Check for pnpm
log_step 1 $TOTAL_STEPS "Checking package manager..."
if ! command -v pnpm &> /dev/null; then
    log_error "pnpm is not installed. Please install it first from https://pnpm.io/"
    exit 1
fi
log_success "pnpm detected."

# Step 2: Environment configuration
log_step 2 $TOTAL_STEPS "Configuring environment..."
if [ ! -f .env ]; then
    log_info ".env not found. Copying from .env.example..."
    cp .env.example .env
    log_success ".env created."
else
    log_info ".env already exists. Skipping copy."
fi

# Step 3: Install dependencies
log_step 3 $TOTAL_STEPS "Installing dependencies..."
if [ -f pnpm-lock.yaml ]; then
    log_wait "Lockfile detected. Running frozen install..."
    pnpm install --frozen-lockfile
else
    log_warn "No lockfile found. Running standard install..."
    pnpm install
fi
log_success "Dependencies installed."

# Step 4: Generate Prisma client
log_step 4 $TOTAL_STEPS "Generating Prisma client..."
if ! pnpm db:generate; then
    log_error "Prisma client generation failed."
    exit 1
fi
log_success "Prisma client ready."

# Step 5: Check for local security tools
log_step 5 $TOTAL_STEPS "Verifying security tooling..."
if ! command -v gitleaks &> /dev/null; then
    log_warn "gitleaks not found. Local secret scanning will be skipped. (Install: brew install gitleaks)"
else
    log_success "gitleaks detected."
fi

if ! command -v zizmor &> /dev/null; then
    log_warn "zizmor not found. Local workflow linting will be skipped. (Install: brew install zizmor)"
else
    log_success "zizmor detected."
fi

# Step 6: Verify
log_step 6 $TOTAL_STEPS "Final verification..."
if [ -d "node_modules" ]; then
    log_success "Verification complete."
    log_header "🎉 Meterplex is ready for development!"
    echo -e "Next steps:"
    echo -e "  1. pnpm docker:up    (Start infrastructure)"
    echo -e "  2. pnpm db:seed      (Seed development data)"
    echo -e "  3. pnpm start:dev    (Start the application)"
    exit 0
else
    log_error "node_modules missing after install. Something went wrong."
    exit 1
fi

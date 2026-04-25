#!/bin/bash
set -e

# Source the logger utility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/logger.sh"

log_header "🧹 Meterplex Docker Cleanup"

log_step 1 2 "Stopping and removing Meterplex infrastructure..."
# -v removes named volumes defined in the compose file
# --remove-orphans removes containers for services not defined in the compose file
if docker compose down -v --remove-orphans; then
    log_success "All Meterplex-specific containers and volumes have been purged."
else
    log_error "Cleanup failed. Make sure you have the necessary permissions."
    exit 1
fi

log_step 2 2 "Pruning project-specific build cache..."
# This only targets the current project scope
docker builder prune -f --filter "label=com.docker.compose.project=meterplex"

log_success "Cleanup complete. Your environment is now a blank slate for Meterplex."
log_header "✅ Infrastructure Purged"

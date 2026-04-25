#!/bin/bash
set -e

# Source the logger utility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/logger.sh"

log_header "🐳 Meterplex Infrastructure Setup"

CLEAN_MODE=false
if [[ "$1" == "--clean" ]]; then
    CLEAN_MODE=true
fi

# Step 1: Cleanup
if [ "$CLEAN_MODE" = true ]; then
    log_step 1 4 "Nuking existing infrastructure (Volumes + Containers)..."
    docker compose down -v --remove-orphans
    log_success "Infrastructure purged."
else
    log_step 1 4 "Stopping existing containers..."
    docker compose down
    log_success "Containers stopped."
fi

# Step 2: Spin up
log_step 2 4 "Spinning up fresh containers..."
if ! docker compose up -d; then
    log_error "Failed to start Docker Compose services."
    exit 1
fi
log_success "Postgres, Kafka, and Redis are starting up."

# Step 3: Health Check
log_step 3 4 "Waiting for services to become healthy..."
log_wait "This may take up to 30 seconds for Kafka to stabilize..."

# A simple wait loop for Postgres
RETRIES=10
while ! docker exec meterplex-postgres pg_isready -U meterplex > /dev/null 2>&1; do
    if [ $RETRIES -eq 0 ]; then
        log_error "Postgres failed to become ready in time."
        exit 1
    fi
    echo -ne "      -> Waiting for Postgres... ($RETRIES retries left)\r"
    RETRIES=$((RETRIES-1))
    sleep 3
done
echo -e "\n"
log_success "Infrastructure is healthy."

# Step 4: Seed
log_step 4 4 "Seeding development data..."
if ! pnpm db:seed; then
    log_error "Database seeding failed."
    exit 1
fi

log_success "Development data seeded."
log_header "✅ Infrastructure Setup Complete"
log_info "Infrastructure is running (UI is dormant to save CPU)."
log_info "To see Kafka messages, run: pnpm docker:ui"

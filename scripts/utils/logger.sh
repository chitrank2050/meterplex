#!/bin/bash

# =============================================================
# Meterplex - Logging Utility
# 
# Provides consistent, colored, and structured terminal output
# for all project scripts.
# =============================================================

# Colors (ANSI)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Symbols
SUCCESS="✅"
ERROR="❌"
INFO="ℹ️"
STEP="👉"
WARN="⚠️"
WAIT="⏳"

# Logging Functions
log_info() {
    echo -e "${BLUE}${INFO} ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}${SUCCESS} ${1}${NC}"
}

log_error() {
    echo -e "${RED}${ERROR} ${BOLD}Error: ${1}${NC}"
}

log_warn() {
    echo -e "${YELLOW}${WARN} ${1}${NC}"
}

log_step() {
    local step=$1
    local total=$2
    local message=$3
    echo -e "${CYAN}${BOLD}[${step}/${total}] ${message}${NC}"
}

log_header() {
    echo -e "\n${PURPLE}${BOLD}=============================================================${NC}"
    echo -e "${PURPLE}${BOLD}  ${1}${NC}"
    echo -e "${PURPLE}${BOLD}=============================================================${NC}\n"
}

log_wait() {
    echo -e "${YELLOW}${WAIT} ${1}${NC}"
}

# Export functions for use in other scripts
export -f log_info log_success log_error log_warn log_step log_header log_wait

#!/bin/bash

# Define total steps
TOTAL_STEPS=6

echo "🚀 Starting installation process..."

# Step 1: Check for pnpm
echo "[1/$TOTAL_STEPS] 🔍 Checking package manager..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed. Please install it first."
    exit 1
fi

# Step 2: Environment configuration
echo "[2/$TOTAL_STEPS] 🔑 Checking environment files..."
if [ ! -f .env ]; then
    echo "      -> .env not found. Copying from .env.example..."
    cp .env.example .env
else
    echo "      -> .env already exists. Skipping."
fi

# Step 3: Install dependencies
echo "[3/$TOTAL_STEPS] 📦 Installing dependencies..."
if [ -f pnpm-lock.yaml ]; then
    echo "      -> Lockfile detected. Running frozen install..."
    pnpm install --frozen-lockfile
else
    echo "      -> No lockfile found. Running standard install..."
    pnpm install
fi

# Step 4: Generate Prisma client
echo "[4/$TOTAL_STEPS] 💎 Generating Prisma client..."
if ! pnpm db:generate; then
    echo "❌ Error: Prisma generation failed."
    exit 1
fi

# Step 5: Check for local security tools
echo "[5/$TOTAL_STEPS] 🛡️ Checking security tools..."
if ! command -v gitleaks &> /dev/null; then
    echo "      -> ⚠️ Warning: gitleaks not found. Local secret scanning will be skipped."
fi
if ! command -v zizmor &> /dev/null; then
    echo "      -> ⚠️ Warning: zizmor not found. Local workflow linting will be skipped."
fi

# Step 6: Verify
echo "[6/$TOTAL_STEPS] ✅ Verifying installation..."
if [ -d "node_modules" ]; then
    echo "🎉 Success! Dependencies and Prisma client are ready."
    exit 0
else
    echo "❌ Error: node_modules folder missing after install."
    exit 1
fi

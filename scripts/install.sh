#!/bin/bash

# Define total steps
TOTAL_STEPS=4

echo "🚀 Starting installation process..."

# Step 1: Check for pnpm
echo "[1/$TOTAL_STEPS] 🔍 Checking package manager..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed. Please install it first."
    exit 1
fi

# Step 2: Install dependencies
echo "[2/$TOTAL_STEPS] 📦 Installing dependencies..."
if [ -f pnpm-lock.yaml ]; then
    echo "      -> Lockfile detected. Running frozen install..."
    pnpm install --frozen-lockfile
else
    echo "      -> No lockfile found. Running standard install..."
    pnpm install
fi

# Step 3: Generate Prisma client
echo "[3/$TOTAL_STEPS] 💎 Generating Prisma client..."
if ! pnpm db:generate; then
    echo "❌ Error: Prisma generation failed."
    exit 1
fi

# Step 4: Verify
echo "[4/$TOTAL_STEPS] ✅ Verifying installation..."
if [ -d "node_modules" ]; then
    echo "🎉 Success! Dependencies and Prisma client are ready."
    exit 0
else
    echo "❌ Error: node_modules folder missing after install."
    exit 1
fi

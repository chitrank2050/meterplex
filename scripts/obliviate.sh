#!/bin/bash

# Define total steps
TOTAL_STEPS=5

echo "🪄  Initiating obliviate protocols..."

# Step 1: Build artifacts
echo "[1/$TOTAL_STEPS] 🗑️  Removing build artifacts (dist & generated)..."
rm -rf dist
rm -rf generated

# Step 2: Dependencies
echo "[2/$TOTAL_STEPS] 💥 Removing dependencies (node_modules)..."
rm -rf node_modules

# Step 3: Lockfiles
echo "[3/$TOTAL_STEPS] 🔓 Removing lockfiles..."
rm -f pnpm-lock.yaml
rm -f package-lock.json
rm -f yarn.lock
rm -f bun.lockb

# Step 4: Test & Lint artifacts
echo "[4/$TOTAL_STEPS] 🧹 Removing test & lint artifacts..."
rm -rf coverage
rm -f .eslintcache

# Step 5: Caches
echo "[5/$TOTAL_STEPS] 🌫️  Clearing development caches..."
rm -rf .husky/_
rm -rf .turbo

echo "✨  Obliviate complete. Meterplex is now a blank slate."

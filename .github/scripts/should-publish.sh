#!/usr/bin/env bash
# Compares the local package.json version against the published version on the registry.
# Outputs `changed=true` to GITHUB_OUTPUT if the versions differ, `changed=false` otherwise.
set -euo pipefail

CURRENT=$(node -p "require('./package.json').version")
PUBLISHED=$(npm view "$(node -p "require('./package.json').name")" version 2>/dev/null || echo "0.0.0")

echo "current=$CURRENT"
echo "published=$PUBLISHED"

echo "current=$CURRENT" >> "$GITHUB_OUTPUT"
echo "published=$PUBLISHED" >> "$GITHUB_OUTPUT"

if [ "$CURRENT" != "$PUBLISHED" ]; then
  echo "changed=true" >> "$GITHUB_OUTPUT"
else
  echo "changed=false" >> "$GITHUB_OUTPUT"
fi

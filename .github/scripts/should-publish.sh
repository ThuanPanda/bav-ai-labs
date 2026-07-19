#!/usr/bin/env bash
# Decide whether the package version in package.json should be published.
# - changed=true  → this exact version is not on the registry yet
# - changed=false → this exact version already exists
# Fails closed on auth/network errors (never treats them as "never published").
set -euo pipefail

NAME=$(node -p "require('./package.json').name")
CURRENT=$(node -p "require('./package.json').version")

echo "current=$CURRENT"
echo "current=$CURRENT" >> "$GITHUB_OUTPUT"

# Exact version already published → skip
if npm view "${NAME}@${CURRENT}" version >/dev/null 2>&1; then
  echo "published=$CURRENT (already exists)"
  echo "published=$CURRENT" >> "$GITHUB_OUTPUT"
  echo "changed=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

# Probe package to distinguish "not found" from auth/network failures
set +e
VIEW_OUT=$(npm view "${NAME}" version 2>&1)
VIEW_RC=$?
set -e

if [ "$VIEW_RC" -eq 0 ]; then
  # Package exists; local version is new relative to latest
  echo "published=${VIEW_OUT} (latest)"
  echo "published=${VIEW_OUT}" >> "$GITHUB_OUTPUT"
  echo "changed=true" >> "$GITHUB_OUTPUT"
  exit 0
fi

if echo "$VIEW_OUT" | grep -qiE 'E404|404 Not Found|not in this registry'; then
  echo "published=0.0.0 (package not on registry)"
  echo "published=0.0.0" >> "$GITHUB_OUTPUT"
  echo "changed=true" >> "$GITHUB_OUTPUT"
  exit 0
fi

echo "::error::Failed to query registry for ${NAME}. Refusing to publish."
echo "$VIEW_OUT"
exit 1

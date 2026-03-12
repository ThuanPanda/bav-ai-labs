import os from 'node:os';
import path from 'node:path';

import type { Provider, Scope } from '../config';

// ─── PROVIDER INSTALL PATHS ──────────────────────────────────────────────────

const home = os.homedir();

/**
 * Returns the directory where a skill should be installed for a given
 * provider + scope combination. The caller is responsible for creating
 * the directory and copying files into it.
 *
 * For VS Code the returned path is a *directory* where the single
 * .instructions.md file should be written (not a sub-directory per skill).
 */
export function getInstallDir(provider: Provider, scope: Scope, cwd: string): string {
  switch (provider) {
    case 'opencode': {
      return scope === 'global'
        ? path.join(home, '.config', 'opencode', 'skills')
        : path.join(cwd, '.opencode', 'skills');
    }

    case 'claude': {
      return scope === 'global'
        ? path.join(home, '.claude', 'skills')
        : path.join(cwd, '.claude', 'skills');
    }

    case 'vscode': {
      // VS Code uses a flat instructions dir (no per-skill subdirectory)
      return scope === 'global'
        ? path.join(home, '.copilot', 'instructions')
        : path.join(cwd, '.github', 'instructions');
    }

    case 'antigravity': {
      return scope === 'global'
        ? path.join(home, '.antigravity', 'skills')
        : path.join(cwd, '.antigravity', 'skills');
    }
  }
}

/** Human-readable label for a provider. */
export function providerLabel(provider: Provider): string {
  switch (provider) {
    case 'opencode': {
      return 'OpenCode';
    }
    case 'claude': {
      return 'Claude Code';
    }
    case 'vscode': {
      return 'VS Code (Copilot)';
    }
    case 'antigravity': {
      return 'Antigravity';
    }
  }
}

/**
 * Whether the provider uses a single flat .instructions.md file
 * (VS Code) vs a full skill subdirectory (all others).
 */
export function isFlatProvider(provider: Provider): boolean {
  return provider === 'vscode';
}

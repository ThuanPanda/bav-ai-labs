import os from 'node:os';
import path from 'node:path';

import type { Provider, Scope } from '../config';

// ─── PROVIDER INSTALL PATHS ──────────────────────────────────────────────────

const home = os.homedir();

/**
 * Returns the directory where a skill should be installed for a given
 * provider + scope combination. The caller is responsible for creating
 * the directory and copying files into it.
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

    case 'antigravity': {
      return scope === 'global'
        ? path.join(home, '.gemini', 'antigravity', 'skills')
        : path.join(cwd, '.agents', 'skills');
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
    case 'antigravity': {
      return 'Antigravity';
    }
  }
}

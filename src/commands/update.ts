import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { Command } from 'commander';

import { log, spin } from '../utils/logger';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_NAME = '@bav-ai-labs/bv';

/**
 * Find package.json by walking up from __dirname.
 * Works both bundled (dist/) and unbundled (src/commands/).
 */
function findPackageJson(): string {
  let dir = __dirname;
  while (true) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not find package.json');
}

function getCurrentVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(findPackageJson(), 'utf8')) as { version: string };
  return pkg.version;
}

function getLatestVersion(): string | undefined {
  try {
    const result = execSync(`npm view ${PKG_NAME} version 2>/dev/null`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim() || undefined;
  } catch {
    return undefined;
  }
}

// ─── COMMAND ─────────────────────────────────────────────────────────────────

export const updateCommand = new Command('update')
  .description('Update bv CLI to the latest version')
  .action(() => {
    const current = getCurrentVersion();
    log.info(`Current version: ${chalk.cyan('v' + current)}`);

    const spinner = spin('Checking for updates…');

    const latest = getLatestVersion();
    if (!latest) {
      spinner.fail('Could not check for updates. Make sure npm is configured for GitHub Packages.');
      process.exit(1);
    }

    if (latest === current) {
      spinner.succeed(`Already on the latest version ${chalk.cyan('v' + current)}`);
      return;
    }

    spinner.text = `Updating ${chalk.cyan('v' + current)} → ${chalk.cyan('v' + latest)}…`;

    try {
      execSync(`npm install -g ${PKG_NAME}@latest`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
      });
      spinner.succeed(`Updated to ${chalk.cyan('v' + latest)}`);
    } catch (error) {
      spinner.fail('Update failed');
      log.error((error as Error).message);
      process.exit(1);
    }
  });

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { Command } from 'commander';

import { log, spin } from '../utils/logger';

// ─── BUNDLE REGISTRY ─────────────────────────────────────────────────────────

interface RegistryBundle {
  name: string;
  label: string;
  description: string;
}

const bundles: RegistryBundle[] = [
  {
    name: 'ccep-components',
    label: 'CCEP Components',
    description:
      'Curated Next.js UI component bundle (Radix + shadcn-style, next-intl/next-themes required)',
  },
];

// The required npm dependencies for the ccep-components bundle, derived from
// the actual imports in the copied files.
const CCEP_COMPONENTS_DEPENDENCIES = [
  '@base-ui/react',
  'class-variance-authority',
  'clsx',
  'dayjs',
  'lucide-react',
  'next-intl',
  'next-themes',
  'nuqs',
  'radix-ui',
  'react-day-picker',
  'recharts',
  'sonner',
  'tailwind-merge',
  'use-debounce',
];

// ─── PATHS ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getRegistryDir(name: string): string {
  return path.join(__dirname, 'registry', name);
}

// ─── COPY LOGIC ──────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist']);

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ─── COMMAND ─────────────────────────────────────────────────────────────────

export const initCommand = new Command('init')
  .description('Copy a curated bundle of source files into the current project')
  .argument('<name>', 'Bundle name to copy')
  .action((name: string) => {
    const bundle = bundles.find((b) => b.name === name);

    if (!bundle) {
      log.error(`Bundle "${name}" not found.`);
      log.info(`Available bundles:`);
      for (const b of bundles) {
        log.label(b.name, b.description);
      }
      process.exit(1);
    }

    const srcDir = getRegistryDir(bundle.name);

    if (!fs.existsSync(srcDir)) {
      log.error(`Bundle "${bundle.name}" not found in bundled files.`);
      process.exit(1);
    }

    const cwd = process.cwd();
    const spinner = spin(`Copying ${bundle.label} into ${chalk.dim(cwd)}`);

    try {
      copyDir(srcDir, cwd);
      spinner.succeed(`${chalk.bold.cyan(bundle.label)} copied successfully!`);
      console.log();
      log.info(`Required dependencies (make sure these are installed):`);
      log.label('Deps', CCEP_COMPONENTS_DEPENDENCIES.join(', '));
      console.log();
      log.info(
        `This bundle assumes a Next.js project with ${chalk.cyan('next-intl')} (${chalk.dim('@/i18n/navigation')}, ${chalk.dim('@/i18n/routing')}) and a Tailwind/shadcn-style theme (CSS variables like ${chalk.dim('--background')}, ${chalk.dim('--primary')}, etc.) already set up — same as the ${chalk.cyan('nextjs')} boilerplate in this repo.`,
      );
      console.log();
    } catch (error) {
      spinner.fail(`Failed to copy ${bundle.label}`);
      log.error((error as Error).message);
      process.exit(1);
    }
  });

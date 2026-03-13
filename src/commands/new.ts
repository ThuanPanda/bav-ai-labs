import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';

import { log, spin } from '../utils/logger';

// ─── BOILERPLATE REGISTRY ────────────────────────────────────────────────────

interface Boilerplate {
  name: string;
  label: string;
  description: string;
}

const boilerplates: Boilerplate[] = [
  {
    name: 'nextjs',
    label: 'Next.js',
    description: 'Next.js 16 + React 19 + TypeScript + Tailwind CSS',
  },
];

// ─── PATHS ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getBoilerplateDir(name: string): string {
  return path.join(__dirname, 'boilerplate', name);
}

// ─── COPY LOGIC ──────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.next']);

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

export const newCommand = new Command('new')
  .description('Scaffold a new project from a boilerplate')
  .action(async () => {
    console.log();

    const chosen = await select<string>({
      message: 'Which boilerplate do you want to use?',
      choices: boilerplates.map((b) => ({
        name: `${b.label}  ${chalk.dim(`— ${b.description}`)}`,
        value: b.name,
      })),
    });

    const boilerplate = boilerplates.find((b) => b.name === chosen)!;
    const srcDir = getBoilerplateDir(chosen);

    if (!fs.existsSync(srcDir)) {
      log.error(`Boilerplate "${chosen}" not found in bundled files.`);
      process.exit(1);
    }

    const cwd = process.cwd();
    const spinner = spin(`Scaffolding ${boilerplate.label} into ${chalk.dim(cwd)}`);

    try {
      copyDir(srcDir, cwd);
      spinner.succeed(`${chalk.bold.cyan(boilerplate.label)} project scaffolded successfully!`);
      console.log();
      log.info(`Next steps:`);
      log.label('Install', 'pnpm install');
      log.label('Dev', 'pnpm dev');
      console.log();
    } catch (error) {
      spinner.fail('Failed to scaffold project');
      log.error((error as Error).message);
      process.exit(1);
    }
  });

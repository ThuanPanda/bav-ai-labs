import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';

import { log, spin } from '../utils/logger';

// ─── BUNDLE REGISTRY ─────────────────────────────────────────────────────────

interface RegistryBundle {
  name: string;
  label: string;
  description: string;
  /** When true, prompt for individual components instead of copying everything. */
  hasComponents?: boolean;
}

const bundles: RegistryBundle[] = [
  {
    name: 'ccep-components',
    label: 'CCEP Components',
    description:
      'Curated Next.js UI component bundle (Radix + shadcn-style, next-intl/next-themes required)',
    hasComponents: true,
  },
];

const ALL_COMPONENTS = '__all__';

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

function getUiDir(bundleSrc: string): string {
  return path.join(bundleSrc, 'src', 'shared', 'components', 'ui');
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

function copyFileToCwd(bundleSrc: string, absFile: string, cwd: string): void {
  const rel = path.relative(bundleSrc, absFile);
  const dest = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(absFile, dest);
}

// ─── COMPONENT DISCOVERY & DEPS ──────────────────────────────────────────────

function listUiComponents(bundleSrc: string): string[] {
  const uiDir = getUiDir(bundleSrc);
  if (!fs.existsSync(uiDir)) return [];

  return fs
    .readdirSync(uiDir)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .map((f) => f.replace(/\.(tsx|ts)$/, ''))
    .sort((a, b) => a.localeCompare(b));
}

/** Resolve a local import specifier to an existing file under the bundle. */
function resolveLocalImport(fromFile: string, specifier: string, bundleSrc: string): string | null {
  let base: string | null = null;

  if (specifier.startsWith('@/')) {
    // @/lib/utils → <bundle>/src/lib/utils
    base = path.join(bundleSrc, 'src', specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null; // external package
  }

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      // Only track files that live inside the registry bundle
      const rel = path.relative(bundleSrc, candidate);
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
        return candidate;
      }
    }
  }

  return null;
}

const IMPORT_RE = /from\s+['"]([^'"]+)['"]/g;

/** Recursively collect a component file and all local transitive deps. */
function collectLocalDeps(entryFile: string, bundleSrc: string, visited: Set<string>): void {
  if (visited.has(entryFile)) return;
  if (!fs.existsSync(entryFile)) return;

  visited.add(entryFile);

  if (!/\.(tsx?|jsx?)$/.test(entryFile)) return;

  const content = fs.readFileSync(entryFile, 'utf8');
  let match: RegExpExecArray | null;
  IMPORT_RE.lastIndex = 0;
  while ((match = IMPORT_RE.exec(content)) !== null) {
    const resolved = resolveLocalImport(entryFile, match[1], bundleSrc);
    if (resolved) {
      collectLocalDeps(resolved, bundleSrc, visited);
    }
  }
}

function collectSelectedComponentFiles(bundleSrc: string, componentNames: string[]): string[] {
  const visited = new Set<string>();
  const uiDir = getUiDir(bundleSrc);

  for (const name of componentNames) {
    const candidates = [
      path.join(uiDir, `${name}.tsx`),
      path.join(uiDir, `${name}.ts`),
    ];
    const entry = candidates.find((p) => fs.existsSync(p));
    if (!entry) {
      log.warn(`Component "${name}" not found — skipped.`);
      continue;
    }
    collectLocalDeps(entry, bundleSrc, visited);
  }

  return [...visited].sort();
}

// ─── PROMPTS ─────────────────────────────────────────────────────────────────

async function promptBundle(preselected?: string): Promise<RegistryBundle> {
  if (preselected) {
    const found = bundles.find((b) => b.name === preselected);
    if (!found) {
      log.error(`Bundle "${preselected}" not found.`);
      log.info('Available bundles:');
      for (const b of bundles) {
        log.label(b.name, b.description);
      }
      process.exit(1);
    }
    return found;
  }

  console.log();
  // checkbox: space to toggle, enter to submit — enforce exactly one bundle
  const chosen = await checkbox<string>({
    message: 'Which bundle do you want to init? (space to select, enter to submit)',
    choices: bundles.map((b) => ({
      name: `${b.label}  ${chalk.dim(`— ${b.description}`)}`,
      value: b.name,
    })),
    validate: (vals) => {
      if (vals.length === 0) return 'Select one bundle (space), then press enter';
      if (vals.length > 1) return 'Select only one bundle';
      return true;
    },
  });

  return bundles.find((b) => b.name === chosen[0])!;
}

async function promptComponents(bundleSrc: string): Promise<string[] | typeof ALL_COMPONENTS> {
  const components = listUiComponents(bundleSrc);

  if (components.length === 0) {
    log.warn('No UI components found in bundle — copying entire bundle.');
    return ALL_COMPONENTS;
  }

  console.log();
  const selected = await checkbox<string>({
    message: 'Which components do you want to init? (space to toggle, enter to submit)',
    pageSize: 16,
    choices: [
      {
        name: chalk.bold('All components'),
        value: ALL_COMPONENTS,
      },
      ...components.map((c) => ({
        name: c,
        value: c,
      })),
    ],
    validate: (vals) => (vals.length > 0 ? true : 'Select at least one component (or All)'),
  });

  if (selected.includes(ALL_COMPONENTS)) {
    return ALL_COMPONENTS;
  }

  return selected;
}

// ─── POST-COPY HINTS ─────────────────────────────────────────────────────────

function printCcepHints(componentCount?: number): void {
  console.log();
  if (componentCount !== undefined) {
    log.success(`Copied ${chalk.bold(String(componentCount))} component file(s) (incl. deps).`);
  }
  log.info('Required dependencies (make sure these are installed):');
  log.label('Deps', CCEP_COMPONENTS_DEPENDENCIES.join(', '));
  console.log();
  log.info(
    `This bundle assumes a Next.js project with ${chalk.cyan('next-intl')} (${chalk.dim('@/i18n/navigation')}, ${chalk.dim('@/i18n/routing')}) and a Tailwind/shadcn-style theme (CSS variables like ${chalk.dim('--background')}, ${chalk.dim('--primary')}, etc.) already set up — same as the ${chalk.cyan('nextjs')} boilerplate in this repo.`,
  );
  console.log();
}

// ─── COMMAND ─────────────────────────────────────────────────────────────────

export const initCommand = new Command('init')
  .description('Copy a curated bundle of source files into the current project')
  .argument('[name]', 'Bundle name (optional — interactive list if omitted)')
  .action(async (name?: string) => {
    try {
      const bundle = await promptBundle(name);
      const srcDir = getRegistryDir(bundle.name);

      if (!fs.existsSync(srcDir)) {
        log.error(`Bundle "${bundle.name}" not found in bundled files.`);
        process.exit(1);
      }

      const cwd = process.cwd();

      // Component-level selection for bundles that support it
      let selection: string[] | typeof ALL_COMPONENTS = ALL_COMPONENTS;
      if (bundle.hasComponents) {
        selection = await promptComponents(srcDir);
      }

      if (selection === ALL_COMPONENTS) {
        const spinner = spin(`Copying ${bundle.label} into ${chalk.dim(cwd)}`);
        try {
          copyDir(srcDir, cwd);
          spinner.succeed(`${chalk.bold.cyan(bundle.label)} copied successfully!`);
          if (bundle.name === 'ccep-components') {
            printCcepHints();
          } else {
            console.log();
          }
        } catch (error) {
          spinner.fail(`Failed to copy ${bundle.label}`);
          log.error((error as Error).message);
          process.exit(1);
        }
        return;
      }

      // Selective component copy with transitive local deps
      const files = collectSelectedComponentFiles(srcDir, selection);
      if (files.length === 0) {
        log.error('No files resolved for the selected components.');
        process.exit(1);
      }

      const spinner = spin(
        `Copying ${chalk.bold(String(selection.length))} component(s) into ${chalk.dim(cwd)}`,
      );
      try {
        for (const file of files) {
          copyFileToCwd(srcDir, file, cwd);
        }
        spinner.succeed(
          `${chalk.bold.cyan(selection.join(', '))} installed (${files.length} file(s))`,
        );
        printCcepHints(files.length);
      } catch (error) {
        spinner.fail('Failed to copy selected components');
        log.error((error as Error).message);
        process.exit(1);
      }
    } catch (error) {
      // User cancelled prompt (Ctrl+C) or unexpected error
      if ((error as Error).name === 'ExitPromptError') {
        console.log();
        log.warn('Cancelled.');
        process.exit(0);
      }
      log.error((error as Error).message);
      process.exit(1);
    }
  });

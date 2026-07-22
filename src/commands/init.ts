import { execSync } from 'node:child_process';
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

/** Fallback full dep list when scanning fails or for docs. Keep in sync with registry imports. */
const CCEP_COMPONENTS_DEPENDENCIES = [
  '@base-ui/react',
  'class-variance-authority',
  'clsx',
  'dayjs',
  'embla-carousel-react',
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

/** Host-app peers — assumed present in a real Next.js project; never auto-installed. */
const ASSUMED_PEER_PACKAGES = new Set(['react', 'react-dom', 'next']);

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

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// ─── COMPONENT DISCOVERY & DEPS ──────────────────────────────────────────────

function listUiComponents(bundleSrc: string): string[] {
  const uiDir = getUiDir(bundleSrc);
  if (!fs.existsSync(uiDir)) return [];

  return fs
    .readdirSync(uiDir)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .map((f) => f.replace(/\.(tsx|ts)$/, ''))
    .toSorted((a, b) => a.localeCompare(b));
}

/** Resolve a local import specifier to an existing file under the bundle. */
function resolveLocalImport(
  fromFile: string,
  specifier: string,
  bundleSrc: string,
): string | undefined {
  let base: string;

  if (specifier.startsWith('@/')) {
    base = path.join(bundleSrc, 'src', specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return undefined;
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
      const rel = path.relative(bundleSrc, candidate);
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
        return candidate;
      }
    }
  }

  return undefined;
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
    const candidates = [path.join(uiDir, `${name}.tsx`), path.join(uiDir, `${name}.ts`)];
    const entry = candidates.find((p) => fs.existsSync(p));
    if (!entry) {
      log.warn(`Component "${name}" not found — skipped.`);
      continue;
    }
    collectLocalDeps(entry, bundleSrc, visited);
  }

  return [...visited].toSorted();
}

// ─── NPM PACKAGE RESOLUTION & INSTALL ────────────────────────────────────────

/** `dayjs/plugin/utc` → `dayjs`, `@scope/pkg/sub` → `@scope/pkg` */
function packageNameFromSpecifier(specifier: string): string | undefined {
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('@/') ||
    specifier.startsWith('node:') ||
    specifier.startsWith('#')
  ) {
    return undefined;
  }

  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    if (parts.length < 2) return undefined;
    return `${parts[0]}/${parts[1]}`;
  }

  return specifier.split('/')[0] || undefined;
}

function collectNpmPackagesFromFiles(files: string[]): string[] {
  const pkgs = new Set<string>();

  for (const file of files) {
    if (!/\.(tsx?|jsx?)$/.test(file) || !fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    let match: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(content)) !== null) {
      const name = packageNameFromSpecifier(match[1]);
      if (name && !ASSUMED_PEER_PACKAGES.has(name)) {
        pkgs.add(name);
      }
    }
  }

  return [...pkgs].toSorted();
}

interface ProjectPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  packageManager?: string;
}

function readProjectPackageJson(cwd: string): ProjectPackageJson | undefined {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as ProjectPackageJson;
  } catch {
    return undefined;
  }
}

function getDeclaredPackages(pkg: ProjectPackageJson): Set<string> {
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ]);
}

type PackageManager = 'pnpm' | 'npm' | 'yarn';

function detectPackageManager(cwd: string, pkg: ProjectPackageJson | null): PackageManager {
  if (pkg?.packageManager?.startsWith('pnpm')) return 'pnpm';
  if (pkg?.packageManager?.startsWith('yarn')) return 'yarn';
  if (pkg?.packageManager?.startsWith('npm')) return 'npm';
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) return 'npm';
  // Prefer pnpm (project convention / user request)
  return 'pnpm';
}

function buildAddCommand(pm: PackageManager, packages: string[]): string {
  const list = packages.join(' ');
  switch (pm) {
    case 'pnpm': {
      return `pnpm add ${list}`;
    }
    case 'yarn': {
      return `yarn add ${list}`;
    }
    case 'npm': {
      return `npm install ${list}`;
    }
  }
}

/**
 * Install missing npm packages for the copied component files.
 * Uses pnpm when available / preferred, falls back to yarn/npm by lockfile.
 */
function installMissingDependencies(cwd: string, requiredPackages: string[]): void {
  if (requiredPackages.length === 0) {
    log.info('No external packages required for the selected files.');
    return;
  }

  const pkg = readProjectPackageJson(cwd);
  if (!pkg) {
    log.warn('No package.json in the current directory — skipped install.');
    log.info(`Install manually: ${chalk.cyan(`pnpm add ${requiredPackages.join(' ')}`)}`);
    return;
  }

  const declared = getDeclaredPackages(pkg);
  const missing = requiredPackages.filter((p) => !declared.has(p));

  if (missing.length === 0) {
    log.success('All required packages are already listed in package.json.');
    return;
  }

  const pm = detectPackageManager(cwd, pkg);
  const cmd = buildAddCommand(pm, missing);

  console.log();
  log.info(`Installing ${chalk.bold(String(missing.length))} package(s) with ${chalk.cyan(pm)}:`);
  log.label('Add', missing.join(', '));
  console.log();

  const spinner = spin(`Running ${chalk.dim(cmd)}…`);
  try {
    // Inherit stdio so the user sees install progress; spinner text still shows briefly.
    spinner.stop();
    execSync(cmd, {
      cwd,
      stdio: 'inherit',
      encoding: 'utf8',
      env: process.env,
    });
    console.log();
    log.success(`Installed: ${chalk.cyan(missing.join(', '))}`);
  } catch (error) {
    console.log();
    log.error(`Failed to install packages with ${pm}.`);
    log.error((error as Error).message);
    log.info(`Retry manually: ${chalk.cyan(cmd)}`);
    process.exit(1);
  }
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

function printCcepHints(opts?: { fileCount?: number; packages?: string[] }): void {
  console.log();
  if (opts?.fileCount !== undefined) {
    log.success(`Copied ${chalk.bold(String(opts.fileCount))} component file(s) (incl. deps).`);
  }
  if (opts?.packages && opts.packages.length > 0) {
    log.info('Packages used by selected components:');
    log.label('Deps', opts.packages.join(', '));
  }
  console.log();
  log.info(
    `This bundle assumes a Next.js project with ${chalk.cyan('next-intl')} routing and a Tailwind/shadcn-style theme (CSS variables like ${chalk.dim('--background')}, ${chalk.dim('--primary')}, etc.) — same as the ${chalk.cyan('nextjs')} boilerplate.`,
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

      let selection: string[] | typeof ALL_COMPONENTS = ALL_COMPONENTS;
      if (bundle.hasComponents) {
        selection = await promptComponents(srcDir);
      }

      let copiedFiles: string[] = [];

      if (selection === ALL_COMPONENTS) {
        const spinner = spin(`Copying ${bundle.label} into ${chalk.dim(cwd)}`);
        try {
          copyDir(srcDir, cwd);
          spinner.succeed(`${chalk.bold.cyan(bundle.label)} copied successfully!`);
          copiedFiles = listSourceFiles(srcDir);
        } catch (error) {
          spinner.fail(`Failed to copy ${bundle.label}`);
          log.error((error as Error).message);
          process.exit(1);
        }
      } else {
        copiedFiles = collectSelectedComponentFiles(srcDir, selection);
        if (copiedFiles.length === 0) {
          log.error('No files resolved for the selected components.');
          process.exit(1);
        }

        const spinner = spin(
          `Copying ${chalk.bold(String(selection.length))} component(s) into ${chalk.dim(cwd)}`,
        );
        try {
          for (const file of copiedFiles) {
            copyFileToCwd(srcDir, file, cwd);
          }
          spinner.succeed(
            `${chalk.bold.cyan(selection.join(', '))} installed (${copiedFiles.length} file(s))`,
          );
        } catch (error) {
          spinner.fail('Failed to copy selected components');
          log.error((error as Error).message);
          process.exit(1);
        }
      }

      // Install npm packages required by the copied files
      if (bundle.name === 'ccep-components') {
        const npmPackages = collectNpmPackagesFromFiles(copiedFiles);
        // Prefer scanned packages; fall back to full list if scan is empty (shouldn't happen)
        const required =
          npmPackages.length > 0 ? npmPackages : [...CCEP_COMPONENTS_DEPENDENCIES].toSorted();

        installMissingDependencies(cwd, required);
        printCcepHints({
          fileCount: selection === ALL_COMPONENTS ? undefined : copiedFiles.length,
          packages: required,
        });
      } else {
        console.log();
      }
    } catch (error) {
      if ((error as Error).name === 'ExitPromptError') {
        console.log();
        log.warn('Cancelled.');
        process.exit(0);
      }
      log.error((error as Error).message);
      process.exit(1);
    }
  });

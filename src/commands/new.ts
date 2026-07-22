import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';

import { setInstalledSkill } from '../config';
import { log, spin } from '../utils/logger';
import { getInstallDir } from '../utils/providers';
import { getBundledSkillFiles, getBundledSkillMeta } from '../utils/skills';

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
  {
    name: 'react-vite',
    label: 'React (Vite)',
    description: 'Vite + React 19 + TanStack Router + TypeScript + Tailwind CSS',
  },
  {
    name: 'nestjs-mep',
    label: 'MEP NestJS',
    description: 'NestJS 11 CQRS + Drizzle monorepo (MEP playbook, @prowerbdigital/common)',
  },
];

/** Boilerplates that can pull in a bundled skill on scaffold (asked interactively). */
const BOILERPLATE_SKILLS: Record<string, string> = {
  'nestjs-mep': 'mep-engineering-playbook',
};

/** Per-boilerplate dev command shown in the "Next steps" hint. */
const DEV_COMMANDS: Record<string, string> = {
  'nestjs-mep': 'pnpm start:dev',
};

/** Boilerplates that can optionally wire up Husky + lint-staged on scaffold. */
const HUSKY_BOILERPLATES = new Set(['nestjs-mep']);

/** Boilerplates whose `apps/` sub-apps are named by the user (monorepo templates). */
const MULTI_APP_BOILERPLATES = new Set(['nestjs-mep']);

/** The app directory shipped inside a multi-app boilerplate, used as the template. */
const APP_TEMPLATE = 'api';

/** First app listens here; each additional app gets the next port. */
const BASE_PORT = 8080;

// ─── PATHS ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getBoilerplateDir(name: string): string {
  return path.join(__dirname, 'boilerplate', name);
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

// ─── MULTI-APP GENERATION ────────────────────────────────────────────────────

const APP_NAME_RE = /^[a-z][a-z0-9-]*$/;

/** Split a comma-separated answer into unique, trimmed app names. */
export function parseAppNames(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

/** `order-service` → `Order Service` (used for Swagger titles). */
function toTitle(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Run `fn` on every file under `dir`, recursively. */
function walkFiles(dir: string, fn: (file: string) => void): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, fn);
    else if (entry.isFile()) fn(full);
  }
}

/** Apply literal string replacements across every file in a directory. */
function replaceInDir(dir: string, replacements: [string, string][]): void {
  const effective = replacements.filter(([from, to]) => from !== to);
  if (effective.length === 0) return;

  walkFiles(dir, (file) => {
    const original = fs.readFileSync(file, 'utf8');
    let content = original;
    for (const [from, to] of effective) {
      if (content.includes(from)) content = content.split(from).join(to);
    }
    if (content !== original) fs.writeFileSync(file, content);
  });
}

/** Rewrite a copied app directory so every reference points at its own name/port. */
function applyAppSubstitutions(appDir: string, name: string, port: number): void {
  const title = toTitle(name);
  const replacements: [string, string][] = [
    // env-file comments referring to the template app path
    [`apps/${APP_TEMPLATE}/`, `apps/${name}/`],
    // tsconfig.app.json outDir
    [`dist/apps/${APP_TEMPLATE}`, `dist/apps/${name}`],
    // DynamicConfigModule.register({ app }) — drives the apps/<app>/.env lookup
    [`app: '${APP_TEMPLATE}'`, `app: '${name}'`],
    // logger service label
    [`service: 'nestjs-mep'`, `service: '${name}'`],
    // swagger metadata
    ['MEP NestJS service API documentation', `MEP NestJS ${title} API documentation`],
    ['MEP NestJS API', `MEP NestJS ${title} API`],
    // default port (app.config.ts + venv/.env.example)
    [String(BASE_PORT), String(port)],
  ];

  // For the untouched template name, only the port may differ.
  const scoped = name === APP_TEMPLATE ? replacements.slice(-1) : replacements;
  replaceInDir(appDir, scoped);
}

interface NestCliProject {
  type?: string;
  root?: string;
  entryFile?: string;
  sourceRoot?: string;
  compilerOptions?: Record<string, unknown>;
}

interface NestCliJson {
  projects?: Record<string, NestCliProject>;
  root?: string;
  sourceRoot?: string;
  compilerOptions?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Point nest-cli.json at the generated apps (libraries are preserved as-is). */
function updateNestCli(cwd: string, appNames: string[]): void {
  const nestCliPath = path.join(cwd, 'nest-cli.json');
  if (!fs.existsSync(nestCliPath)) return;

  const nestCli = JSON.parse(fs.readFileSync(nestCliPath, 'utf8')) as NestCliJson;
  const [first] = appNames;

  const libraries = Object.entries(nestCli.projects ?? {}).filter(
    ([, project]) => project.type === 'library',
  );
  const applications = appNames.map<[string, NestCliProject]>((name) => [
    name,
    {
      type: 'application',
      root: `apps/${name}`,
      entryFile: 'main',
      sourceRoot: `apps/${name}/src`,
      compilerOptions: { tsConfigPath: `apps/${name}/tsconfig.app.json` },
    },
  ]);

  nestCli.root = `apps/${first}`;
  nestCli.sourceRoot = `apps/${first}/src`;
  nestCli.compilerOptions = {
    ...nestCli.compilerOptions,
    tsConfigPath: `apps/${first}/tsconfig.app.json`,
  };
  nestCli.projects = Object.fromEntries(
    [...applications, ...libraries].toSorted(([a], [b]) => a.localeCompare(b)),
  );

  fs.writeFileSync(nestCliPath, `${JSON.stringify(nestCli, undefined, 2)}\n`);
}

interface ProjectPackageJson {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  'lint-staged'?: Record<string, string>;
  [key: string]: unknown;
}

function readProjectPackageJson(
  cwd: string,
): { path: string; pkg: ProjectPackageJson } | undefined {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return undefined;
  return { path: pkgPath, pkg: JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as ProjectPackageJson };
}

/** Retarget start scripts at the first app and add a `dev:<app>` script per app. */
function updatePackageScripts(cwd: string, appNames: string[]): void {
  const found = readProjectPackageJson(cwd);
  if (!found) return;

  const { path: pkgPath, pkg } = found;
  const [first] = appNames;
  const scripts: Record<string, string> = {
    ...pkg.scripts,
    ['start:dev']: `nest start ${first} --watch`,
    ['start:debug']: `nest start ${first} --debug --watch`,
    ['start:prod']: `node dist/apps/${first}/main`,
  };

  for (const name of appNames) scripts[`dev:${name}`] = `nest start ${name} --watch`;

  pkg.scripts = scripts;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, undefined, 2)}\n`);
}

/**
 * Generate one app per requested name from the bundled `apps/<APP_TEMPLATE>` template, then
 * retarget nest-cli.json, package scripts, drizzle config and the README at them.
 */
export function generateApps(cwd: string, appNames: string[]): void {
  const appsDir = path.join(cwd, 'apps');
  const templateDir = path.join(appsDir, APP_TEMPLATE);
  if (!fs.existsSync(templateDir)) return;

  for (const [index, name] of appNames.entries()) {
    const appDir = path.join(appsDir, name);
    if (name !== APP_TEMPLATE) copyDir(templateDir, appDir);
    applyAppSubstitutions(appDir, name, BASE_PORT + index);
  }

  // Drop the template app when the user renamed it away.
  if (!appNames.includes(APP_TEMPLATE)) {
    fs.rmSync(templateDir, { recursive: true, force: true });
  }

  updateNestCli(cwd, appNames);
  updatePackageScripts(cwd, appNames);

  const [first] = appNames;
  if (first !== APP_TEMPLATE) {
    // drizzle.config.ts loads env from the first app; README paths should match too.
    for (const file of ['drizzle.config.ts', 'README.md']) {
      const target = path.join(cwd, file);
      if (!fs.existsSync(target)) continue;
      const content = fs
        .readFileSync(target, 'utf8')
        .split(`loadEnv('${APP_TEMPLATE}')`)
        .join(`loadEnv('${first}')`)
        .split(`apps/${APP_TEMPLATE}`)
        .join(`apps/${first}`);
      fs.writeFileSync(target, content);
    }
  }
}

// ─── SKILL / HUSKY SETUP ─────────────────────────────────────────────────────

/**
 * Copy a bundled skill into the scaffolded project's Claude Code skills dir
 * (`<cwd>/.claude/skills/<skill>`) and record it as installed. Returns the destination,
 * or undefined if the skill has no bundled files.
 */
function installProjectSkill(skillName: string, cwd: string): string | undefined {
  const files = getBundledSkillFiles(skillName);
  if (files.length === 0) {
    log.warn(`Skill "${skillName}" not found in bundled files — skipped.`);
    return undefined;
  }

  const destDir = path.join(getInstallDir('claude', 'project', cwd), skillName);
  for (const file of files) {
    const dest = path.join(destDir, file.relPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file.fullPath, dest);
  }

  const meta = getBundledSkillMeta(skillName);
  if (meta) setInstalledSkill(skillName, meta.version, 'claude', 'project');

  return destDir;
}

/** Return a shallow copy of an object with its keys sorted alphabetically. */
function sortKeys(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).toSorted(([a], [b]) => a.localeCompare(b)));
}

/**
 * Wire Husky + lint-staged into the scaffolded project: add the `prepare` script, the two
 * devDependencies, and a `lint-staged` config to package.json, plus a `.husky/pre-commit` hook.
 * The hook activates after `pnpm install` (runs `husky`) inside a git repo. Returns false if
 * there is no package.json to edit.
 */
function setupHuskyLintStaged(cwd: string): boolean {
  const found = readProjectPackageJson(cwd);
  if (!found) {
    log.warn('No package.json found — skipped Husky setup.');
    return false;
  }

  const { path: pkgPath, pkg } = found;

  pkg.scripts = { ...pkg.scripts, prepare: 'husky' };
  pkg.devDependencies = sortKeys({
    ...pkg.devDependencies,
    husky: '^9.1.7',
    'lint-staged': '^15.3.0',
  });
  pkg['lint-staged'] = {
    '*.{ts,js}': 'biome check --write --no-errors-on-unmatched --staged',
    '*.json': 'biome format --write --no-errors-on-unmatched',
  };

  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, undefined, 2)}\n`);

  const huskyDir = path.join(cwd, '.husky');
  fs.mkdirSync(huskyDir, { recursive: true });
  fs.writeFileSync(path.join(huskyDir, 'pre-commit'), 'pnpm lint-staged\n');

  return true;
}

// ─── COMMAND ─────────────────────────────────────────────────────────────────

export const newCommand = new Command('new')
  .description('Scaffold a new project from a boilerplate')
  .action(async () => {
    try {
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

      // Ask for the sub-app names before copying so we can generate them in one pass.
      let appNames: string[] = [];
      if (MULTI_APP_BOILERPLATES.has(chosen)) {
        const raw = await input({
          message: `App name(s) under ${chalk.dim('apps/')} — comma-separated for multiple:`,
          default: APP_TEMPLATE,
          validate: (value) => {
            const names = parseAppNames(value);
            if (names.length === 0) return 'Enter at least one app name';
            const invalid = names.filter((n) => !APP_NAME_RE.test(n));
            if (invalid.length > 0) {
              return `Invalid name(s): ${invalid.join(', ')} — use kebab-case (a-z, 0-9, -)`;
            }
            return true;
          },
        });
        appNames = parseAppNames(raw);
      }

      const cwd = process.cwd();
      const spinner = spin(`Scaffolding ${boilerplate.label} into ${chalk.dim(cwd)}`);

      try {
        copyDir(srcDir, cwd);
        if (appNames.length > 0) generateApps(cwd, appNames);
        spinner.succeed(`${chalk.bold.cyan(boilerplate.label)} project scaffolded successfully!`);
        if (appNames.length > 0) {
          log.label('Apps', appNames.map((n, i) => `${n} (:${BASE_PORT + i})`).join(', '));
        }
      } catch (error) {
        spinner.fail('Failed to scaffold project');
        log.error((error as Error).message);
        process.exit(1);
      }

      // Optionally pull in the boilerplate's companion skill.
      const skillName = BOILERPLATE_SKILLS[chosen];
      if (skillName) {
        console.log();
        const wantSkill = await confirm({
          message: `Add the ${chalk.cyan(skillName)} skill to this project (${chalk.dim('.claude/skills')})?`,
          default: true,
        });
        if (wantSkill) {
          const dest = installProjectSkill(skillName, cwd);
          if (dest) {
            log.success(`${chalk.bold.cyan(skillName)} skill added → ${chalk.dim(dest)}`);
          }
        }
      }

      // Optionally wire up Husky + lint-staged.
      if (HUSKY_BOILERPLATES.has(chosen)) {
        console.log();
        const wantHusky = await confirm({
          message: `Set up ${chalk.cyan('Husky')} + ${chalk.cyan('lint-staged')} (git pre-commit hooks)?`,
          default: true,
        });
        if (wantHusky && setupHuskyLintStaged(cwd)) {
          log.success(
            `Husky + lint-staged configured — activates on ${chalk.dim('pnpm install')} inside a git repo.`,
          );
        }
      }

      console.log();
      log.info(`Next steps:`);
      log.label('Install', 'pnpm install');
      log.label('Dev', DEV_COMMANDS[chosen] ?? 'pnpm dev');
      console.log();
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

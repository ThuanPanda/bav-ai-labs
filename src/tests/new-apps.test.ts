import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `new.ts` pulls in the config store (Conf) at import time — stub it so no real
// OS config file is touched. `fs` is intentionally NOT mocked: this suite exercises
// real file generation in a temp directory.
vi.mock('conf', () => ({
  default: class MockConf {
    private store: Record<string, unknown> = {};
    get(key: string) {
      return this.store[key];
    }
    set(key: string, value: unknown) {
      this.store[key] = value;
    }
    delete(key: string) {
      delete this.store[key];
    }
  },
}));

const { copyDir, generateApps, parseAppNames } = await import('../commands/new');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOILERPLATE_SRC = path.join(__dirname, '..', 'boilerplate', 'nestjs-mep');

let tmp: string;

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(tmp, ...segments), 'utf8');
}

function readJson<T>(...segments: string[]): T {
  return JSON.parse(read(...segments)) as T;
}

function exists(...segments: string[]): boolean {
  return fs.existsSync(path.join(tmp, ...segments));
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-new-apps-'));
  fs.cpSync(BOILERPLATE_SRC, tmp, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ─── parseAppNames ────────────────────────────────────────────────────────────
describe('parseAppNames', () => {
  it('trims, drops empties and de-duplicates', () => {
    expect(parseAppNames(' internal , external ,, internal ')).toEqual(['internal', 'external']);
  });

  it('returns a single default name unchanged', () => {
    expect(parseAppNames('api')).toEqual(['api']);
  });
});

// ─── copyDir — dotfile aliases ──────────────────────────────────────────────────
describe('copyDir', () => {
  it('restores npm-stripped dotfiles (npmrc/gitignore) to their dotted names', () => {
    const dest = path.join(tmp, 'scaffold');
    copyDir(BOILERPLATE_SRC, dest);

    // The bundled aliases exist in source but must land as real dotfiles.
    expect(fs.existsSync(path.join(dest, '.npmrc'))).toBe(true);
    expect(fs.existsSync(path.join(dest, '.gitignore'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'npmrc'))).toBe(false);
    expect(fs.existsSync(path.join(dest, 'gitignore'))).toBe(false);

    // Content is copied verbatim.
    expect(fs.readFileSync(path.join(dest, '.npmrc'), 'utf8')).toContain(
      '@prowerbdigital:registry',
    );
  });
});

// ─── generateApps ─────────────────────────────────────────────────────────────
describe('generateApps', () => {
  it('keeps the template as-is for the default single "api" app', () => {
    generateApps(tmp, ['api']);

    expect(exists('apps', 'api', 'src', 'main.ts')).toBe(true);
    expect(read('apps', 'api', 'src', 'app.module.ts')).toContain("app: 'api'");
    expect(read('apps', 'api', 'tsconfig.app.json')).toContain('dist/apps/api');
  });

  it('generates one app per name and removes the template when renamed away', () => {
    generateApps(tmp, ['internal', 'external']);

    expect(exists('apps', 'api')).toBe(false);
    for (const name of ['internal', 'external']) {
      expect(exists('apps', name, 'src', 'main.ts')).toBe(true);
      expect(exists('apps', name, 'src', 'modules', 'users', 'users.module.ts')).toBe(true);
      expect(exists('apps', name, 'venv', '.env.example')).toBe(true);
    }
  });

  it('rewrites per-app references (config app key, outDir, swagger, logger)', () => {
    generateApps(tmp, ['internal', 'external']);

    const appModule = read('apps', 'internal', 'src', 'app.module.ts');
    expect(appModule).toContain("app: 'internal'");
    expect(appModule).toContain("service: 'internal'");

    expect(read('apps', 'internal', 'tsconfig.app.json')).toContain('dist/apps/internal');
    expect(read('apps', 'external', 'tsconfig.app.json')).toContain('dist/apps/external');

    expect(read('apps', 'external', 'src', 'main.ts')).toContain('MEP NestJS External API');
  });

  it('assigns an incrementing port per app', () => {
    generateApps(tmp, ['internal', 'external']);

    expect(read('apps', 'internal', 'venv', '.env.example')).toContain('PORT=8080');
    expect(read('apps', 'external', 'venv', '.env.example')).toContain('PORT=8081');
    expect(read('apps', 'external', 'src', 'common', 'config', 'app.config.ts')).toContain('8081');
  });

  it('retargets nest-cli.json at the generated apps and keeps libraries', () => {
    generateApps(tmp, ['internal', 'external']);

    const nestCli = readJson<{
      root: string;
      sourceRoot: string;
      compilerOptions: { tsConfigPath: string };
      projects: Record<string, { type: string; root: string }>;
    }>('nest-cli.json');

    expect(nestCli.root).toBe('apps/internal');
    expect(nestCli.sourceRoot).toBe('apps/internal/src');
    expect(nestCli.compilerOptions.tsConfigPath).toBe('apps/internal/tsconfig.app.json');

    expect(nestCli.projects['internal']).toMatchObject({
      type: 'application',
      root: 'apps/internal',
    });
    expect(nestCli.projects['external']).toMatchObject({
      type: 'application',
      root: 'apps/external',
    });
    expect(nestCli.projects['api']).toBeUndefined();

    // libraries survive untouched
    for (const lib of ['common', 'database', 'layer-data']) {
      expect(nestCli.projects[lib]).toMatchObject({ type: 'library' });
    }
  });

  it('retargets package scripts and adds a dev script per app', () => {
    generateApps(tmp, ['internal', 'external']);

    const pkg = readJson<{ scripts: Record<string, string> }>('package.json');

    expect(pkg.scripts['start:dev']).toBe('nest start internal --watch');
    expect(pkg.scripts['start:prod']).toBe('node dist/apps/internal/main');
    expect(pkg.scripts['dev:internal']).toBe('nest start internal --watch');
    expect(pkg.scripts['dev:external']).toBe('nest start external --watch');
  });

  it('points drizzle config and README at the first app', () => {
    generateApps(tmp, ['internal', 'external']);

    expect(read('drizzle.config.ts')).toContain("loadEnv('internal')");
    expect(read('README.md')).toContain('apps/internal/.env.example');
    expect(read('README.md')).not.toContain('apps/api/');
  });
});

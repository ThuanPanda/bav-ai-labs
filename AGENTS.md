# AGENTS.md — bv-labs

Developer guide for AI coding agents operating in this repository.

---

## Project Overview

`bv` is a Node.js CLI tool (Bavaan internal tooling) that manages downloadable "skills" —
curated instruction files for AI coding agents (OpenCode, Claude Code, VS Code Copilot,
Antigravity). Skills are bundled into the CLI package itself and installed to the appropriate
provider-specific directory on the user's machine.

The binary is `bv`, exposing subcommands: `bv ls`, `bv add`, `bv up`, `bv info`, `bv update`,
`bv uninstall`.

**Package:** `@levin-procommerce-de/bv` — published to GitHub Packages (private).

**Stack:** TypeScript · ESM · Commander.js · tsup (esbuild bundler) · pnpm · Node.js 18+

---

## Package Manager

Use **pnpm** exclusively. Do not use `npm` or `yarn`.

```
pnpm install          # install dependencies
pnpm build            # compile TypeScript → dist/
pnpm dev              # watch mode (tsx watch src/index.ts)
pnpm start            # run compiled CLI (node dist/index.js)
pnpm typecheck        # tsc --noEmit (type-check without emitting)
```

---

## Build

```bash
pnpm build
```

Runs `tsup` with the config in `tsup.config.ts`:

- Entry: `src/index.ts`
- Output: `dist/index.js` (ESM, Node 18 target)
- Adds `#!/usr/bin/env node` shebang automatically
- `clean: true` wipes `dist/` before each build
- `onSuccess`: copies `src/skills/` → `dist/skills/` so bundled skill files ship with the package

After building, run the CLI directly: `node dist/index.js` or `./dist/index.js`.

---

## Type Checking

```bash
pnpm typecheck
```

Runs `tsc --noEmit` to verify all types without emitting output.

---

## Linting & Formatting

**There is no linter or formatter configured.** ESLint, Prettier, and Biome are all absent.
Follow the code style conventions below manually. Do not add linter configuration unless
explicitly asked.

---

## Testing

**Framework:** Vitest 4.x

```bash
pnpm test                                             # run all tests once
pnpm test:watch                                       # watch mode
pnpm test:coverage                                    # run with v8 coverage report
pnpm exec vitest run src/tests/config.test.ts         # run a single test file
pnpm exec vitest run -t "stores and retrieves"        # run tests matching a name pattern
```

**Test file locations:**

| File                         | What it covers                                             |
| ---------------------------- | ---------------------------------------------------------- |
| `src/tests/config.test.ts`   | Config store — installedSkills CRUD                        |
| `src/tests/commands.test.ts` | All command actions (ls, info, add, up, update, uninstall) |

**Mocking conventions:**

- `conf` is mocked with a `class MockConf` (must be a class — `Conf` is instantiated with `new`)
- `child_process` is mocked via `vi.mock('child_process', () => ({ execSync: mockExecSync }))`
  where `mockExecSync = vi.fn()` — used by `update` and `uninstall` commands
- `@inquirer/prompts` is mocked via `vi.mock('@inquirer/prompts', () => ({ select: mockSelect }))`
- `fs` is partially mocked — `mkdirSync`, `copyFileSync`, `writeFileSync`, `readFileSync`,
  `existsSync`, `readdirSync` are replaced; the rest of `fs` is kept from the actual module
- `ora` is mocked to a no-op spinner object so tests stay silent
- `console.log/error/warn` are silenced via `vi.spyOn(...).mockImplementation(() => undefined)`
- `process.exit` is mocked per-test with `vi.spyOn` and **always restored** with
  `exitSpy.mockRestore()` — never leave it mocked across tests
- When parsing Commander subcommands directly use `parseAsync(['node', 'cmd', ...args])`
  (two-element prefix, not three)

---

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs on every push and every PR:

1. **Type-check** — `pnpm typecheck` (`tsc --noEmit`)
2. **Test** — `pnpm test` (Vitest)
3. **Build** — `pnpm build` (tsup)

---

## Distribution

The CLI is published to **GitHub Packages** as `@levin-procommerce-de/bv`.

- `publishConfig.registry` in `package.json` points to `https://npm.pkg.github.com`
- `.npmrc` maps the `@levin-procommerce-de` scope to the GitHub Packages registry
- `files` array in `package.json` includes only `dist/` — source is not shipped
- `prepublishOnly` runs `pnpm build` to ensure `dist/` is fresh before publish

**Publishing workflow:**

```bash
# 1. Bump version in package.json
# 2. Build + test
pnpm build && pnpm test
# 3. Publish
npm publish
```

**End users install with:**

```bash
npm install -g @levin-procommerce-de/bv
```

(Requires `~/.npmrc` with a GitHub token that has `read:packages` scope — see README.md for
full setup instructions.)

---

## Project Structure

```
src/
  index.ts             # CLI entry — program setup, command registration
  config.ts            # Persistent config store (Conf-based, OS config dir)
  commands/
    ls.ts              # bv ls — list available skills
    add.ts             # bv add [skill] — install a skill to a provider
    up.ts              # bv up [skill] — check installed skills for updates
    info.ts            # bv info <skill> — show skill details
    update.ts          # bv update — self-update the CLI
    uninstall.ts       # bv uninstall — remove the CLI
  utils/
    logger.ts          # log.info/success/error/warn/line/label + spin()
    providers.ts       # install dir paths, provider labels, flat provider check
    skills.ts          # SkillMeta/SkillFile types, bundled skill registry, frontmatter parser
  tests/
    config.test.ts     # config store tests
    commands.test.ts   # command action tests (ls, info, add, up, update, uninstall)
  skills/              # Bundled skill files (copied to dist/skills/ at build time)
.github/workflows/
  ci.yml               # CI pipeline (typecheck, test, build)
.npmrc                 # GitHub Packages registry mapping for @levin-procommerce-de scope
dist/                  # Compiled output (gitignored, generated by pnpm build)
tsup.config.ts         # tsup build configuration
tsconfig.json          # TypeScript compiler options
```

---

## TypeScript Configuration

Key settings from `tsconfig.json`:

- `"strict": true` — all strict checks enabled; never disable this
- `"module": "ESNext"` + `"moduleResolution": "bundler"` — modern ESM
- `"target": "ES2022"` — no transpiling to older syntax
- `"resolveJsonModule": true` — JSON files can be imported
- Package is `"type": "module"` — pure ESM throughout; no CommonJS

---

## Code Style

### Imports

- Use ES module `import` syntax exclusively — never `require()`
- Named imports are preferred: `import { Command } from 'commander'`
- Default imports when a module only has a default: `import chalk from 'chalk'`
- Mixed default + type imports: `import ora, { type Ora } from 'ora'`
- Relative imports use no file extension: `import { log } from '../utils/logger'`
- Node built-ins use bare specifiers without the `node:` prefix:
  `import path from 'path'` not `import path from 'node:path'`
- Import order (no enforced tool, follow manually):
  1. Third-party packages
  2. Internal absolute-ish imports (`../config`, `../utils/skills`)
  3. Relative utilities

### Formatting

- **2-space indentation**
- **Single quotes** for all string literals
- **Semicolons** at the end of statements
- **Trailing commas** in multi-line object/array literals
- **Template literals** for string interpolation, not concatenation
- Max line length: keep lines readable; wrap long function signatures at ~100 chars
- Section dividers in larger files use ASCII box-drawing style:
  `// ─── SECTION NAME ──────────────────────────────────────────────────────────`

### Naming Conventions

| Construct                  | Convention                       | Example                                        |
| -------------------------- | -------------------------------- | ---------------------------------------------- |
| Variables, functions       | `camelCase`                      | `getBundledSkills`, `getInstallDir`            |
| Exported command instances | `camelCase` + `Command` suffix   | `addCommand`, `updateCommand`                  |
| Interfaces / Types         | `PascalCase`                     | `SkillMeta`, `BvConfig`, `InstalledSkillEntry` |
| Source files               | `camelCase.ts`                   | `config.ts`, `providers.ts`, `skills.ts`       |
| Command files              | lowercase verb matching CLI name | `add.ts`, `ls.ts`, `up.ts`, `update.ts`        |

### Types

- `"strict": true` is non-negotiable — all code must type-check cleanly
- Use explicit type annotations on function parameters and return types
- Prefer `interface` for object shapes (`BvConfig`, `SkillMeta`)
- Use `type` for unions, aliases, and utility types (`Provider`, `Scope`)
- Cast JSON API responses with `as`: `JSON.parse(...) as { version: string }`
- Avoid `any`; use `unknown` and narrow explicitly when needed
- Optional properties use `?`: `author?: string`

### Error Handling

Standard pattern for command actions:

```typescript
try {
  // async work
  spinner.succeed('Done');
} catch (err) {
  spinner.fail('Something went wrong');
  log.error((err as Error).message);
  process.exit(1);
}
```

Rules:

- Always cast caught errors as `(err as Error).message` when logging
- Use spinner `.fail()` before `log.error()` for async operations that have a spinner
- Use `process.exit(1)` for fatal errors in command actions
- Use guard clauses at the top of action handlers (validate args, check state)
- When shelling out via `execSync`, catch failures and provide user-friendly error messages

### Logging

Use `log` and `spin` from `src/utils/logger.ts` — never use `console.log` directly for
user-facing output in command files (except blank line separators: `console.log()`).

```typescript
log.info('message'); // blue  i
log.success('message'); // green checkmark
log.error('message'); // red   x  (writes to stderr)
log.warn('message'); // yellow warning
log.line(); // gray separator line
log.label('key', 'val'); // aligned key-value pair

const spinner = spin('Loading...'); // returns an ora Ora instance
spinner.succeed('Done');
spinner.fail('Failed');
spinner.stop();
```

### Command Architecture

Each subcommand lives in its own file in `src/commands/`. The pattern is:

1. Define internal helper functions (not exported) for complex logic
2. Export a single `const <name>Command = new Command('name')` at the bottom
3. Chain `.description()`, `.argument()`, `.option()`, `.action()` fluently
4. Register the command in `src/index.ts` via `program.addCommand(<name>Command)`

```typescript
// Internal helper — not exported
function doWork(arg: string) { ... }

// Exported command — the only export
export const myCommand = new Command('my')
  .description('Does something')
  .argument('<name>', 'The name')
  .action(async (name: string) => {
    try {
      doWork(name)
    } catch (err) {
      log.error((err as Error).message)
      process.exit(1)
    }
  })
```

---

## Key Dependencies

| Package             | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `commander`         | CLI framework — argument/option parsing, subcommands |
| `chalk`             | Terminal colors and styling                          |
| `ora`               | Terminal spinners                                    |
| `@inquirer/prompts` | Interactive prompts (provider/scope selection)       |
| `conf`              | Persistent key-value config (OS config directory)    |

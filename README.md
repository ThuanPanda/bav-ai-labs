# bv

Bavaan internal CLI — install AI agent skills into your coding tools.

This is a **private** package hosted on GitHub Packages. You must be a collaborator on the `bav-ai-labs` repo to install it.

## Install

### Prerequisites

- Node.js 24+
- Access to the `ThuanPanda/bav-ai-labs` repo (ask your team lead to invite you)

### Step 1 — Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens/new
2. Give it a name, e.g. `bv-cli`
3. Select scope: **`read:packages`** (only this one is needed)
4. Click **Generate token** and copy it

### Step 2 — Configure npm

Run these two commands in your terminal (replace `YOUR_TOKEN` with the token you just created):

```bash
echo "@bav-ai-labs:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN" >> ~/.npmrc
```

This only needs to be done **once** per machine.

### Step 3 — Install

```bash
npm install -g @bav-ai-labs/bv
```

### Step 4 — Verify

```bash
bv --help
```

### Update to latest version

```bash
bv update
```

### Uninstall

```bash
bv uninstall
```

---

## Commands

| Command               | Description                         |
| --------------------- | ----------------------------------- |
| `bv ls`               | List all available skills           |
| `bv info <skill>`     | Show details about a skill          |
| `bv add skill <name>` | Install a skill                     |
| `bv up`               | Check installed skills for updates  |
| `bv update`           | Update bv CLI to the latest version |
| `bv uninstall`        | Uninstall bv CLI from your machine  |

### Adding a skill

```bash
bv add skill mep-engineering-playbook
```

You will be prompted to choose:

1. **Provider** — OpenCode / Claude Code / VS Code / Antigravity
2. **Scope** — Global (all projects) or Project (current directory only)

---

## Development

### Setup

```bash
git clone git@github.com:ThuanPanda/bav-ai-labs.git
cd bav-ai-labs
pnpm install
```

### Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `pnpm build`         | Compile TypeScript to `dist/`            |
| `pnpm dev`           | Watch mode (auto-reload on file changes) |
| `pnpm start`         | Run compiled CLI (`node dist/index.js`)  |
| `pnpm test`          | Run all tests                            |
| `pnpm test:watch`    | Run tests in watch mode                  |
| `pnpm test:coverage` | Run tests with coverage report           |
| `pnpm typecheck`     | Type-check without emitting              |

### Run locally without publishing

Link the local build to your global `bv` command:

```bash
pnpm build
pnpm link --global
```

After making changes, just rebuild:

```bash
pnpm build
```

To unlink when done:

```bash
pnpm unlink --global
```

### Publish a new version

1. Bump version:

```bash
npm version patch   # 0.1.0 -> 0.1.1
npm version minor   # 0.1.0 -> 0.2.0
npm version major   # 0.1.0 -> 1.0.0
```

2. Push:

```bash
git push && git push --tags
```

3. Publish to GitHub Packages:

```bash
npm publish
```

> Your GitHub token needs `write:packages` scope to publish.
> `prepublishOnly` will automatically run `pnpm build` before publishing.

Team members can then update with:

```bash
bv update
```

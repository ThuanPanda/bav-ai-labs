---
name: react-colors
description: Enforce color token usage. Always use semantic tokens from src/index.css. If a new color is needed, define it in both :root (light) and .dark (dark mode) before using it.
triggers:
  - add color
  - new color
  - color token
  - custom color
  - background color
  - text color
  - border color
  - hardcoded color
  - bg-
  - text-
  - dark mode color
  - oklch
argument-hint: "<color-purpose> (e.g. 'success state background', 'warning badge text')"
---

# Color Token Rules

All colors must come from semantic tokens defined in `src/index.css`. Never hardcode color values. If a required token doesn't exist, define it in both `:root` and `.dark` before using it.

## When to Activate

- Writing any Tailwind class that involves color (`bg-`, `text-`, `border-`, `ring-`, `fill-`, `stroke-`)
- Adding a color that isn't covered by existing tokens
- Reviewing a component for hardcoded colors

## Existing Tokens (src/index.css)

### Base & Typography
| Token | Tailwind class | Use |
|---|---|---|
| `--background` | `bg-background` | Page background |
| `--foreground` | `text-foreground` | Primary text |
| `--muted` | `bg-muted` | Subtle background (inputs, tags) |
| `--muted-foreground` | `text-muted-foreground` | Secondary/placeholder text |

### Cards & Popovers
| Token | Tailwind class | Use |
|---|---|---|
| `--card` | `bg-card` | Card surface |
| `--card-foreground` | `text-card-foreground` | Text on cards |
| `--popover` | `bg-popover` | Dropdown / tooltip background |
| `--popover-foreground` | `text-popover-foreground` | Text in dropdowns |

### Interactive
| Token | Tailwind class | Use |
|---|---|---|
| `--primary` | `bg-primary` / `text-primary` | Primary action, active state |
| `--primary-foreground` | `text-primary-foreground` | Text on primary background |
| `--secondary` | `bg-secondary` | Secondary action |
| `--secondary-foreground` | `text-secondary-foreground` | Text on secondary |
| `--accent` | `bg-accent` | Hover highlight |
| `--accent-foreground` | `text-accent-foreground` | Text on accent |

### Semantic States
| Token | Tailwind class | Use |
|---|---|---|
| `--destructive` | `bg-destructive` / `text-destructive` | Error / delete / danger |
| `--ring` | `ring-ring` | Focus ring |

### Borders & Inputs
| Token | Tailwind class | Use |
|---|---|---|
| `--border` | `border-border` | All borders |
| `--input` | `border-input` | Form input borders |

### Charts
| Token | Tailwind class | Use |
|---|---|---|
| `--chart-1` … `--chart-5` | `bg-chart-1` … `bg-chart-5` | Data visualization |

### Sidebar
| Token | Use |
|---|---|
| `--sidebar`, `--sidebar-foreground` | Sidebar background and text |
| `--sidebar-primary`, `--sidebar-primary-foreground` | Active sidebar item |
| `--sidebar-accent`, `--sidebar-accent-foreground` | Sidebar hover |
| `--sidebar-border`, `--sidebar-ring` | Sidebar dividers |

## Adding a New Token

When no existing token fits (e.g. "success", "warning"):

1. **Define the token** in `src/index.css` — both `:root` and `.dark`:

```css
:root {
  --success: oklch(0.65 0.15 145);
  --success-foreground: oklch(0.985 0 0);
}

.dark {
  --success: oklch(0.55 0.13 145);
  --success-foreground: oklch(0.985 0 0);
}
```

2. **Register in the `@theme inline` block**:

```css
@theme inline {
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
}
```

3. **Use the Tailwind class**:

```tsx
<span className="bg-success text-success-foreground">Active</span>
```

## Key Rules

- **Never use hardcoded hex/rgb/oklch values in JSX/TSX** — only in `src/index.css` definitions
- **Never use Tailwind's built-in palette** (`bg-gray-100`, `text-blue-500`, etc.) — always map to a semantic token
- **Always define both `:root` and `.dark`** when adding a new token — never add one and forget the other
- **Always register in `@theme inline`** — without this, Tailwind won't generate the utility class
- **Use `oklch()` color space** — consistent with existing token definitions
- **Check both themes before merging** — toggle the `dark` class on `<html>` and verify contrast; the dark value must stay readable, following the same convention as the existing `--foreground`/`--background` pair

## Anti-Patterns

```tsx
// ✗ Hardcoded color
<div className="bg-[#f5f5f5]" />

// ✗ Tailwind palette color
<p className="text-gray-500" />

// ✗ Manual dark mode override in a component
<div className="bg-white dark:bg-zinc-900" />

// ✗ Inline style
<div style={{ backgroundColor: '#fff' }} />
```
## Agent Skill Synchronization

Follow [SKILL-SYNC.md](../../../SKILL-SYNC.md) whenever creating or changing this skill. Keep the same folder name and identical `SKILL.md` content in `.github/skills/`, `.claude/skills/`, `.codex/skills/`, and `.omc/skills/` so Copilot, Claude Code, Codex, and OpenCode stay synchronized.

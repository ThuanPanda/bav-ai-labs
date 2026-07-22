---
name: nextjs-component
description: Create React components following feature-based conventions. Use when creating a component, skeleton, shared component, HOC, splitting an oversized component, or ensuring responsive/dark-mode support.
triggers:
  - create component
  - new component
  - skeleton component
  - add skeleton
  - shared component
  - HOC
  - higher-order component
  - split component
  - responsive component
  - dark mode component
  - feature component
argument-hint: "<component-name> [purpose] (e.g. 'data table for user list with pagination')"
---

# Component Patterns

Create React components following the project's conventions: feature-scoped, skeleton loading, responsive, dark-mode safe, i18n translated.

## When to Activate

- Creating a new UI component inside a feature
- Adding a skeleton loading state for a data-fetching component
- Making a component reusable across features via HOC
- Splitting a file that exceeds 200 lines
- Deciding feature-scoped vs. shared placement

## Workflow

1. **Create the component** in `src/features/<feature>/(components)/component-name.tsx`
2. **Create matching skeleton** `component-name-skeleton.tsx` using shadcn `Skeleton`
3. **Apply responsive layout** — mobile-first: base → `sm:` → `md:` → `lg:`
4. **Use only semantic color tokens** — never hardcoded colors
5. **Translate all static text** — `useTranslations()` from `next-intl`
6. **Check line count** — if > 200 lines, extract sub-components or move logic to hooks
7. **Evaluate reusability** — feature-scoped by default; move to `src/shared/components/` only if used in 3+ features
8. **HOC if needed** — wrap base component for feature-specific variants instead of adding feature flags

## Key Rules

- **Kebab-case file names**: `event-card.tsx`, `user-list-skeleton.tsx` — never camelCase or PascalCase
- **`'use client'`** required when using hooks, event handlers, or browser APIs
- **No business logic** in components — delegate to custom hooks
- **No `forwardRef`** — `ref` is a regular prop in React 19
- **No `useMemo` / `useCallback` / `memo`** — React Compiler handles memoization automatically
- **Max 200 lines** per file
- **1 component per file** — each exported component lives in its own file
- **No `(types)/` folder** — define types inline:
  - Prop types: `type Props = { ... }` at the top of the component file
  - Data types: at the top of the hook file that returns them
- **Mock data in hooks** — mock data lives in `use-X-data.ts`, never in component files

## Semantic Color Tokens (dark mode)

| Use | Token |
|-----|-------|
| Page background | `bg-background` |
| Primary text | `text-foreground` |
| Secondary/muted text | `text-muted-foreground` |
| Card background | `bg-card` |
| Muted background | `bg-muted` |
| Borders | `border-border` |
| Destructive/error | `bg-destructive` |

Never use hardcoded values like `bg-white`, `text-black`, `text-gray-500`.

## Skeleton Template

```tsx
import { Skeleton } from '@/shared/components/ui/skeleton';

export function FeatureListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

## HOC Pattern

```tsx
// Base component in feature A
export function DataTable<T>({ columns, data }: DataTableProps<T>) { ... }

// Feature B customizes via HOC — no feature flags
export const UserTable = withFeatureConfig(DataTable, {
  defaultPageSize: 20,
  showExport: true,
});
```

## Custom Icons

All custom SVG icons that are not available in `lucide-react` must be added to `src/shared/components/icons.tsx` as named React components — **never inline raw `<svg>` markup inside feature components**.

```tsx
// ✗ Wrong — raw SVG inline in a feature component
function MyCell() {
  return <svg width="18" height="18">...</svg>;
}

// ✓ Correct — add to icons.tsx, import where needed
import { IconSignal } from '@/shared/components/icons';
function MyCell() {
  return <IconSignal className="size-4" />;
}
```

Icon component conventions in `icons.tsx`:
- Named export: `IconFoo` (PascalCase with `Icon` prefix)
- Props: `className?: string`, `color?: string` (defaults to `'currentColor'`)
- Always add `className={cn('shrink-0', className)}` to the `<svg>` element

## Design Pixel Tolerance

When implementing from designs, **do not chase exact pixels**:

- Match the visual intent and proportions, not every exact pixel
- Use the **nearest available Tailwind spacing/size class** rather than arbitrary values like `h-[37px]`
- Prefer semantic tokens over hardcoded colors even when the design hex doesn't perfectly match
- Minor padding/margin differences (±4px) are acceptable

## Notes

- Every component that fetches data **must** have a sibling `*-skeleton.tsx`
- Responsive grid example: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Add i18n keys to both `src/messages/en.json` and `src/messages/de.json`
## Agent Skill Synchronization

Follow [SKILL-SYNC.md](../../../SKILL-SYNC.md) whenever creating or changing this skill. Keep the same folder name and identical `SKILL.md` content in `.github/skills/`, `.claude/skills/`, `.codex/skills/`, and `.omc/skills/` so Copilot, Claude Code, Codex, and OpenCode stay synchronized.

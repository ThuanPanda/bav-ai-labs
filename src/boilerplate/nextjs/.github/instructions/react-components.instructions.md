---
description: "Use when creating or editing React components inside feature folders. Covers component splitting, skeleton files, responsive design, dark mode, HOC patterns, and 'use client' directives."
applyTo: "src/**/components/**/*.tsx"
---

# React Component Guidelines

## File Rules

- **Kebab-case file names** — `event-card.tsx`, `user-list-skeleton.tsx`. Never use camelCase or PascalCase for file names.
- **Max 200 lines** per file. If a component exceeds this, extract sub-components or move logic to hooks.
- **No business logic** in components — delegate to custom hooks. Components only render JSX.
- **No magic numbers** — Never hardcode numeric or string literals. Import constants from `@/shared/constants/*`.
- **`'use client'`** directive is required when using hooks, event handlers, or browser APIs.
- **No `forwardRef`** — `ref` is a regular prop in React 19. Pass `ref` directly, never wrap with `forwardRef`.
- **No manual memoization** — React Compiler is ON. Do NOT use `useMemo`, `useCallback`, or `memo`.
- **1 component per file** — each exported component lives in its own file.

## Skeleton Pattern

Every component that displays fetched data **must** have a sibling skeleton file:

```
(components)/
├── user-list.tsx
└── user-list-skeleton.tsx
```

```tsx
import { Skeleton } from '@/shared/components/ui/skeleton';

export function UserListSkeleton() {
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

## Responsive Design (Mobile-First)

Always design mobile-first, scale up with breakpoints:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* content */}
</div>
```

Breakpoint order: base (mobile) → `sm:` (640px) → `md:` (768px) → `lg:` (1024px) → `xl:` (1280px).

## Dark Mode

Use **semantic tokens** from the theme — never hardcode colors:

| Do | Don't |
|----|-------|
| `bg-background` | `bg-white dark:bg-gray-900` |
| `text-foreground` | `text-black dark:text-white` |
| `text-muted-foreground` | `text-gray-500` |
| `border-border` | `border-gray-200` |
| `bg-card` | `bg-white` |
| `bg-muted` | `bg-gray-100` |
| `bg-destructive` | `bg-red-500` |

## Shared vs Feature-Scoped

- **Feature-scoped by default**: Components live in the feature's `(components)/` folder.
- **Move to `src/shared/components/`** only when **genuinely reused across 3+ features**.
- **HOC pattern** for customization: wrap with a Higher-Order Component rather than adding feature flags.

## Translation

All static text must use `useTranslations()` from `next-intl`:

```tsx
import { useTranslations } from 'next-intl';

export function UserHeader() {
  const t = useTranslations('users');
  return <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>;
}
```

Add keys to both `src/messages/en.json` and `src/messages/de.json`.

## Custom Icons

All custom SVG icons live in `src/shared/components/icons.tsx`:
- Named export: `IconFoo` (PascalCase with `Icon` prefix)
- Props: `className?: string`, `color?: string` (defaults to `'currentColor'`)
- Never inline raw `<svg>` markup inside feature components

# Next.js Boilerplate — Claude Code Rules

## Stack

| Layer         | Library                                                              |
| ------------- | -------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack, **React Compiler ON**)            |
| Language      | TypeScript 5, React 19                                               |
| Styling       | Tailwind CSS v4 + shadcn (radix-nova style)                          |
| Data fetching | TanStack Query v5 + Axios                                            |
| Forms         | react-hook-form v7 + zod v4                                          |
| i18n          | next-intl v4 (locales: `en`, `de`)                                   |
| Global state  | zustand v5                                                           |
| Icons         | lucide-react + custom SVG icons in `src/shared/components/icons.tsx` |
| Theme         | next-themes (`attribute="class"`, default `dark`)                    |

---

## Skills

Use the `.claude/skills/` skill files for detailed implementation patterns. They are kept in sync with the Copilot, Codex, and OpenCode copies; follow [SKILL-SYNC.md](SKILL-SYNC.md) whenever creating or changing a skill.

| Skill              | When to invoke                               |
| ------------------ | -------------------------------------------- |
| `nextjs-component` | Creating any React component                 |
| `nextjs-feature`   | Scaffolding a new feature end-to-end         |
| `nextjs-data`      | TanStack Query hooks and service files       |
| `nextjs-form`      | Forms with react-hook-form + zod             |
| `nextjs-url`       | URL state, filters, pagination, deep linking |
| `nextjs-i18n`      | Adding/updating translation keys             |
| `nextjs-colors`    | Working with color tokens                    |
| `nextjs-button`    | Button variants and sizes                    |
| `nextjs-tab`       | URL-synced tab navigation                    |

---

## Critical Import Rules

```ts
// ✅ ALWAYS use these
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';

// ❌ NEVER import from next/navigation directly
import { useRouter } from 'next/navigation'; // WRONG
```

---

## React 19 / Next.js 16 Rules

- **No `useMemo`, `useCallback`, `memo`** — React Compiler handles optimization automatically
- **No `forwardRef`** — pass `ref` as a regular prop
- **No `<Context.Provider>`** — use `<Context>` directly as provider
- **Use `useEffectEvent`** for non-reactive logic inside `useEffect`
- **Use `useOptimistic`** for optimistic UI updates
- **Use `use()`** API for reading promises or context
- **Async page params**: `const { id } = await params` (not `params.id` directly)
- **Middleware**: use `src/proxy.ts` pattern, not `middleware.ts`

---

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── api/                        # API route handlers (proxy to backend)
│   ├── [locale]/
│   │   ├── (auth)/                 # Unauthenticated pages
│   │   ├── (protected)/            # Authenticated pages + shared layout
│   │   │   └── layout.tsx          # SidebarProvider + PageHeader + main padding
│   │   └── layout.tsx              # Root: ThemeProvider + i18n + fonts
│   └── globals.css                 # Tailwind + @font-face + CSS tokens
├── features/<name>/                # Feature-based modules
│   ├── (helpers)/                  # Zod schemas (forms only)
│   ├── (services)/<name>-service.ts
│   ├── (hooks)/use-<name>-data.ts, use-<name>-actions.ts
│   └── (components)/<name>-main.tsx, <name>-main-skeleton.tsx
├── i18n/
│   ├── routing.ts                  # defineRouting (locales, defaultLocale)
│   └── navigation.ts              # Re-exports Link, useRouter, usePathname
├── lib/
│   ├── api-client.ts              # Axios + error toasts + auth redirect
│   ├── query-config.ts
│   └── utils.ts                   # cn()
├── messages/
│   ├── en.json
│   └── de.json
└── shared/
    ├── components/
    │   ├── icons.tsx              # ALL custom SVG icons live here
    │   └── ui/                    # shadcn primitives
    ├── constants/
    ├── hooks/
    ├── providers/                 # ThemeProvider, ReactQueryProvider, ToastProvider
    ├── services/
    ├── stores/
    └── types/
```

### Feature Scoping

- New components go **inside the feature** (`src/features/<name>/(components)/`)
- Move to `src/shared/components/` only when **3+ features** use the same component
- Sub-features: nested regular folders (no parentheses) inside the feature folder

### Types

- **No `(types)/` folder** — define types inline where used:
  - Response/data types → top of the hook file that returns them (e.g. `use-users-data.ts`)
  - Component prop types → inside the component file as `type Props = { ... }`
- **Mock data in hooks** — never in component files

---

## File Rules

- **Max 200 lines per file** — split into smaller units if exceeded
- **Kebab-case filenames**: `user-card.tsx`, `use-user-data.ts` (never PascalCase filenames)
- **`'use client'`** required at top of any file using hooks, browser APIs, or event handlers
- Server Components are the default — only add `'use client'` when necessary
- **1 component per file** — each exported component in its own `.tsx` file
- **Mock data in hooks** — fake/stub data lives in the hook, not in components

---

## Component Rules

- **Logic in hooks, not components** — components only render JSX
- **No business logic** in component files
- **No magic numbers** — extract to named constants
- **Skeleton pattern**: every data-fetching component has a `*-skeleton.tsx` sibling
- **Mobile-first responsive**: use `sm:`, `md:`, `lg:` breakpoints
- **Dark mode**: handled automatically via CSS semantic tokens — never write `.dark:` overrides in components

### Custom Icons

All custom SVG icons live in **`src/shared/components/icons.tsx`** as named exports:

```tsx
// ✅ Correct
import { IconCube } from '@/shared/components/icons';
<IconCube color="currentColor" className="size-6" />

// ❌ Never inline raw SVG in a component file
<svg>...</svg>
```

Icon props: `className?: string`, `color?: string` (default `'currentColor'`).
Naming convention: `Icon<Name>` (PascalCase).

---

## Styling Rules

- **Tailwind CSS v4** — use canonical class names (`h-18` not `h-[72px]`)
- **Semantic color tokens only** — never hardcode `#hex`, `rgb()`, or raw color values in JSX
- **oklch() color space** in `globals.css` — register new colors in `@theme inline` and `:root`/`.dark`
- **Design pixel tolerance** — match design intent using the nearest Tailwind class; do not chase exact pixels

Available semantic tokens (key ones):

```
bg-background / text-foreground
bg-card / text-card-foreground
bg-muted / text-muted-foreground
bg-primary / text-primary-foreground
bg-destructive
border-border / border-input
bg-sidebar / text-sidebar-foreground
```

---

## Data Fetching

- **CSR only** — all data fetching via `useQuery` (never `getServerSideProps` or `fetch` in Server Components for authenticated data)
- **Services are thin wrappers** — no try/catch, no toasts, no side effects
- **Return `data` directly** from axios responses: `const { data } = await apiClient.get<T>(url); return data;`
- Cache invalidation in `onSuccess` of `useMutation`
- **URL state for filters/pagination** — never `useState` for page, search, sort, filters; use **nuqs** (`useQueryStates`) for all URL param reads/writes

```ts
// ✅ Service pattern
export async function getUsers(params: UserFilters) {
  const { data } = await apiClient.get<PaginatedResponse<User>>('/users', { params });
  return data;
}

// ✅ Query hook pattern
export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => getUsers(filters),
  });
}
```

---

## Forms

- **Zod schemas** in `(helpers)/<feature>-schema.ts`
- **Form logic** in `(hooks)/use-<name>-form.ts`
- **`useFormContext()`** for child field components (multi-step or complex forms)
- **Translate validation messages** — zod `.message()` must use i18n keys resolved at runtime
- **`FormProvider`** wraps complex multi-step forms

---

## i18n

- **All static text** via `useTranslations('namespace')` — never hardcode strings in JSX
- **Never translate dynamic API data** (names, descriptions from backend)
- **Both `en.json` and `de.json`** must be updated together whenever adding keys
- Namespace per feature in camelCase matching the folder name

```tsx
// ✅ Correct
const t = useTranslations('users');
<h1>{t('title')}</h1>

// ❌ Never
<h1>Users</h1>
```

---

## API Client

`src/lib/api-client.ts` features:

- Base URL: `/api` (Next.js route handlers proxy to backend)
- Auto 401 redirect to login
- Cross-tab logout via `BroadcastChannel('auth')`
- Error toasts via react-toastify
- Headers: `x-lang` (locale), `x-user-identifier` (fingerprint)

---

## What NOT to Do

- ❌ `useMemo`, `useCallback`, `React.memo`
- ❌ `forwardRef`
- ❌ Inline SVG in component files (use `icons.tsx`)
- ❌ Hardcoded colors (`#hex`, `rgb()`) in JSX/TSX
- ❌ `import { useRouter } from 'next/navigation'`
- ❌ `useState` for search/filter/pagination (use nuqs `useQueryStates`)
- ❌ Page route without a sibling `loading.tsx`
- ❌ try/catch in service files
- ❌ Toast calls in service files
- ❌ Files longer than 200 lines
- ❌ Multiple exported components in one file
- ❌ Mock/fake data defined in component files (put in hooks)
- ❌ Separate `(types)/` folder — types go inline in hooks or components
- ❌ Hardcoded strings in JSX (use `useTranslations`)
- ❌ Adding only `en.json` without updating `de.json`

# React (Vite) Boilerplate — Claude Code Rules

## Stack

| Layer         | Library                                                    |
| ------------- | ----------------------------------------------------------- |
| Framework     | Vite + React 19                                            |
| Routing       | TanStack Router (file-based, under `src/routes/**`)        |
| Language      | TypeScript 5                                               |
| Styling       | Tailwind CSS v4 + shadcn (radix-nova style)                 |
| Data fetching | TanStack Query v5 + Axios                                  |
| Forms         | react-hook-form v7 + zod v4                                |
| i18n          | react-i18next (locales: `en`, `de`)                         |
| Notifications | sonner                                                      |
| Icons         | lucide-react                                               |
| Theme         | next-themes (`attribute="class"`)                           |

---

## Skills

Use the `.claude/skills/` skill files for detailed implementation patterns. They are kept in sync with the Copilot, Codex, and OpenCode copies; follow [SKILL-SYNC.md](SKILL-SYNC.md) whenever creating or changing a skill.

| Skill              | When to invoke                               |
| ------------------ | --------------------------------------------- |
| `react-component`  | Creating any React component                  |
| `react-feature`    | Scaffolding a new feature end-to-end          |
| `react-data`       | TanStack Query hooks and service files         |
| `react-i18n`       | Adding/updating translation keys               |
| `react-colors`     | Working with color tokens                      |
| `react-button`     | Button variants and sizes                      |

---

## Critical Rules

1. **Routes are thin.** `src/routes/**` only declares the `Route`, `beforeLoad`/`loader` (redirects, guards, pre-fetching), and wires `component` to the feature's page. Never put UI or business logic directly in a route file.
2. **Feature-based architecture.** All UI, state, hooks, and mock/API data for a feature live under `src/features/<feature-name>/`.
3. **No hardcoded text.** Every user-facing string goes through `t('...')` (react-i18next). Both `en` and `de` locale files must be updated together.
4. **No raw `<button>`.** Always use `Button` from `@/components/ui/button` with existing `variant`/`size` props — never resize it via `className`.
5. **No hardcoded colors.** Only semantic tokens from `src/index.css` (`bg-background`, `text-foreground`, etc.) — never `#hex`, `rgb()`, or Tailwind's default palette (`bg-red-500`).

```ts
// ✅ ALWAYS use these
import { Link, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ❌ NEVER
import { useNavigate } from 'react-router-dom'; // wrong library
<button className="...">Click</button>; // raw button
```

---

## Architecture

### Directory Structure

```
src/
├── routes/                          # Routing only (TanStack Router, file-based)
│   ├── __root.tsx                   # Root route: <Outlet /> + <Toaster />
│   ├── index.tsx                    # `/` — redirect to a real route
│   ├── login.tsx                    # `/login` — thin wrapper -> LoginPage
│   ├── _app.tsx                     # Layout route -> AdminLayout (guard + shell)
│   └── _app/
│       └── dashboard.tsx            # `/_app/dashboard` — thin wrapper -> DashboardPage
├── features/<name>/                 # Feature-based modules
│   ├── <name>-page.tsx              # Main component, named export
│   ├── index.ts                     # Barrel — only export what routes/other code need
│   ├── components/                  # (when needed) UI pieces private to this feature
│   └── mock-data.ts                 # (when needed) mock data private to this feature
├── components/
│   ├── ui/                          # shadcn primitives (button, card, input, ...)
│   ├── layout/                      # App shell (AdminLayout, AppSidebar)
│   └── icons/                       # Small custom icon components, when lucide-react doesn't cover it
├── i18n/
│   ├── index.ts                     # i18next init, resources, namespace registration
│   ├── react-i18next.d.ts           # CustomTypeOptions typing for `t()`
│   └── locales/
│       ├── en/{common,auth,dashboard}.json
│       └── de/{common,auth,dashboard}.json
├── lib/
│   ├── api.ts                       # Axios instance + 401 handling
│   └── utils.ts                     # cn()
└── main.tsx                         # createRouter + RouterProvider
```

### Feature Scoping

- New components go **inside the feature** (`src/features/<name>/components/`) unless shared by 3+ features.
- Data/models shared across multiple features (e.g. the current user) live in `src/lib/`. Do not put shared data inside one feature and import it from another.
- UI components that are not specific to any feature live in `src/components/`.

---

## File Rules

- **Kebab-case filenames**: `login-page.tsx`, `use-mobile.ts` (never PascalCase filenames).
- **1 component per file** — each exported component in its own `.tsx` file.
- Minimum standard feature structure:

```
src/features/<feature-name>/
  <feature-name>-page.tsx   # main component, named export (LoginPage, DashboardPage, ...)
  index.ts                  # barrel — only export what routes/other code actually needs
  components/               # (when needed) UI pieces private to this feature
  mock-data.ts              # (when needed) mock data private to this feature
```

The corresponding route file is always thin:

```tsx
// src/routes/_app/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/features/dashboard'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})
```

---

## Component Rules

- **Logic in hooks, not components** when it grows beyond simple local state — keep components focused on rendering.
- **Mobile-first responsive**: use `sm:`, `md:`, `lg:` breakpoints.
- **Dark mode**: handled automatically via CSS semantic tokens — never write manual light/dark branches in components.
- Icons come from `lucide-react` directly; add a small wrapper under `src/components/icons/` only for icons that need custom markup lucide doesn't provide.

---

## Styling Rules

- **Tailwind CSS v4** — use canonical class names.
- **Semantic color tokens only** — never hardcode `#hex`, `rgb()`, or raw color values in JSX.
- **oklch() color space** in `src/index.css` — register new colors in `@theme inline` and both `:root`/`.dark`.

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

- **`@tanstack/react-query` + `axios`.** Services are thin wrappers — no try/catch, no toasts, no side effects.
- **Return `data` directly** from axios responses: `const { data } = await api.get<T>(url); return data;`
- Cache invalidation in `onSuccess` of `useMutation`.
- **Prefer TanStack Router search params for URL state** (filters, pagination, deep-linkable UI state); local component state or the React Query cache otherwise.

```ts
// ✅ Service pattern
export async function getUsers() {
  const { data } = await api.get<User[]>('/users');
  return data;
}

// ✅ Query hook pattern
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });
}
```

---

## Forms

- **react-hook-form** for form state, **zod** for schema validation via `@hookform/resolvers/zod`.
- Keep the zod schema next to the form (in the feature's `components/` or a dedicated file) — don't scatter validation logic inline in JSX.
- Translate validation messages — resolve zod error messages through `t()` at render time, don't hardcode English strings in the schema.

---

## i18n

- **All static text** via `useTranslation('<namespace>')` — never hardcode strings in JSX.
- Each feature owns its own translation namespace, named after the feature folder (e.g. `src/features/dashboard/` → namespace `dashboard`). The `common` namespace holds text shared across features (app name, shared actions like Save/Cancel).
- **Supported locales: `en` and `de` only.** Both `en/<ns>.json` and `de/<ns>.json` must be updated together whenever adding keys.
- When adding a new feature, add `<feature>.json` under both `en/` and `de/`, then register the namespace in `src/i18n/index.ts` (`resources`, `namespaces`) and declare its type in `src/i18n/react-i18next.d.ts`.
- Default namespace usage: `useTranslation('auth')` → `t('title')`. When you also need `common` strings, pass both and prefix explicitly: `useTranslation(['dashboard', 'common'])` → `t('common:app.name')`.

```tsx
// ✅ Correct
const { t } = useTranslation('dashboard');
<h1>{t('title')}</h1>;

// ❌ Never
<h1>Dashboard</h1>;
```

---

## What NOT to Do

- ❌ UI or business logic directly inside a route file (`src/routes/**`)
- ❌ Raw `<button>` instead of `Button` from `@/components/ui/button`
- ❌ Resizing `Button` via `className` (`h-*`, `px-*`, `text-*`, `size-*`) — use `variant`/`size` or add a new size to `buttonVariants`
- ❌ Hardcoded colors (`#hex`, `rgb()`) or Tailwind default palette classes (`bg-red-500`) in JSX/TSX
- ❌ Adding a color token to only `:root` (or only `.dark`) — both are required
- ❌ Hardcoded strings in JSX (use `useTranslation()` / `t()`)
- ❌ Adding translation keys to `en/*.json` without the matching `de/*.json` keys
- ❌ try/catch or toast calls in service files (`lib`/feature data layer)
- ❌ `useState` for page/search/sort/filter that should be shareable via a URL — prefer TanStack Router search params
- ❌ Shared data placed inside a single feature and imported by another feature — put it in `src/lib/` instead

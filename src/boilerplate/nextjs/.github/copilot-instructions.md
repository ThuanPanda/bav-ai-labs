# Next.js Boilerplate — Copilot Instructions

## Tech Stack

For task-specific guidance, use the matching skill in `.github/skills/`. When adding or changing a skill, follow [../SKILL-SYNC.md](../SKILL-SYNC.md) to synchronize Copilot, Claude Code, Codex, and OpenCode copies.

- **Framework**: Next.js 16 (App Router, React Compiler enabled, Turbopack default)
- **Language**: TypeScript 5, React 19
- **Data fetching**: TanStack Query v5 + Axios (`@/lib/api-client`)
- **Forms**: react-hook-form v7 + zod v4 + @hookform/resolvers
- **i18n**: next-intl v4 (locales: `en`, `de`) — messages in `src/messages/`
- **Styling**: Tailwind CSS v4 + shadcn (radix-nova style) — theme tokens in `src/app/globals.css`
- **State**: zustand v5 (global state only when URL params or server state won't suffice)
- **Icons**: lucide-react

## React 19 / Next.js 16 Rules

- **React Compiler is ON** — Do NOT use `useMemo`, `useCallback`, or `memo` for memoization. The compiler handles it automatically.
- **`useEffectEvent`** — Use `useEffectEvent` from `react` to extract non-reactive logic from Effects (e.g., read latest props/state inside intervals or event listeners without re-triggering the Effect).
- **No `forwardRef`** — `ref` is now a regular prop in React 19. Pass `ref` directly as a prop, never use `forwardRef`.
- **`<Context>` as provider** — Use `<MyContext value={...}>` directly, not `<MyContext.Provider>`.
- **`useOptimistic`** — Use React's built-in `useOptimistic` hook for optimistic UI updates instead of manual state.
- **`use` API** — Use `use()` from `react` to read promises or context conditionally (after early returns).
- **Async page props** — `params` and `searchParams` in page/layout components are async: `const { id } = await params`.
- **`proxy.ts`** — Use `proxy.ts` instead of `middleware.ts` (deprecated). Already configured in the project.

## Path Aliases

- `@/*` → `./src/*`

## Critical Import Rules

- **Link / useRouter / usePathname**: Import from `@/i18n/navigation`, NEVER from `next/link` or `next/navigation`
- **apiClient**: Import from `@/lib/api-client` — already configured with interceptors, auth, error toasts
- **cn()**: Import from `@/lib/utils`
- **UI primitives** (Button, Input, etc.): Import from `@/shared/components/ui/*`

## Architecture — Feature-Based

Features live in `src/features/`. Pages in `src/app/` are thin wrappers that import from features.
Internal folders use **group folder notation** `(parentheses)` to visually distinguish organizational folders from sub-features. Sub-features are **regular folders** without parentheses.

```
src/features/feature-name/
├── (components)/
│   ├── feature-main.tsx             # Primary UI ('use client')
│   └── feature-main-skeleton.tsx    # Loading skeleton
├── (hooks)/
│   ├── use-feature-data.ts          # useQuery wrapper
│   └── use-feature-actions.ts       # useMutation wrapper
├── (helpers)/
│   └── feature-schema.ts            # Zod validation schemas
├── (services)/
│   └── feature-service.ts           # API calls via apiClient
└── sub-feature/                     # Nested sub-feature (regular folder)
    ├── (components)/
    ├── (hooks)/
    ├── (services)/
    └── ...
```

Page routes remain as thin entry points:

```
src/app/[locale]/(group)/feature-name/
├── page.tsx              # Imports from @/features/feature-name/(components)/feature-main
└── loading.tsx           # Required — uses feature's skeleton
```

## Naming Convention

**All files and folders use kebab-case** (lowercase words separated by hyphens):

| Type | Example |
|------|---------|
| Feature folder | `event-board/`, `user-management/` |
| Group folder | `(components)/`, `(hooks)/`, `(services)/`, `(helpers)/` |
| Component file | `event-card.tsx`, `user-list-skeleton.tsx` |
| Hook file | `use-event-data.ts`, `use-user-filters.ts` |
| Service file | `event-service.ts`, `user-management-service.ts` |
| Sub-feature folder | `board-settings/`, `invite-member/` |

Never use camelCase, PascalCase, or snake_case for file/folder names.

## Core Rules

1. **Feature-scoped by default** — Components, hooks, services belong to their feature folder in `src/features/`. Only move to `src/shared/` when genuinely reused across **3+ features**.
2. **Max 200 lines per file** — If a file exceeds 200 lines, split into smaller components/hooks/utilities.
3. **Logic in hooks, not components** — All side effects, data transformations, and business logic go in custom hooks. Components only render UI.
4. **CSR for GET requests** — This is a dashboard app. Use `'use client'` + `useQuery` for data fetching. No SSR data fetching unless explicitly requested.
5. **Skeleton loading** — Every component that fetches data must have a matching `*-skeleton.tsx` file using shadcn's `Skeleton` component.
6. **Translate all static text** — Use `useTranslations()` from `next-intl`. Add keys to both `src/messages/en.json` and `src/messages/de.json`.
7. **Deep linking for pagination/filters** — Use URL search params (`nuqs` / `useQueryStates`). NEVER manage these in React state.
8. **Responsive + Dark mode** — Every component must be responsive (mobile-first: `sm:`, `md:`, `lg:`) and support dark mode via semantic tokens (`bg-background`, `text-foreground`, `border-border`, etc.).
9. **Cache only when needed** — Don't add `staleTime` / `gcTime` overrides unless caching is explicitly beneficial for the feature. The default config in `query-config.ts` (1 min staleTime) is usually sufficient.
10. **FormProvider for complex forms** — Multi-step forms or forms with many child components must use `FormProvider` from react-hook-form so children can access form state via `useFormContext()`.
11. **Zod schemas in `(helpers)/`** — All zod validation schemas must be separated into a `(helpers)/` folder inside the feature. Never define schemas inline in components or hooks.
12. **No magic numbers** — Never hardcode numeric/string literals in components or hooks. Extract all constants into `src/shared/constants/`.
13. **HOC for component reuse** — When a feature-specific component needs to be customized for another feature, use a Higher-Order Component pattern rather than adding feature flags or conditional logic.
14. **Sub-features** — A feature can contain nested sub-features (regular folders without parentheses) with their own complete ecosystem (`(components)/`, `(hooks)/`, `(services)/`).

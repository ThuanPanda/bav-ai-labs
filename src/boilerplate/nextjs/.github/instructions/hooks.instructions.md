---
description: "Use when creating or editing custom hooks in feature folders. Covers TanStack Query wrappers, mutation hooks, URL param hooks, side effect management, and hook composition."
applyTo: "src/**/hooks/**/*.ts"
---

# Custom Hook Guidelines

## Core Principle

**All logic lives in hooks, not components.** Components only render UI. Hooks handle:

- Data fetching (`useQuery` / `useMutation`)
- Data transformations
- Side effects
- URL param reading/writing
- Form logic coordination

## React 19 / Next.js 16 Rules

- **No manual memoization** — React Compiler is enabled. Do NOT use `useMemo`, `useCallback`, or `memo`. The compiler handles it.
- **`useEffectEvent`** — Use `useEffectEvent` from `react` to extract non-reactive logic from Effects. Use it when you need to read the latest props/state inside an Effect without re-triggering it (e.g., intervals, event listeners, WebSocket handlers).
- **`useOptimistic`** — Use React's built-in `useOptimistic` for optimistic UI updates instead of manual state management.
- **No `forwardRef`** — `ref` is a regular prop in React 19. Never use `forwardRef`.

## Naming Convention

All hook files use **kebab-case** with `use-` prefix:

- `use-feature-data.ts` — Read data (useQuery wrapper)
- `use-feature-actions.ts` — Write data (useMutation wrappers)
- `use-feature-filters.ts` — URL param state for filters/pagination

## Data Fetching Hooks (useQuery)

Always use `'use client'` + TanStack Query. No SSR data fetching.

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../(services)/user-service';

// Types live here — not in a separate file
export type User = { id: string; name: string; email: string };
export type UserFilters = { page: number; perPage: number; search: string };

export function useUserData(filters: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => getUsers(filters),
  });
}
```

**Rules:**
- Import service functions from the feature's `(services)/` folder
- Define types inline at the top of the hook file
- `queryKey` must include all parameters that affect the response
- Don't override `staleTime` / `gcTime` unless caching is explicitly needed
- Return the full `useQuery` result — let the component destructure `{ data, isPending, error }`

## Mutation Hooks (useMutation)

```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from '../(services)/user-service';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

**Rules:**
- Invalidate related queries in `onSuccess`
- Error toasts are handled by the `apiClient` interceptor — don't add manual error handling
- Success toasts or redirects can be added in `onSuccess`

## URL Param Hooks (nuqs)

Use `nuqs` (`useQueryStates`) for pagination, filters, and sort — never `useState`:

```ts
'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

const filtersParsers = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  search: parseAsString.withDefault(''),
  sort: parseAsString.withDefault(''),
};

export function useUserFilters() {
  const [filters, setFilters] = useQueryStates(filtersParsers, {
    shallow: false,
  });

  function updateFilters(updates: Partial<typeof filters>) {
    const patch = { ...updates } as Partial<typeof filters>;
    if (!('page' in updates)) patch.page = 1;
    setFilters(patch);
  }

  return { filters, setFilters: updateFilters };
}
```

## Hook Composition

Compose hooks for complex features:

```ts
export function useUserPage() {
  const { filters, setFilters } = useUserFilters();
  const { data, isPending } = useUserData(filters);
  const { remove } = useUserActions();

  return { filters, setFilters, data, isPending, remove };
}
```

## `useEffectEvent` Pattern

```ts
import { useEffect, useEffectEvent } from 'react';

export function usePolling(fetchFn: () => void, interval: number) {
  const onTick = useEffectEvent(() => {
    fetchFn(); // always reads latest fetchFn without re-triggering Effect
  });

  useEffect(() => {
    const id = setInterval(onTick, interval);
    return () => clearInterval(id);
  }, [interval]);
}
```

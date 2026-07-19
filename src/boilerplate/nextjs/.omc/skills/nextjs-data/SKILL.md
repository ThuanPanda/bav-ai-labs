---
name: nextjs-data
description: Create data fetching patterns with TanStack Query v5 and apiClient. Use when adding API integration, creating useQuery/useMutation hooks, paginated queries, optimistic updates, or cache invalidation.
triggers:
  - fetch data
  - API call
  - useQuery
  - useMutation
  - tanstack query
  - data fetching
  - cache invalidation
  - optimistic update
  - pagination query
  - infinite scroll
  - api integration
argument-hint: "<resource-name> [operations] (e.g. 'users with list, create, delete')"
---

# Data Fetching Patterns

Set up TanStack Query v5 data fetching with the project's `apiClient` (Axios instance with interceptors for auth, error toasts, locale headers).

## API Client Architecture

`apiClient` is exported from `@/lib/api-client`:

- **baseURL**: `/api` — calls Next.js route handlers which proxy to backend
- **Interceptors**: auth 401 redirect, error toasts, locale/fingerprint headers

```ts
import apiClient from '@/lib/api-client';
```

## When to Activate

- Adding API integration to a feature
- Creating `useQuery` / `useMutation` hooks
- Setting up pagination with server-side data
- Implementing optimistic updates
- Configuring cache invalidation

## Workflow

1. **Define types inline** — no separate `(types)/` folder:
   - Entity interface, request DTOs, filter types → top of the hook file that uses them
   - Component prop types → inside the component file

2. **Create service** in `(services)/resource-service.ts`:
   - Typed functions using `apiClient`
   - Destructure `{ data }` from Axios response and return it
   - No try-catch, no side effects

3. **Create query hook** in `(hooks)/use-resource-data.ts`:
   - Define entity/filter types at the top of this file
   - `useQuery` wrapper with typed `queryKey` including all filter params

4. **Create mutation hook** in `(hooks)/use-resource-actions.ts`:
   - `useMutation` with `queryClient.invalidateQueries()` in `onSuccess`

5. **Create skeleton** in `(components)/resource-skeleton.tsx`

6. **Wire up** in component — destructure `{ data, isPending }`, render skeleton when loading

## Omitting Empty Params

Never send empty string or null/undefined values as query params:

```ts
function cleanParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  ) as Partial<T>;
}
```

## Service Template

```ts
// (services)/user-service.ts
import apiClient from '@/lib/api-client';

function cleanParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  ) as Partial<T>;
}

export async function getUsers(filters: UserFilters) {
  const { data } = await apiClient.get<PaginatedResponse<User>>('/users', {
    params: cleanParams(filters),
  });
  return data;
}

export async function getUserById(id: string) {
  const { data } = await apiClient.get<User>(`/users/${id}`);
  return data;
}

export async function createUser(dto: CreateUserDto) {
  const { data } = await apiClient.post<User>('/users', dto);
  return data;
}

export async function updateUser(id: string, dto: Partial<CreateUserDto>) {
  const { data } = await apiClient.patch<User>(`/users/${id}`, dto);
  return data;
}

export async function deleteUser(id: string) {
  await apiClient.delete(`/users/${id}`);
}
```

## Query Hook Template

```ts
// (hooks)/use-user-data.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../(services)/user-service';

// Types live here — not in a separate (types)/ folder
export type User = {
  id: string;
  name: string;
  email: string;
};

export type UserFilters = {
  page: number;
  perPage: number;
  search: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
};

export function useUserData(filters: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => getUsers(filters),
  });
}
```

## Mutation Hook Template

```ts
// (hooks)/use-user-actions.ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser } from '../(services)/user-service';

export function useUserActions() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const remove = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return { create, remove };
}
```

## Key Rules

- **CSR only** — Always `'use client'` + `useQuery`. No SSR data fetching.
- **No try-catch in services** — `apiClient` interceptor handles errors globally
- **Return `data` directly** — destructure `{ data }` from Axios response
- **No `(types)/` folder** — types belong inline at the top of the hook or component file
- **Typed queryKeys** — include all params that affect the response
- **Don't override staleTime** — default 1 min from `query-config.ts` is enough unless explicitly needed
- **Invalidate on mutations** — `queryClient.invalidateQueries()` in `onSuccess`
- **No manual memoization** — React Compiler handles it automatically
- **`useOptimistic`** for simple optimistic UI — use TanStack `onMutate` only for complex cache-level updates
- **`useEffectEvent`** for non-reactive Effect logic (intervals, WebSocket handlers)
- **File uploads**: pass `FormData` with `{ headers: { 'Content-Type': 'multipart/form-data' } }`

## Notes

- `queryKey` drives cache — changing URL params automatically triggers refetch when params are in the key
- Error toasts and 401 redirects are handled by `apiClient` interceptor — don't duplicate

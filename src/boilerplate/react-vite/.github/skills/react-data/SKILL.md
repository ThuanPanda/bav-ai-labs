---
name: react-data
description: Create data fetching patterns with TanStack Query v5 and axios. Use when adding API integration, creating useQuery/useMutation hooks, or cache invalidation.
triggers:
  - fetch data
  - API call
  - useQuery
  - useMutation
  - tanstack query
  - data fetching
  - cache invalidation
  - api integration
argument-hint: "<resource-name> [operations] (e.g. 'users with list, create, delete')"
---

# Data Fetching Patterns

Set up TanStack Query v5 data fetching with the project's `api` axios instance.

## API Client

`api` is exported from `@/lib/api`:

```ts
import { api } from '@/lib/api'
```

- **baseURL**: `import.meta.env.VITE_API_BASE_URL` (defaults to `/`)
- **`withCredentials: true`** — cookies attach automatically
- Response interceptor redirects to `/login` on `401`

## When to Activate

- Adding API integration to a feature
- Creating `useQuery` / `useMutation` hooks
- Configuring cache invalidation

## Workflow

1. **Define types inline** where they're used — entity/request types at the top of the hook file, prop types inside the component file. No dedicated `types/` folder is required for a small feature.

2. **Create a service function** (in the feature folder, e.g. `services/user-service.ts` or directly in the hook file for a small feature):
   - Typed functions using `api`
   - Destructure `{ data }` from the Axios response and return it directly
   - No try/catch, no side effects

3. **Create a query hook**:
   - `useQuery` wrapper with a typed `queryKey` that includes all params affecting the response

4. **Create a mutation hook**:
   - `useMutation` with `queryClient.invalidateQueries()` in `onSuccess`

## Service Template

```ts
// features/users/services/user-service.ts
import { api } from '@/lib/api'

export type User = {
  id: string
  name: string
  email: string
}

export async function getUsers() {
  const { data } = await api.get<User[]>('/users')
  return data
}

export async function getUserById(id: string) {
  const { data } = await api.get<User>(`/users/${id}`)
  return data
}

export async function createUser(dto: Omit<User, 'id'>) {
  const { data } = await api.post<User>('/users', dto)
  return data
}

export async function deleteUser(id: string) {
  await api.delete(`/users/${id}`)
}
```

## Query Hook Template

```ts
// features/users/hooks/use-users.ts
import { useQuery } from '@tanstack/react-query'
import { getUsers } from '../services/user-service'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })
}
```

## Mutation Hook Template

```ts
// features/users/hooks/use-user-actions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser, deleteUser } from '../services/user-service'

export function useUserActions() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const remove = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  return { create, remove }
}
```

## Key Rules

- **No try/catch in services** — let errors propagate; handle them where the query/mutation is consumed (e.g. `isError`, `onError`)
- **Return `data` directly** — destructure `{ data }` from the Axios response
- **Typed `queryKey`s** — include all params that affect the response
- **Invalidate on mutations** — `queryClient.invalidateQueries()` in `onSuccess`
- **URL state for filters/pagination** — prefer TanStack Router search params over `useState` for anything that should be shareable/bookmarkable
- **File uploads**: pass `FormData` with `{ headers: { 'Content-Type': 'multipart/form-data' } }`

## Notes

- `queryKey` drives the cache — changing params automatically triggers a refetch when those params are part of the key
- The 401 → `/login` redirect is handled globally by the `api` interceptor — don't duplicate that logic in individual services

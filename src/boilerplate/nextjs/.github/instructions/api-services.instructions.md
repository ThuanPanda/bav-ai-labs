---
description: "Use when creating or editing API service files in feature folders. Covers apiClient usage, typed requests/responses, endpoint conventions, and error handling strategy."
applyTo: "src/**/services/**/*.ts"
---

# API Service Guidelines

## Core Pattern

Service files are **thin wrappers** around `apiClient` from `@/lib/api-client`. They define typed API calls without business logic.

```ts
import apiClient from '@/lib/api-client';

export async function getUsers(filters: UserFilters) {
  const { data } = await apiClient.get<PaginatedResponse<User>>('/users', {
    params: filters,
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

## Omitting Empty Params

Never send empty string or null/undefined values as query params:

```ts
function cleanParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  ) as Partial<T>;
}
```

## Rules

1. **Always import `apiClient`** from `@/lib/api-client` — it has interceptors for auth, error toasts, locale headers.
2. **Type everything** — Use generics on `apiClient.get<T>()`, `apiClient.post<T>()`, etc. Define types in the hook file that consumes them.
3. **No try-catch** — The `apiClient` response interceptor handles error toasts and 401 redirects. Service functions should let errors propagate.
4. **Return `data` directly** — Destructure `{ data }` from the Axios response and return it. Hooks and components should never deal with the Axios response wrapper.
5. **One service file per resource** — `user-service.ts`, `project-service.ts`, etc. If a service exceeds 200 lines, split by operation group.
6. **Params as objects** — Use typed objects for query params, not positional arguments.
7. **No side effects** — Services are pure data access. Toasts, redirects, cache invalidation belong in hooks.

## Naming Convention

All service files use **kebab-case** with `-service` suffix:

```
(services)/
├── user-service.ts
├── project-service.ts
└── analytics-service.ts
```

Function names: `get*`, `create*`, `update*`, `delete*`, `upload*`, `download*`.

## File Upload

For multipart uploads, override the Content-Type:

```ts
export async function uploadAvatar(userId: string, file: File) {
  const formData = new FormData();
  formData.append('avatar', file);

  const { data } = await apiClient.post<{ url: string }>(
    `/users/${userId}/avatar`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}
```

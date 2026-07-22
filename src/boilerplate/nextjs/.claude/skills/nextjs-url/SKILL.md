---
name: nextjs-url
description: Create URL state management and deep linking. Use when handling pagination, filters, search, sort, URL params, query strings, deep links, or any UI state that should survive page refresh.
triggers:
  - pagination
  - deep link
  - URL params
  - search params
  - URL state
  - filter state
  - sort state
  - per page
  - page navigation
  - searchbar URL sync
  - query string
  - table pagination
argument-hint: "<feature-name> [params] (e.g. 'users table with page, perPage, search, sort')"
---

# URL State & Deep Linking

Manage UI state (pagination, filters, search, sort) via URL search params using **nuqs**. Enables deep linking, shareable URLs, browser back/forward, and automatic TanStack Query refetch.

## When to Activate

- Pagination (page, perPage)
- Sorting (column + direction)
- Search / text filters
- Dropdown / select filters
- Any UI state that should survive refresh or be shareable via URL

## Setup

`nuqs` must be installed and the `NuqsAdapter` wired into the root layout.

```ts
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
```

## Hook Template

```ts
// (hooks)/use-user-filters.ts
'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

const userFiltersParsers = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  search: parseAsString.withDefault(''),
  sort: parseAsString.withDefault(''),
};

export function useUserFilters() {
  const [filters, setFilters] = useQueryStates(userFiltersParsers, {
    shallow: false, // triggers Next.js navigation → TanStack Query refetch
  });

  function updateFilters(updates: Partial<typeof filters>) {
    // Reset to page 1 when anything other than page changes
    const patch = { ...updates } as Partial<typeof filters>;
    if (!('page' in updates)) patch.page = 1;
    setFilters(patch);
  }

  return { filters, setFilters: updateFilters };
}
```

## Available Parsers

| Parser | Type | Usage |
|--------|------|-------|
| `parseAsInteger` | `number` | page, perPage |
| `parseAsString` | `string` | search, sort |
| `parseAsBoolean` | `boolean` | toggles |
| `parseAsStringEnum(values)` | `string` union | status, tab |
| `parseAsArrayOf(parseAsString)` | `string[]` | multi-select filters |

## Connecting to TanStack Query

```ts
// (hooks)/use-user-data.ts
export function useUserData() {
  const { filters } = useUserFilters();

  return useQuery({
    queryKey: ['users', filters],   // ← URL change = cache miss = refetch
    queryFn: () => getUsers(filters),
  });
}
```

## Key Rules

- **NEVER use React state** for pagination, filters, sort, or search — always URL params via nuqs
- **Always use `useQueryStates`** for multiple related params — never manage them individually
- **`shallow: false`** — required to trigger Next.js navigation and TanStack Query refetch
- **Reset page to 1** when any filter/search/sort changes (not when page itself changes)
- **Type-safe by default** — nuqs parsers handle parsing and serialization; no manual `Number()` casting
- **Never build URLSearchParams manually** in components or feature hooks

## Composition with Page Hook

```ts
// (hooks)/use-user-page.ts — compose filters + data + actions
export function useUserPage() {
  const { filters, setFilters } = useUserFilters();
  const { data, isPending } = useUserData(filters);
  const { remove } = useUserActions();

  return { filters, setFilters, data, isPending, remove };
}
```

## Notes

- Search inputs should debounce before calling `setFilters` (300–500ms) to avoid excessive URL updates
- Multi-select filters: use `parseAsArrayOf(parseAsString)` — nuqs handles comma-encoding automatically
- Sort: encode as `fieldName:asc` or `fieldName:desc`, parse with `.split(':')`
- Avoid persisting params that equal their default — `nuqs` omits defaults from the URL automatically
## Agent Skill Synchronization

Follow [SKILL-SYNC.md](../../../SKILL-SYNC.md) whenever creating or changing this skill. Keep the same folder name and identical `SKILL.md` content in `.github/skills/`, `.claude/skills/`, `.codex/skills/`, and `.omc/skills/` so Copilot, Claude Code, Codex, and OpenCode stay synchronized.

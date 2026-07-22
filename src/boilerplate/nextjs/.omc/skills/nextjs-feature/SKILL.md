---
name: nextjs-feature
description: Scaffold a complete feature with full ecosystem. Use when creating a new page, new feature, new module, new route, or a nested sub-feature.
triggers:
  - new feature
  - scaffold feature
  - create feature
  - new page
  - new module
  - add feature
  - new route
  - sub-feature
  - nested feature
argument-hint: "<feature-name> [route-group] (e.g. 'user-management under protected')"
---

# Feature Scaffolding

Scaffold a complete feature folder following the project's feature-based architecture.

## When to Activate

- User says "create a new feature", "scaffold X", "add a new page for Y"
- Creating a sub-feature inside an existing feature
- Setting up a new route with data fetching, filtering, or forms

## Workflow

1. **Clarify** (if not provided):
   - Feature name in kebab-case (e.g., `user-management`)
   - Route group: `(auth)`, `(protected)`, or other
   - Parent feature path if this is a sub-feature
   - Does it need data fetching? Forms? Filtering/pagination?

2. **Create folder structure** under `src/features/<feature-name>/`:
   ```
   src/features/feature-name/
   ├── (helpers)/feature-name-schema.ts     # Only if has forms
   ├── (services)/feature-name-service.ts
   ├── (hooks)/use-feature-name-data.ts     # Types defined here
   ├── (hooks)/use-feature-name-actions.ts
   ├── (hooks)/use-feature-name-filters.ts  # Only if has filters/pagination
   ├── (components)/feature-name-main.tsx
   ├── (components)/feature-name-sub.tsx    # 1 component per file
   └── (components)/feature-name-main-skeleton.tsx
   ```

   **Sub-features** are nested regular folders:
   ```
   src/features/feature-name/
   └── sub-feature-name/
       ├── (hooks)/use-sub-feature-data.ts
       ├── (components)/sub-feature-main.tsx
       └── (components)/sub-feature-main-skeleton.tsx
   ```

3. **Create page route** files (thin wrappers):
   ```
   src/app/[locale]/(route-group)/feature-name/page.tsx
   src/app/[locale]/(route-group)/feature-name/loading.tsx   ← always required
   ```

4. **Add i18n keys** under a matching namespace in both:
   - `src/messages/en.json`
   - `src/messages/de.json`

5. **Verify** before finishing:
   - All imports use `@/*` aliases
   - `Link`/`useRouter`/`usePathname` from `@/i18n/navigation`
   - No `forwardRef`, `useMemo`, `useCallback`, `memo`
   - `'use client'` on all components that use hooks
   - `params`/`searchParams` are async in page components
   - Skeleton exists for every data-fetching component
   - `loading.tsx` exists alongside every `page.tsx`
   - All static text uses `useTranslations()`
   - All constants extracted to `src/shared/constants/`

## Key Templates

### page.tsx
```tsx
import { FeatureMain } from '@/features/feature-name/(components)/feature-name-main';

export default function FeatureNamePage() {
  return <FeatureMain />;
}
```

### loading.tsx
```tsx
import { FeatureNameMainSkeleton } from '@/features/feature-name/(components)/feature-name-main-skeleton';

export default function FeatureNameLoading() {
  return <FeatureNameMainSkeleton />;
}
```

### (components)/feature-name-main.tsx
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useFeatureNameData } from '../(hooks)/use-feature-name-data';
import { FeatureNameMainSkeleton } from './feature-name-main-skeleton';

export function FeatureNameMain() {
  const t = useTranslations('featureName');
  const { data, isPending } = useFeatureNameData();

  if (isPending) return <FeatureNameMainSkeleton />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
    </div>
  );
}
```

### (components)/feature-name-main-skeleton.tsx
```tsx
import { Skeleton } from '@/shared/components/ui/skeleton';

export function FeatureNameMainSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
```

## Key Conventions

- **Kebab-case for all files and folders** — never camelCase, PascalCase, or snake_case
- **Zod schemas in `(helpers)/`** — never inline in components or hooks
- **No magic numbers** — extract to `src/shared/constants/`
- `page.tsx` is a **thin wrapper** — imports & renders the main component from `@/features/`
- Every component that fetches data has a matching `*-skeleton.tsx`
- Max 200 lines per file — split if exceeded
- Feature-scoped components stay in the feature folder
- Sub-features are regular folders (no parentheses) with their own group-folder ecosystem
- `loading.tsx` is **always required** alongside every `page.tsx`
- **No `(types)/` folder** — types go inline where used
- **1 component per file** — never define multiple exported components in one file
## Agent Skill Synchronization

Follow [SKILL-SYNC.md](../../../SKILL-SYNC.md) whenever creating or changing this skill. Keep the same folder name and identical `SKILL.md` content in `.github/skills/`, `.claude/skills/`, `.codex/skills/`, and `.omc/skills/` so Copilot, Claude Code, Codex, and OpenCode stay synchronized.

---
name: nextjs-tab
description: Add URL-synced tab navigation to a page. Use when a page needs multiple content panels accessible via tabs, with the active tab persisted in the URL for deep linking and browser back/forward support.
triggers:
  - tab
  - tabs
  - tab navigation
  - tab panel
  - tabbed view
  - detail page tabs
  - URL tab
argument-hint: "<feature-name> [tab names] (e.g. 'user-detail with overview, history, settings')"
---

# Tab Navigation

Tab navigation backed by URL search params. The active tab is stored in the URL (`?tab=overview`), enabling deep linking, shareable URLs, and browser back/forward navigation.

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Tabs` | `@/shared/components/ui/tabs` | shadcn base — layout + state |
| `TabsList` | `@/shared/components/ui/tabs` | Tab button bar |
| `TabsTrigger` | `@/shared/components/ui/tabs` | Individual tab button |
| `TabsContent` | `@/shared/components/ui/tabs` | Content panel for each tab |
| `TabsUrl` | `@/shared/components/ui/tabs-url` | URL-synced wrapper replacing `Tabs` |

## When to Use `TabsUrl` vs `Tabs`

- **`TabsUrl`** — always use for page-level tabs that should be deep-linkable
- **`Tabs`** — use only for purely local UI (dialogs, inline pickers) that should NOT affect the URL

## Usage Pattern

```tsx
'use client';

import { TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { TabsUrl } from '@/shared/components/ui/tabs-url';

const DEFAULT_TAB = 'overview';

export function UserDetailMain() {
  return (
    <TabsUrl defaultValue={DEFAULT_TAB}>
      <TabsList variant="line">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        {/* Overview content */}
      </TabsContent>

      <TabsContent value="history">
        {/* History content */}
      </TabsContent>

      <TabsContent value="settings">
        {/* Settings content */}
      </TabsContent>
    </TabsUrl>
  );
}
```

## TabsUrl Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultValue` | `string` | required | Active tab when param is absent from URL |
| `paramName` | `string` | `"tab"` | URL search param name |

## TabsList Variants

| Variant | Appearance | When to use |
|---------|-----------|-------------|
| `default` | Filled pill background | Compact UI, cards, dialogs |
| `line` | Underline indicator only | Page-level navigation |

```tsx
// Page-level tabs (line style)
<TabsList variant="line">

// Compact tabs (filled pills)
<TabsList variant="default">
```

## i18n

Always translate tab labels via `useTranslations`:

```tsx
const t = useTranslations('users');
<TabsTrigger value="overview">{t('detail.tabOverview')}</TabsTrigger>
```

Add keys to both `en.json` and `de.json` under `<feature>.detail.tab<Name>`.

## URL Behaviour

- Default tab → param is **removed** from URL (clean URLs: `/users/1` not `/users/1?tab=overview`)
- Non-default tab → param is **set**: `/users/1?tab=history`
- Uses `router.replace()` — avoids polluting browser history on tab switch
- Preserves all other existing search params (pagination, filters, etc.)

## Rules

- ✅ Use `TabsUrl` for all page-level tabs
- ✅ Use `variant="line"` for page nav tabs
- ✅ Translate all tab labels
- ✅ `defaultValue` must match a `TabsTrigger value`
- ❌ Never use `useState` to track active tab in page-level tabs
- ❌ Never add `value` or `onValueChange` to `TabsUrl` — it manages them internally

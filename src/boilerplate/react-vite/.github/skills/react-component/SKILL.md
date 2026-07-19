---
name: react-component
description: Create React components following feature-based conventions. Use when creating a component, shared component, splitting an oversized component, or ensuring responsive/dark-mode support.
triggers:
  - create component
  - new component
  - shared component
  - split component
  - responsive component
  - dark mode component
  - feature component
argument-hint: "<component-name> [purpose] (e.g. 'data table for user list with pagination')"
---

# Component Patterns

Create React components following the project's conventions: feature-scoped, responsive, dark-mode safe, i18n translated.

## When to Activate

- Creating a new UI component inside a feature
- Making a component reusable across features
- Deciding feature-scoped vs. shared placement

## Workflow

1. **Create the component** in `src/features/<feature>/components/component-name.tsx`
2. **Apply responsive layout** — mobile-first: base → `sm:` → `md:` → `lg:`
3. **Use only semantic color tokens** — never hardcoded colors (see `react-colors` skill)
4. **Translate all static text** — `useTranslation()` from `react-i18next` (see `react-i18n` skill)
5. **Evaluate reusability** — feature-scoped by default; move to `src/components/` only if used in 3+ features

## Key Rules

- **Kebab-case file names**: `event-card.tsx`, `user-list.tsx` — never camelCase or PascalCase
- **1 component per file** — each exported component lives in its own file
- **No business logic buried in JSX** — extract to a small helper function or a hook if it grows past a few lines
- **Prop types**: `type Props = { ... }` at the top of the component file
- **Buttons**: always `Button` from `@/components/ui/button` (see `react-button` skill)

## Semantic Color Tokens (dark mode)

| Use | Token |
|-----|-------|
| Page background | `bg-background` |
| Primary text | `text-foreground` |
| Secondary/muted text | `text-muted-foreground` |
| Card background | `bg-card` |
| Muted background | `bg-muted` |
| Borders | `border-border` |
| Destructive/error | `bg-destructive` |

Never use hardcoded values like `bg-white`, `text-black`, `text-gray-500`.

## Example

```tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type Props = {
  title: string
  onConfirm: () => void
}

export function ConfirmCard({ title, onConfirm }: Props) {
  const { t } = useTranslation('common')

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <Button onClick={onConfirm}>{t('actions.confirm')}</Button>
    </div>
  )
}
```

## Design Pixel Tolerance

When implementing from designs, **do not chase exact pixels**:

- Match the visual intent and proportions, not every exact pixel
- Use the **nearest available Tailwind spacing/size class** rather than arbitrary values like `h-[37px]`
- Prefer semantic tokens over hardcoded colors even when the design hex doesn't perfectly match
- Minor padding/margin differences (±4px) are acceptable

## Notes

- Responsive grid example: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Add i18n keys to both `src/i18n/locales/en/<namespace>.json` and `src/i18n/locales/de/<namespace>.json`

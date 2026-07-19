---
name: react-i18n
description: Enforce i18n translation for all static text in components and pages. Every string visible to the user must use useTranslation()/t() from react-i18next, with keys added to both en and de locale files. Never hardcode text.
triggers:
  - translate
  - add translation
  - i18n
  - static text
  - hardcoded text
  - add text
  - label
  - placeholder
  - page title
  - button text
  - error message
  - useTranslation
  - react-i18next
  - missing translation
argument-hint: "<feature-or-component-name> (e.g. 'settings page', 'login form')"
---

# i18n Rules

All static text visible to users must go through `t()` from `react-i18next`. Never hardcode strings in components or hooks. Always add keys to **both** the `en` and `de` locale files.

## When to Activate

- Writing any text that appears in the UI (labels, titles, descriptions, placeholders, button text, empty states, error messages)
- Creating or editing any component or page
- Reviewing a component for hardcoded strings

## Locales & Files

| Locale | Directory |
|---|---|
| English | `src/i18n/locales/en/<namespace>.json` |
| German | `src/i18n/locales/de/<namespace>.json` |

## Workflow

1. **Identify all static strings** in the component/page

2. **Choose the namespace** — the feature folder name (camelCase for multi-word):
   - `src/features/user-profile/` → namespace `userProfile`
   - Shared/reused text (app name, Save/Cancel, etc.) → `common`

3. **Add keys to `src/i18n/locales/en/<namespace>.json`**:
   ```json
   {
     "title": "User Profile",
     "description": "Manage your account details",
     "saveButton": "Save changes"
   }
   ```

4. **Add the same keys to `src/i18n/locales/de/<namespace>.json`** with German translations:
   ```json
   {
     "title": "Benutzerprofil",
     "description": "Verwalte deine Kontodaten",
     "saveButton": "Änderungen speichern"
   }
   ```

5. **If this is a brand-new namespace**, register it in `src/i18n/index.ts`:
   - Import the new `en`/`de` JSON files
   - Add the namespace name to the `namespaces` array
   - Add it to both `resources.en` and `resources.de`

   And declare its type in `src/i18n/react-i18next.d.ts` (import the `en` JSON type, add it to `CustomTypeOptions.resources`).

6. **Use `useTranslation()` in the component:**
   ```tsx
   import { useTranslation } from 'react-i18next'

   export function UserProfilePage() {
     const { t } = useTranslation('userProfile')

     return (
       <div>
         <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
         <p className="text-muted-foreground">{t('description')}</p>
         <Button>{t('saveButton')}</Button>
       </div>
     )
   }
   ```

7. **When you also need `common` strings**, pass both namespaces and prefix explicitly:
   ```tsx
   const { t } = useTranslation(['userProfile', 'common'])
   t('common:actions.cancel')
   ```

## Key Rules

- **No hardcoded strings** — every visible string goes through `t()`
- **Always update both `en` and `de`** — a missing key falls back to the raw key string (or English, per `fallbackLng`)
- **Namespace = feature folder name** — consistent with how `useTranslation()` is called
- **Nested keys for grouping** — use dot-notation: `table.name`, `validation.required`, `status.active`
- **`common` for shared text** — buttons like "Save", "Cancel", "Delete" used across 3+ features go in `common`
- **Never translate dynamic data** — only translate static UI text; data from an API is already in the right language

## Anti-Patterns

```tsx
// ✗ Hardcoded English string
<h1>User Profile</h1>

// ✗ Template literal with hardcoded text
<p>{`Hello ${name}`}</p>   // → use t('greeting', { name })

// ✗ Only added to en/*.json, forgot de/*.json

// ✗ Using a raw key that doesn't exist in either locale file
t('userProfile.doesNotExist')
```

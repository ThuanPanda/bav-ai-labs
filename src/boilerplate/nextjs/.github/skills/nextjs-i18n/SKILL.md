---
name: nextjs-i18n
description: Enforce i18n translation for all static text in components and pages. Every string visible to the user must use useTranslations() from next-intl, with keys added to both en.json and de.json. Never hardcode text.
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
  - useTranslations
  - next-intl
  - missing translation
argument-hint: "<feature-or-component-name> (e.g. 'user-detail page', 'create-user form')"
---

# i18n Rules

All static text visible to users must go through `useTranslations()` from `next-intl`. Never hardcode strings in components or hooks. Always add keys to **both** `src/messages/en.json` and `src/messages/de.json`.

## When to Activate

- Writing any text that appears in the UI (labels, titles, descriptions, placeholders, button text, empty states, error messages)
- Creating or editing any component or page
- Adding form validation messages
- Reviewing a component for hardcoded strings

## Locales & Files

| Locale | File |
|---|---|
| English | `src/messages/en.json` |
| German | `src/messages/de.json` |

## Workflow

1. **Identify all static strings** in the component/page

2. **Choose the namespace** — use the feature name in camelCase matching the folder name:
   - `src/features/user-management/` → namespace `userManagement`
   - Shared/reused text → `common`

3. **Add keys to `src/messages/en.json`** under the namespace:
   ```json
   "userManagement": {
     "title": "User Management",
     "description": "Manage team members and permissions",
     "table": {
       "name": "Name",
       "email": "Email",
       "role": "Role",
       "actions": "Actions"
     },
     "empty": "No users found",
     "createButton": "Add User"
   }
   ```

4. **Add the same keys to `src/messages/de.json`** with German translations:
   ```json
   "userManagement": {
     "title": "Benutzerverwaltung",
     "description": "Teammitglieder und Berechtigungen verwalten",
     "table": {
       "name": "Name",
       "email": "E-Mail",
       "role": "Rolle",
       "actions": "Aktionen"
     },
     "empty": "Keine Benutzer gefunden",
     "createButton": "Benutzer hinzufügen"
   }
   ```

5. **Use `useTranslations()` in the component:**
   ```tsx
   'use client';
   import { useTranslations } from 'next-intl';

   export function UserManagementMain() {
     const t = useTranslations('userManagement');

     return (
       <div>
         <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
         <p className="text-muted-foreground">{t('description')}</p>
         <Button>{t('createButton')}</Button>
       </div>
     );
   }
   ```

6. **For form validation errors** (zod schemas in `(helpers)/`):
   ```ts
   export const createUserSchema = z.object({
     name: z.string().min(1, 'userManagement.validation.nameRequired'),
     email: z.string().email('userManagement.validation.emailInvalid'),
   });
   ```

## Key Rules

- **No hardcoded strings** — every visible string goes through `t()`
- **Always update both files** — missing key in `de.json` will show the raw key string in German locale
- **Namespace = feature name in camelCase** — consistent with how `useTranslations()` is called
- **Nested keys for grouping** — use dot-notation: `table.name`, `validation.required`, `status.active`
- **`common` for shared text** — buttons like "Save", "Cancel", "Delete" used across 3+ features go in `common`
- **Always use `useTranslations()`** (sync) — this project is CSR-only
- **Never translate dynamic data** — only translate static UI text; data from the API is already in the user's language

## Key Naming Convention

```
featureName.title              → Page/section heading
featureName.description        → Subtitle or helper text
featureName.createButton       → Primary action button
featureName.empty              → Empty state message
featureName.table.columnName   → Table column headers
featureName.status.active      → Enum/status labels
featureName.validation.field   → Form validation errors
featureName.confirm.delete     → Confirmation dialog text
```

## Anti-Patterns

```tsx
// ✗ Hardcoded English string
<h1>User Management</h1>

// ✗ Template literal with hardcoded text
<p>{`Hello ${name}`}</p>   // → use t('greeting', { name })

// ✗ Only added to en.json, forgot de.json

// ✗ Inline validation message
z.string().min(1, 'Name is required')  // → use translation key instead
```

---
name: nextjs-form
description: Create form patterns with react-hook-form + zod + FormProvider. Use when creating a form, multi-step wizard, FormProvider wrapper, useFormContext, zod schema, or complex form with child components.
triggers:
  - create form
  - form validation
  - zod schema
  - react-hook-form
  - multi-step form
  - wizard form
  - FormProvider
  - useFormContext
  - form with steps
  - dynamic fields
  - field array
argument-hint: "<form-type> [fields] (e.g. 'multi-step user registration with personal info and address')"
---

# Form Patterns

Set up forms using react-hook-form v7 + zod v4 + @hookform/resolvers, following the project's logic-in-hooks convention and FormProvider for complex forms.

## When to Activate

- Creating any form (simple or multi-step)
- Setting up zod validation schemas
- Forms where child components need form state via `useFormContext()`
- Dynamic field arrays or conditional validation

## Workflow

### Simple Form (single component)

1. **Define zod schema** in `(helpers)/create-resource-schema.ts`
2. **Create form hook** — `useForm` + `zodResolver`, mutation for submit, returns `form` methods and `onSubmit`
3. **Create component** — renders fields, calls `form.handleSubmit(onSubmit)`

### Complex / Multi-Step Form (FormProvider required)

1. **Define zod schema** in `(helpers)/` — use `.merge()` for multi-step schemas
2. **Create form hook** — `useForm` + `zodResolver`, returns `methods` object
3. **Create FormProvider wrapper** — wraps all step children with `<FormProvider {...methods}>`
4. **Create step components** — each step uses `useFormContext()` to access form state
5. **Create mutation hook** — `useMutation` for final submit with `queryClient.invalidateQueries()`

## Key Rules

- **Logic in hooks** — `useForm`, `zodResolver`, submit handler all live in hooks, not components
- **Components only render** — form components render fields and call hook-provided handlers
- **FormProvider for 2+ components sharing state** — wrap parent component with `<FormProvider>`
- **Zod schemas in `(helpers)/`** — never inline in components or hooks
- **Translate error messages** — use `useTranslations` for zod message keys
- **No magic numbers** — extract validation limits (min/max lengths, step counts) to `@/shared/constants/`
- **Max 200 lines** — split large forms into step components

## Simple Form Template

```ts
// (helpers)/create-user-schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  email: z.string().email('validation.emailInvalid'),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
```

```ts
// (hooks)/use-create-user-form.ts
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateUser } from './use-user-actions';
import { createUserSchema, type CreateUserDto } from '../(helpers)/create-user-schema';

export function useCreateUserForm() {
  const { mutate, isPending } = useCreateUser();

  const form = useForm<CreateUserDto>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = form.handleSubmit((data) => mutate(data));

  return { form, onSubmit, isPending };
}
```

## Multi-Step FormProvider Template

```tsx
// (components)/register-form.tsx — FormProvider wrapper
'use client';

import { FormProvider } from 'react-hook-form';
import { useRegisterForm } from '../(hooks)/use-register-form';
import { PersonalInfoStep } from './personal-info-step';
import { AddressStep } from './address-step';

export function RegisterForm() {
  const { methods, currentStep, onSubmit, isPending } = useRegisterForm();

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit}>
        {currentStep === 0 && <PersonalInfoStep />}
        {currentStep === 1 && <AddressStep />}
      </form>
    </FormProvider>
  );
}
```

```tsx
// (components)/personal-info-step.tsx — child step using useFormContext
'use client';

import { useFormContext } from 'react-hook-form';
import type { RegisterDto } from '../(helpers)/register-schema';

export function PersonalInfoStep() {
  const { register, formState: { errors } } = useFormContext<RegisterDto>();

  return (
    <div className="space-y-4">
      <input {...register('name')} className="..." />
      {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
    </div>
  );
}
```

## Notes

- `zodResolver` from `@hookform/resolvers/zod` — always use this, never manual validation
- `useTranslations` keys for error messages keep forms i18n-compatible
- For dynamic field arrays use `useFieldArray` from react-hook-form — still logic-in-hooks
- Conditional fields: use `watch()` in the hook and pass watched values to the component as props

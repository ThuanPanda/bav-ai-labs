---
name: react-button
description: Use Button component correctly. Always use existing variants and sizes from button.tsx. Never override button appearance with raw CSS. When a design size doesn't match exactly, use the nearest available size.
triggers:
  - button
  - add button
  - create button
  - button style
  - button variant
  - button size
  - primary button
  - submit button
  - action button
  - cta button
argument-hint: "<purpose> (e.g. 'primary submit action', 'destructive delete', 'ghost nav link')"
---

# Button Usage

Always use the `Button` component from `@/components/ui/button` with explicit `variant` and `size` props. Never override button appearance with raw Tailwind classes — extend the component's CVA definition instead.

## When to Activate

- Adding any clickable action to a page or component
- Choosing which button style matches a design
- A design shows a button size/color not covered by existing variants

## Available Variants

| Variant | Appearance | Use when |
|---|---|---|
| `default` | Primary bg (`bg-primary`) + foreground text | Standard primary action |
| `outline` | Transparent bg + border, hover muted fill | Secondary action alongside a primary |
| `secondary` | Muted bg + secondary text | Low-emphasis action |
| `ghost` | No bg, hover muted fill | Inline actions, nav items, icon buttons |
| `destructive` | Tinted destructive bg + destructive text | Delete, remove, danger actions |
| `link` | Underline on hover, primary text color | In-text links, "Forgot password" style |

## Available Sizes

| Size | Height | Use when |
|---|---|---|
| `xs` | 24px (h-6) | Dense UIs, badges, tags |
| `sm` | 28px (h-7) | Table row actions, compact toolbars |
| `default` | 32px (h-8) | Standard UI controls |
| `lg` | 36px (h-9) | Slightly prominent actions |
| `icon` | 32×32px | Square icon-only button |
| `icon-xs` | 24×24px | Compact icon-only button |
| `icon-sm` | 28×28px | Small icon-only button |
| `icon-lg` | 36×36px | Larger icon-only button |

## Nearest Size Rule

When a design specifies a height not in the table above, use the **nearest available size**. Do NOT add `className="h-[X]px"` to override.

```
Design height → Use size
< 24px        → xs
24–26px       → xs
27–30px       → sm
31–34px       → default
35–38px       → lg
```

## Usage Examples

```tsx
// Standard action
<Button variant="default">Save changes</Button>

// Secondary alongside primary
<Button variant="outline">Cancel</Button>

// Destructive
<Button variant="destructive">Delete account</Button>

// Ghost for inline/nav
<Button variant="ghost" size="sm">View details</Button>

// Icon only
<Button variant="ghost" size="icon">
  <Trash2 />
</Button>
```

## Loading State

Every submit or delete button that triggers a mutation **must** show loading state:

```tsx
<Button type="submit" variant="default" size="lg" disabled={isPending}>
  {isPending && <Loader2 className="animate-spin" />}
  Save
</Button>
```

## Key Rules

- **Never use raw CSS** to change button height, background, text color, or padding — use `variant` and `size`
- **`className` only for layout** — `w-full`, `mt-4`, `self-start` are fine; color/size overrides are not
- **Adding a new style?** Add a new `variant` or `size` to `src/components/ui/button.tsx` CVA, not inline
- **Loading state**: always pass `disabled={isPending}` and render a spinner for async actions
- **Never a raw `<button>`** — always import `Button` from `@/components/ui/button`

## Anti-Patterns

```tsx
// ✗ Raw button element
<button className="rounded bg-primary px-4 py-2">Submit</button>

// ✗ Hardcoded height
<Button className="h-11 bg-purple-600 text-white">Submit</Button>

// ✗ Color override via className
<Button className="bg-brand text-white hover:bg-brand/90">Submit</Button>

// ✗ Wrong size for a CTA that should be lg
<Button size="default" className="h-11">Submit</Button>

// ✓ Correct
<Button variant="default" size="lg">Submit</Button>
```

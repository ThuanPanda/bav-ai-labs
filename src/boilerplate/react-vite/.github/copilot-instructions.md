# React (Vite) Boilerplate — Copilot Instructions

Follow `CLAUDE.md` for the complete project conventions. Use the matching task-specific guide in `.github/skills/`.

Key rules:

- Keep TanStack Router route files thin; implement UI and business logic in `src/features/`.
- Use `t()` for every static user-facing string and update both `en` and `de` locales.
- Use `Button` from `@/components/ui/button`; never use a raw `<button>`.
- Use semantic Tailwind color tokens only; do not hardcode colors.
- Keep skill copies synchronized according to [../SKILL-SYNC.md](../SKILL-SYNC.md).

# MEP NestJS Boilerplate

A minimal NestJS **CQRS + Repository** microservice following the MEP engineering playbook
(same conventions as `mep-etr`). pnpm monorepo · Drizzle ORM · `@prowerbdigital/common`.

## Architecture

```
apps/api/src/
├── main.ts                     # bootstrap: versioning, global pipes/interceptors/filter, swagger
├── app.module.ts               # config, logger, drizzle, cqrs, feature modules
├── common/config/              # app config + Joi schema
└── modules/
    └── users/                  # reference CQRS module (create / update / delete / get / list)
        ├── controllers/        # HTTP entry — dispatch only, @Serialize + @ApiSuccessResponse
        ├── commands/           # <verb>-<noun>/{*.command.ts (message), *.handler.ts (@CommandHandler)}
        ├── queries/            # <verb>-<noun>/{*.query.ts (message), *.handler.ts (@QueryHandler)}
        ├── dtos/               # class-validator input DTOs
        ├── responses/          # class-transformer response DTOs (@Exclude/@Expose)
        └── constants/          # <MODULE>_ERRORS error-key constants

libs/
├── common/       # @app/common     — shared utils / validators / config
├── database/     # @app/database   — Drizzle schemas + inferred types
└── layer-data/   # @app/layer-data — ALL repositories (per-domain data modules) + shared tx service
```

Repositories live in `libs/layer-data`, never inside a feature module. A feature module imports the
per-domain `*DataModule` and injects the repository token (`@Inject(USER_REPOSITORY)`).

## Prerequisites

- Node.js 20+, pnpm, PostgreSQL
- A GitHub token with `read:packages` for the `@prowerbdigital` scope (same as the `bv` CLI).
  Export it before installing:

  ```bash
  export NODE_AUTH_TOKEN=ghp_xxx   # read:packages on @prowerbdigital
  ```

  The bundled `.npmrc` maps `@prowerbdigital` → GitHub Packages and reads `${NODE_AUTH_TOKEN}`.

## Getting started

```bash
pnpm install

# env — two layers: apps/api/.env holds NODE_ENV; venv/.env.<NODE_ENV> holds the rest.
cp apps/api/.env.example apps/api/.env                 # NODE_ENV=dev
cp apps/api/venv/.env.example apps/api/venv/.env.dev   # DATABASE_URL, PORT, …

# generate + run migrations
pnpm db:generate
pnpm db:migrate

# run
pnpm start:dev            # http://localhost:8080/api/v1/users
                          # swagger: http://localhost:8080/api/docs
```

## Conventions

Follow the **mep-engineering-playbook** skill (`bv add skill mep-engineering-playbook`):

- Entry points dispatch to `CommandBus` / `QueryBus` only — no business logic.
- A handler owns its own logic; extract to a Service only when logic is shared across handlers.
- Commands return `null` or a scalar id — never full objects.
- Errors: throw a NestJS HTTP exception carrying a `<MODULE>_ERRORS.KEY` constant, never a raw string.
- Responses: return plain objects; `@Serialize(Dto)` + a global `ResponseInterceptor` build the envelope.

## Adding a module

Mirror `modules/users` and add a matching domain under `libs/layer-data/src/<domain>`.
See the playbook's `SCAFFOLDING.md` for the step-by-step.

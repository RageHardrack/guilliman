# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.2] - 2026-11-13

### Added

- **docs**: startup log line stating whether Swagger is enabled, so a rejected `SWAGGER_ENABLED` value is visible in the container logs.
- **tests**: route-level tests boot a minimal Fastify app and assert that `/api/v1/docs` and `/api/v1/docs-json` answer `404` unless `SWAGGER_ENABLED=true`, so removing the guard now fails the suite.

## [0.5.1] - 2026-11-12

### Security

- **docs**: Swagger UI (`/api/v1/docs`) and the OpenAPI JSON (`/api/v1/docs-json`) are served only when `SWAGGER_ENABLED=true`, so production no longer exposes the endpoint map. Local `start` scripts enable it.

### Changed

- **loans, accounts**: `userId` in the create-loan and create-account bodies is documented as optional and deprecated. The owner always comes from the token; the field was already ignored and is still accepted for compatibility.

## [0.5.0] - 2026-11-06

### Added

- **leon**: 11th edition catalog API, one stored package per faction with an index, a per-faction read, and an admin-only import that never deletes missing factions.

### Changed

- **discord**: release announcements are published in Spanish, using the `## Resumen (ES)` section of the release notes when present.
- **webhooks**: Watchtower notifications skip empty deployment sessions and detect failures precisely, so quiet deployments no longer post noise to Discord.
- **ci**: releases are published from the CHANGELOG when a release PR from `dev` merges into `main`.
- **docs**: README and CHANGELOG are now in English.

## [0.4.2] - 2026-11-06

### Fixed

- **goals**: A savings goal's target date is now cleared when the update sends it as null.

## [0.4.1] - 2026-11-06

### Fixed

- **accounts**: Every route resolves the owner from the JWT, so one user can no longer read or write another user's accounts.
- **transactions**: Every route is scoped to the token user.
- **budgets**: Every route is scoped to the token user.
- **categories**: Every route is scoped to the token user.
- **subscriptions**: Every route is scoped to the token user.
- **goals**: Both the goal and any referenced account are ownership-checked on every route.
- **loans**: Every route is scoped to the token user, and a payment that is missing or belongs to another user now answers the same 404.
- **tax**: Requests naming a `userId` other than the token user's are rejected.

## [0.4.0] - 2026-11-06

### Added

- **leon**: Isolated wargaming bounded context with its own JWT auth (`app: 'LEON'`), admin user management, and per-user army rosters.
- **transaction-templates**: Per-user expense, income, and transfer templates for fast entry in Tique, ordered by most recently used.

### Fixed

- **leon**: Decorator metadata now uses type-only imports so the build stays clean.

## [0.3.1] - 2026-09-26

### Changed

- **docs**: README carries the Built with Gentle-AI badge.

## [0.3.0] - 2026-09-24

### Added

- **webhooks**: Releases can be published to a dedicated Discord changelog channel (`DISCORD_CHANGELOG_CHANNEL_ID`), falling back to the notifications channel when it is not configured.

## [0.2.0] - 2026-09-17

### Added

- **subscriptions**: Payments can be recorded in a different currency than the subscription, with a custom exchange rate and the actual debited amount.

## [0.1.0] - 2026-09-17

### Added

- **server**: Guilliman backend service initialized with NestJS, Fastify, Prisma and a CI/CD pipeline publishing a GHCR image.
- **mcp**: Tique MCP server exposing financial and tax tools over stdio and SSE, restricted to active ADMIN users.
- **exchange-rates**: Official SUNAT (USD→PEN) and BCV (USD→VES) rate sync on a daily 8pm Caracas cron.
- **transactions**: Multi-currency transfers with exact balance recalculation, and a script to backfill historical VES rates on past transactions.
- **categories**: `budgetGroup` classification for income and expense categories.
- **goals**: Priority level on savings goals.
- **accounts**: Account currency is immutable after creation.
- **blog**: Multilanguage support through the Notion Languages relation and translated slugs.
- **webhooks**: Watchtower deployment webhook with Discord embed notifications.
- **discord**: Discord bot for GitHub Actions workflow-run notifications, a release webhook handler, and changelog embeds.

### Fixed

- **server**: Fastify accepts JSON, text, and urlencoded webhook payloads without duplicate parser registrations.
- **webhooks**: Removed a redundant status from the Watchtower status union.
- **transactions**: Account balances revert safely when a transaction is deleted.
- **build**: Production entrypoint points to `dist/src/main.js` and the runner image copies `prisma.config.ts` for `db push`.
- **prisma**: Datasource URL declared in `schema.prisma` so the container runtime can connect.
- **ci**: Initial version resolution works when the repository has no tags, and the GHCR image is named `guilliman`.

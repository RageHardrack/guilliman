# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **mcp**: revocable MCP access tokens (`gmcp_` prefix, high entropy, shown once at creation; only their SHA-256 hash is stored). An authenticated `ADMIN` manages them with `POST /api/v1/mcp/tokens`, `GET /api/v1/mcp/tokens`, and `DELETE /api/v1/mcp/tokens/:id`; the list never exposes the value or the hash, and revoking a foreign or missing token answers `404` and changes nothing. The new `mcp_tokens` table is created on deploy by `prisma db push` in `start:prod`; there are no migrations to run.
- **mcp**: stateless Streamable HTTP endpoint `POST /api/v1/mcp`, authenticated only with `Authorization: Bearer <MCP token>`. Each request gets a fresh server bound to the token's owner; `GET` and `DELETE` answer `405` with `Allow: POST`.

### Fixed

- **webhooks**: the GitHub signature is verified over the exact bytes GitHub sent. The JSON body parser now keeps the raw body, so a payload whose bytes differ from its re-serialized JSON (for example `1.0` or `<` escapes) is no longer rejected with 401.
- **webhooks**: a missing `GITHUB_WEBHOOK_SECRET` now rejects GitHub webhooks with 401 in every environment, not only when `NODE_ENV=production`. Local development can skip verification only with `GITHUB_WEBHOOK_ALLOW_UNSIGNED=true`, which production ignores.
- **tax**: the monthly checklist rejects a period that is not `YYYY-MM` with a 400 error, instead of silently falling back to January 2026 and reporting a malformed due date such as `2026-undefined-20`.
- **categories**: category API responses always include `taxCategory` and `taxDeductionType`, defaulting to `NONE` like the entity getters, instead of omitting them when unset.

### Changed

- **ci**: unit tests run with `test:cov`, so a pull request that drops coverage below the thresholds in `vitest.config.ts` (80/70/80/80) now fails CI.
- **tests**: branch coverage rises from 66.37% to 71.4% with behavior tests for the GitHub webhook signature guard, the SUNAT tax service, and the transaction and category entities.
- **tests**: the tax service tests pin the Prisma query arguments (user, tax category, date windows, order) and the exact tax profile returned after an update, so a query that loses its `userId` filter or a response that leaks user fields fails the suite.

- **mcp**: remote MCP access is now read-only and acts as the token's owner. The HTTP route exposes only `tique_get_fiscal_summary`, `tique_get_monthly_tax_checklist`, `tique_simulate_tax_scenario`, `tique_get_net_worth_and_liquidity`, and `tique_get_budget_audit`; the write tools are stdio-only, and the MCP user never comes from `MCP_USER_ID`, `MCP_USER_EMAIL`, or the first active `ADMIN`. A revoked, malformed, or unknown token, or an owner that is no longer an active `ADMIN`, answers `401`.

### Removed

- **mcp** (breaking): the SSE transport is gone — `GET /api/v1/mcp/sse` and `POST /api/v1/mcp/messages` are removed, replaced by the Streamable HTTP route `POST /api/v1/mcp` with an MCP access token. Clients still pointing at the SSE endpoints must be reconfigured.

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

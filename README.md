# Guilliman (NestJS Backend API & Tique MCP Server)

<a href="https://github.com/Gentleman-Programming/gentle-ai">
  <img width="220" src="https://raw.githubusercontent.com/Gentleman-Programming/gentle-ai/main/docs/assets/brand/built-with-gentle-ai.png" alt="Built with Gentle-AI" />
</a>

**Guilliman** is the central backend API and **Model Context Protocol (MCP)** server of the Lascar ecosystem. It serves REST for content management (Notion), user authentication, personal finance (accounts, transactions, budgets, subscriptions, loans), SUNAT tax settlement, and the isolated **Leon** wargaming bounded context (users, army rosters, and the 11th edition catalog). It also connects directly with AI agents (**Gemini Spark**) over `stdio` and `SSE`, and publishes deployment and release notifications to Discord. Everything is structured under **Hexagonal (Ports & Adapters) architecture**.

---

## 🛠️ Tech Stack

- **Framework**: [NestJS 11](https://nestjs.com/)
- **HTTP Adapter**: [Fastify](https://www.fastify.io/) (high performance)
- **MCP Protocol**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) + [Zod](https://zod.dev/)
- **ORM / Database**: [Prisma 7](https://www.prisma.io/) + [PostgreSQL 17](https://www.postgresql.org/) (`@prisma/adapter-pg`)
- **Architecture**: Hexagonal / Clean (`domain`, `application`, `infrastructure`)
- **Package Manager**: [Bun](https://bun.sh/)
- **Port Management**: [Portless](https://portless.org/) (`PORTLESS_PORT=1355 PORTLESS_HTTPS=0 portless run ...`)
- **Testing**: [Vitest](https://vitest.dev/)
- **API Documentation**: [OpenAPI / Swagger](https://swagger.io/) (`@nestjs/swagger` + `@fastify/swagger`)

---

## 🤖 Tique MCP Server (Gemini Spark)

The Guilliman backend ships a native MCP server that exposes 7 Tique financial and tax tools to AI agents:

### Exposed Tools

1. `tique_get_fiscal_summary`: Consolidated settlement of 4th/5th category employment income, tax credit balance, and annual DJ filing.
2. `tique_get_monthly_tax_checklist`: Monthly checklist (RHE Datincorp, 8% down payment, tax credit balance, digit-3 deadline).
3. `tique_simulate_tax_scenario`: Simulated tax impact of changes in income and deductible expenses within the 3 UIT cap.
4. `tique_get_net_worth_and_liquidity`: Multi-currency consolidation (USD, PEN, VES) of assets, liabilities, and cards.
5. `tique_get_budget_audit`: 50/30/20 budget audit and detection of small recurring expenses.
6. `tique_create_transaction`: Transaction entry with 3 UIT fiscal traceability.
7. `tique_record_debt_payment`: Payment against loans or cards with transactional consistency.

### Security and Access Control (ADMIN only)

- The MCP server requires the resolved user to have **`role === 'ADMIN'`** and **`isActive === true`**.
- The user can be specified explicitly with `MCP_USER_ID` or `MCP_USER_EMAIL` in the environment; otherwise it resolves to the first active administrator.

### Configuration for Gemini Spark (Local on macOS via Stdio)

```json
{
  "mcpServers": {
    "guilliman": {
      "command": "/Users/danielcolmenares/.bun/bin/bun",
      "args": ["run", "src/mcp-cli.ts"],
      "cwd": "/Users/danielcolmenares/Programming/personal/Lascar/guilliman",
      "env": {
        "NODE_ENV": "development",
        "DATABASE_URL": "postgresql://guilliman_user:guilliman_secret@localhost:5434/guilliman_db?schema=public",
        "MCP_USER_EMAIL": "daniel@lascar.pe"
      }
    }
  }
}
```

### Configuration for Gemini Spark (Remote in Production via HTTP / SSE)

Once Guilliman is deployed on the VPS:

- SSE endpoint: `GET /api/v1/mcp/sse`
- Messages endpoint: `POST /api/v1/mcp/messages?sessionId={id}`
- Security: requires the `Authorization: Bearer <TOKEN_ADMIN_JWT>` header

```json
{
  "mcpServers": {
    "guilliman-remote": {
      "serverUrl": "https://api.your-domain.pe/api/v1/mcp/sse",
      "headers": {
        "Authorization": "Bearer <TOKEN_ADMIN_JWT>"
      }
    }
  }
}
```

---

## 🔔 Discord Bot & GitHub Webhooks Integration

Guilliman includes a native Discord Bot module and a webhook receiver for real-time notifications about CI/CD pipeline state (GitHub Actions):

### Core Components

- **`DiscordClientService`**: Manages the `discord.js` client lifecycle, Gateway connection, reconnection, and graceful degradation when `DISCORD_BOT_TOKEN` is not configured.
- **`DiscordNotificationService`**: Sends messages and formatted embeds to specific Discord channels.
- **`WorkflowEmbedBuilder`**: Builds color-coded rich embeds (green = success, red = failure, blue = in progress, orange = timeout/alert) with links to the repository, branch, truncated commit, and duration.
- **`ReleaseEmbedBuilder`**: Builds rich embeds for release publications and changelog notes from `release` events.
- **`GithubSignatureGuard`**: Validates HMAC-SHA256 signatures (`X-Hub-Signature-256`) in constant time (`crypto.timingSafeEqual`).
- **`GithubWebhookController`**: `POST /api/v1/webhooks/github` endpoint that handles `workflow_run` and `release` events and delegates them to the corresponding Discord channels.

### Environment Variables

```env
DISCORD_BOT_TOKEN="tu_discord_bot_token"
DISCORD_NOTIFICATIONS_CHANNEL_ID="tu_canal_discord_id"
DISCORD_CHANGELOG_CHANNEL_ID="tu_canal_changelog_discord_id" # Optional: dedicated channel for releases; when unset, falls back to DISCORD_NOTIFICATIONS_CHANNEL_ID
GITHUB_WEBHOOK_SECRET="tu_github_webhook_secret"
```

### GitHub Webhooks Setup

1. In the GitHub repository, go to **Settings** -> **Webhooks** -> **Add webhook**.
2. **Payload URL**: `https://api.your-domain.com/api/v1/webhooks/github`
3. **Content type**: `application/json`
4. **Secret**: the same value configured in `GITHUB_WEBHOOK_SECRET`.
5. **Events**: choose _Let me select individual events_ and tick **Workflow runs** and **Releases**.

---

## 📖 Interactive Documentation (Swagger / OpenAPI)

Once the server is running, the interactive documentation is available at:

- **Swagger UI**: `http://guilliman.localhost:1355/api/v1/docs` (or `http://localhost:3000/api/v1/docs`)
- **OpenAPI JSON**: `http://guilliman.localhost:1355/api/v1/docs-json`

---

## 🏗️ Modules and Hexagonal Architecture

```text
src/
├── auth/               # JWT authentication, guards and roles (ADMIN, USER)
├── users/              # User and profile management
├── admin/              # Admin-only user CRUD (/admin/users)
├── accounts/           # Bank accounts, wallets, and balances
├── categories/         # Income and expense category hierarchy
├── budgets/            # Monthly per-category limits and budgets (50/30/20)
├── goals/              # Savings goals with direct deposits/withdrawals
├── loans/              # Loans and debts with payments and banking impact
├── subscriptions/      # Subscriptions and recurring payments
├── transactions/       # Transaction entry and SUNAT metadata
├── transaction-templates/ # Expense/income/transfer templates for fast entry
├── exchange-rates/     # Official SUNAT (USD→PEN) and BCV (USD→VES) rates
├── tax/                # SUNAT tax engine (4th/5th category, UIT 2026, 3 UIT)
├── mcp/                # Model Context Protocol server with ADMIN auth guard
├── leon/               # Isolated Leon bounded context (auth, admin, rosters, catalog)
├── notion/             # Notion integration (CMS) and Languages resolution (i18n)
├── discord/            # Discord bot (Gateway client, embed builders, dispatching)
├── webhooks/           # External integration webhooks (GitHub CI/CD, Watchtower)
├── blog/               # Public blog endpoints with language filtering (?lang=es|en)
├── portfolio/          # Projects and skills with language filtering (?lang=es|en)
├── about/              # Public personal/professional profile endpoints
├── links/              # Links and social networks
└── infrastructure/     # Database adapters (PrismaService)
```

### Financial Data Ownership

The `accounts`, `transactions`, `categories`, `budgets`, `savings-goals`, `loans`, `tax`, `subscriptions`, and `transaction-templates` routes require `Authorization: Bearer <JWT>`. The user always comes from the token, never from the URL or the body.

| Case                                                                                     | Response                            |
| ---------------------------------------------------------------------------------------- | ----------------------------------- |
| No token, or an invalid or expired token (the JWT lasts 7 days)                          | 401                                 |
| Another user's resource, or a missing one                                                | 404, no changes                     |
| Reference to another user's account, destination account, or category                    | 400, before writing or moving funds |
| `:userId` in the path (`loans/user/:userId`, `tax/*/:userId`) different from the token's | 403, no changes                     |

A `userId` in the query or body is still accepted for compatibility, but it is ignored.

### Transaction Templates (`/api/v1/transaction-templates`)

Per-user ready-made movements (expense, income, or transfer) for Tique's fast entry. They are not schedulable: no frequencies and no reminders. All routes require a JWT and the `userId` always comes from the token; a missing or foreign template answers 404 and changes nothing.

| Method | Route                            | Description                                                                                                        |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET    | `/transaction-templates`         | The user's templates, ordered by recent use (`lastUsedAt` descending, never used last, then `name` ascending)      |
| POST   | `/transaction-templates`         | Create a template (`name`, `type`, `accountId`, `destinationAccountId?`, `categoryId?`, `defaultAmount?`, `note?`) |
| PUT    | `/transaction-templates/:id`     | Update a template (full body)                                                                                      |
| DELETE | `/transaction-templates/:id`     | Delete a template                                                                                                  |
| POST   | `/transaction-templates/:id/use` | Mark as used: sets `lastUsedAt` to the current time                                                                |

Rules validated in the domain (400 when broken): `type` is `EXPENSE`, `INCOME`, or `TRANSFER`; `TRANSFER` requires a `destinationAccountId` different from `accountId`; `EXPENSE`/`INCOME` carry no destination account; `defaultAmount` is optional and, when present, must be a number greater than 0; `accountId` and `categoryId` must belong to the user. Transactions are still created with `POST /transactions`.

### Leon (Warhammer 40,000) Bounded Context (`/api/v1/leon`)

Leon is a separate product with its own data inside Guilliman: its users, tokens, and routes never mix with the Lascar finance ones. All of it lives under the `/api/v1/leon` prefix and uses an isolated JWT signed with claim `app: 'LEON'`, validated by `LeonJwtAuthGuard` and `LeonRolesGuard`.

| Area        | Routes                                                                                              | Access     | Description                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Auth        | `POST /leon/auth/login`                                                                             | Public     | Issues the isolated Leon token; Lascar credentials do not work here.           |
| Admin users | `GET/POST /leon/admin/users`, `PATCH /leon/admin/users/:id`, `PATCH …/:id/password`, `DELETE …/:id` | Leon ADMIN | CRUD for Leon users only.                                                      |
| Rosters     | `GET/POST /leon/rosters`, `GET/PATCH/DELETE /leon/rosters/:id`                                      | Leon JWT   | Per-user army rosters; the owner comes from the token, foreign ids answer 404. |
| Catalog     | `/leon/catalog` (see below)                                                                         | Leon JWT   | Faction packages synced from Leon's build pipeline.                            |

### Leon 11th edition catalog (`/api/v1/leon/catalog`)

Stores one catalog package per faction, produced by Leon's `build-catalog` pipeline. The API is a passthrough: it validates the package shape and keeps the whole package as JSON (`leon_catalog_factions`), while the game logic stays in Leon. Routes use the isolated Leon JWT (claim `app: 'LEON'`).

| Method | Route                        | Access     | Description                                                          |
| ------ | ---------------------------- | ---------- | -------------------------------------------------------------------- |
| GET    | `/leon/catalog`              | Leon JWT   | Index of stored factions with their metadata and `syncedAt`          |
| GET    | `/leon/catalog/factions/:id` | Leon JWT   | One faction package (`:id` is the Wahapedia faction code, e.g. `SM`) |
| POST   | `/leon/catalog/import`       | Leon ADMIN | Upsert faction packages; it never deletes factions that are missing  |

Leon's `scripts/publish-catalog.ts` uploads one faction per request and reads `LEON_API_BASE_URL`, `LEON_ADMIN_EMAIL` and `LEON_ADMIN_PASSWORD`. Create that admin with `bun run scripts/create-leon-admin.ts`.

---

## 🚀 Quick Start (Local Development)

### 1. Install dependencies

```bash
bun install
```

### 2. Start the local PostgreSQL 17 database

Inside this folder (`guilliman/`):

```bash
docker compose up -d
```

### 3. Configure Environment Variables and Sync Prisma

Create a `.env` file in `guilliman/`:

```env
DATABASE_URL="postgresql://guilliman_user:guilliman_secret@localhost:5434/guilliman_db?schema=public"
PORT=3000
```

Sync the Prisma schema with PostgreSQL:

```bash
bunx prisma db push
```

### 4. Create or Update Family Users / Administrators (CLI)

```bash
bun run create:user <email> <password> [nombre]

# Example:
bun run create:user daniel@lascar.pe miClaveSegura123 "Daniel Colmenares"
```

### 5. Historical Rate Migration for VES Transactions (CLI)

To assign reference exchange rates to bolívar transactions recorded earlier without one:

```bash
bun run migrate:rates
```

### 6. Run the API in Development with Portless

```bash
# Development with watch mode and portless (HTTP port 1355)
bun run start:dev
```

### 7. Run the MCP Server in Stdio Mode

```bash
bun run mcp:start
```

---

## 🧪 Tests and Build

```bash
# Run the unit test suite
bun test src/mcp/
bun test src/tax/

# Compile for production
bun run build
```

---

## 🌿 Branching and Releases

Guilliman follows GitFlow with two long-lived branches: `main` (production, one tag and one GHCR image per release) and `dev` (integration).

| Work                                        | Branch from | Goes back to       | Pull request |
| ------------------------------------------- | ----------- | ------------------ | ------------ |
| Feature or ordinary fix (`feat/…`, `fix/…`) | `dev`       | `dev`              | Not required |
| Hotfix (`hotfix/…`)                         | `main`      | `main`, then `dev` | Required     |
| Release                                     | `dev`       | `main`             | Required     |

- Changes reach `main` **only** through a release PR opened from `dev`; `main` is never pushed to directly.
- The version number and the release notes come from the `[Unreleased]` section of [`CHANGELOG.md`](CHANGELOG.md): the release PR moves it under a new `## [X.Y.Z] - YYYY-MM-DD` heading.
- Merging that release PR is what publishes the GHCR image and posts the changelog to Discord.

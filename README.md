# Guilliman (NestJS Backend API & Tique-MCP Server)

**Guilliman** es la API backend central y servidor **Model Context Protocol (MCP)** del ecosistema Lascar. Provee servicios REST para gestión de contenidos (Notion), autenticación de usuarios, finanzas personales (cuentas, transacciones, presupuestos, suscripciones, préstamos), liquidación tributaria (SUNAT) y conexión directa con agentes de IA (**Gemini Spark**) mediante transporte `stdio` y `SSE`, estructurado bajo **Arquitectura Hexagonal (Ports & Adapters)**.

---

## 🛠️ Stack Tecnológico

- **Framework**: [NestJS 11](https://nestjs.com/)
- **HTTP Adapter**: [Fastify](https://www.fastify.io/) (alto rendimiento)
- **Protocolo MCP**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) + [Zod](https://zod.dev/)
- **ORM / Base de Datos**: [Prisma 7](https://www.prisma.io/) + [PostgreSQL 17](https://www.postgresql.org/) (`@prisma/adapter-pg`)
- **Arquitectura**: Arquitectura Hexagonal / Limpia (`domain`, `application`, `infrastructure`)
- **Package Manager**: [Bun](https://bun.sh/)
- **Port Management**: [Portless](https://portless.org/) (`PORTLESS_PORT=1355 PORTLESS_HTTPS=0 portless run ...`)
- **Testing**: [Vitest](https://vitest.dev/)
- **Documentación API**: [OpenAPI / Swagger](https://swagger.io/) (`@nestjs/swagger` + `@fastify/swagger`)

---

## 🤖 Servidor MCP de Tique (Gemini Spark)

El backend Guilliman incluye un servidor nativo MCP que expone 7 herramientas financieras y tributarias de Tique para agentes de IA:

### Herramientas Expuestas
1. `tique_get_fiscal_summary`: Liquidación consolidada de Rentas de Trabajo 4ta/5ta categoría, saldo a favor y DJ anual.
2. `tique_get_monthly_tax_checklist`: Checklist mensual (RHE Datincorp, pago a cuenta 8%, saldo a favor, vencimiento dígito 3).
3. `tique_simulate_tax_scenario`: Simulación de impacto tributario ante variaciones de ingresos y gastos deducibles 3 UIT.
4. `tique_get_net_worth_and_liquidity`: Consolidación multimoneda (USD, PEN, VES) de activos, pasivos y tarjetas.
5. `tique_get_budget_audit`: Auditoría presupuestaria 50/30/20 y detección de gastos hormiga.
6. `tique_create_transaction`: Registro de transacciones con trazabilidad fiscal 3 UIT.
7. `tique_record_debt_payment`: Abono a préstamos o tarjetas con consistencia transaccional.

### Seguridad y Control de Acceso (Solo ADMIN)
- El servidor MCP exige que el usuario resuelto tenga **`role === 'ADMIN'`** y **`isActive === true`**.
- Se puede especificar el usuario explícito mediante `MCP_USER_ID` o `MCP_USER_EMAIL` en el entorno, o resolverá automáticamente el primer administrador activo.

### Configuración para Gemini Spark (Local en macOS vía Stdio)
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

### Configuración para Gemini Spark (Remoto en Producción vía HTTP / SSE)
Cuando Guilliman se encuentre desplegado en el VPS:
- Endpoint SSE: `GET /api/v1/mcp/sse`
- Endpoint Mensajes: `POST /api/v1/mcp/messages?sessionId={id}`
- Seguridad: Requiere cabecera `Authorization: Bearer <TOKEN_ADMIN_JWT>`

```json
{
  "mcpServers": {
    "guilliman-remote": {
      "serverUrl": "https://api.tu-dominio.pe/api/v1/mcp/sse",
      "headers": {
        "Authorization": "Bearer <TOKEN_ADMIN_JWT>"
      }
    }
  }
}
```

---

## 🔔 Integración de Discord Bot & GitHub Webhooks

Guilliman incluye un módulo nativo de Discord Bot y receptor de Webhooks para notificaciones en tiempo real del estado de pipelines CI/CD (GitHub Actions):

### Componentes Principales
- **`DiscordClientService`**: Gestiona el ciclo de vida del cliente `discord.js`, conexión al Gateway, reconexión y degradación elegante si `DISCORD_BOT_TOKEN` no está configurado.
- **`DiscordNotificationService`**: Envía mensajes y embeds formateados a canales específicos de Discord.
- **`WorkflowEmbedBuilder`**: Construye embeds enriquecidos codificados por color (Verde = éxito, Rojo = fallo, Azul = en progreso, Naranja = timeout/alerta) con enlaces al repositorio, rama, commit truncado y duración.
- **`GithubSignatureGuard`**: Valida firmas HMAC-SHA256 (`X-Hub-Signature-256`) en tiempo constante (`crypto.timingSafeEqual`).
- **`GithubWebhookController`**: Endpoint `POST /api/v1/webhooks/github` que procesa eventos `workflow_run` y delega a Discord.

### Variables de Entorno
```env
DISCORD_BOT_TOKEN="tu_discord_bot_token"
DISCORD_NOTIFICATIONS_CHANNEL_ID="tu_canal_discord_id"
GITHUB_WEBHOOK_SECRET="tu_github_webhook_secret"
```

### Configuración en GitHub Webhooks
1. En el repositorio de GitHub, navegar a **Settings** -> **Webhooks** -> **Add webhook**.
2. **Payload URL**: `https://api.tu-dominio.com/api/v1/webhooks/github`
3. **Content type**: `application/json`
4. **Secret**: La misma clave configurada en `GITHUB_WEBHOOK_SECRET`.
5. **Events**: Seleccionar *Let me select individual events* y marcar **Workflow runs**.

---

## 📖 Documentación Interactiva (Swagger / OpenAPI)

Una vez iniciado el servidor, la documentación interactiva se encuentra disponible en:

- **Swagger UI**: `http://guilliman.localhost:1355/api/v1/docs` (o `http://localhost:3000/api/v1/docs`)
- **JSON OpenAPI**: `http://guilliman.localhost:1355/api/v1/docs-json`

---

## 🏗️ Módulos y Arquitectura Hexagonal

```text
src/
├── auth/               # Autenticación JWT, guards y roles (ADMIN, USER)
├── users/              # Gestión de usuarios y perfiles
├── accounts/           # Cuentas bancarias, billeteras y saldos
├── categories/         # Jerarquía de categorías de ingresos y gastos
├── budgets/            # Límites y presupuestos mensuales por categoría (50/30/20)
├── goals/              # Metas de ahorro y depósitos/retiros directos
├── loans/              # Préstamos y deudas con amortizaciones e impacto bancario
├── subscriptions/      # Suscripciones, pagos recurrentes
├── transactions/       # Registro de transacciones y metadatos SUNAT
├── tax/                # Motor fiscal SUNAT (4ta/5ta categoría, UIT 2026, 3 UIT)
├── mcp/                # Servidor Model Context Protocol con Auth Guard ADMIN
├── notion/             # Integración con base de datos de contenidos Notion
├── discord/            # Bot de Discord (Gateway client, embed builder, dispatching)
├── webhooks/           # Webhooks de integración externa (GitHub CI/CD workflow notifications)
├── blog/               # Endpoints públicos para el Blog
├── portfolio/          # Proyectos y habilidades
├── links/              # Enlaces y redes
└── infrastructure/     # Adaptadores de base de datos (PrismaService)
```

---

## 🚀 Inicio Rápido (Desarrollo Local)

### 1. Instalación de dependencias
```bash
bun install
```

### 2. Levantar la Base de Datos PostgreSQL 17 Local
Dentro de esta carpeta (`guilliman/`):
```bash
docker compose up -d
```

### 3. Configurar Variables de Entorno y Sincronizar Prisma
Crea un archivo `.env` en `guilliman/`:
```env
DATABASE_URL="postgresql://guilliman_user:guilliman_secret@localhost:5434/guilliman_db?schema=public"
PORT=3000
```
Sincronizá el esquema de Prisma con PostgreSQL:
```bash
bunx prisma db push
```

### 4. Crear o Actualizar Usuarios Familiares / Administradores (CLI)
```bash
bun run create:user <email> <password> [nombre]

# Ejemplo:
bun run create:user daniel@lascar.pe miClaveSegura123 "Daniel Colmenares"
```

### 5. Ejecutar la API en Desarrollo con Portless
```bash
# Desarrollo con watch mode y portless (HTTP puerto 1355)
bun run start:dev
```

### 6. Ejecutar Servidor MCP en Modo Stdio
```bash
bun run mcp:start
```

---

## 🧪 Pruebas y Compilación

```bash
# Ejecutar suite de pruebas unitarias
bun test src/mcp/
bun test src/tax/

# Compilar para producción
bun run build
```

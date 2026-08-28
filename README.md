# Guilliman (NestJS Backend API)

**Guilliman** es la API backend central del ecosistema Lascar. Provee servicios REST para gestión de contenidos (Notion), autenticación de usuarios, finanzas personales (cuentas, transacciones, presupuestos, suscripciones) y lógica de negocio, estructurado bajo **Arquitectura Hexagonal (Ports & Adapters)**.

---

## 🛠️ Stack Tecnológico

- **Framework**: [NestJS 11](https://nestjs.com/)
- **HTTP Adapter**: [Fastify](https://www.fastify.io/) (alto rendimiento)
- **ORM / Base de Datos**: [Prisma 7](https://www.prisma.io/) + [PostgreSQL 17](https://www.postgresql.org/) (`@prisma/adapter-pg`)
- **Arquitectura**: Arquitectura Hexagonal / Limpia (`domain`, `application`, `infrastructure`)
- **Package Manager**: [Bun](https://bun.sh/)
- **Port Management**: [Portless](https://portless.org/) (`PORTLESS_PORT=1355 PORTLESS_HTTPS=0 portless run ...`)
- **Testing**: [Vitest](https://vitest.dev/) (100% pruebas unitarias pasando, 45/45 tests)
- **Documentación API**: [OpenAPI / Swagger](https://swagger.io/) (`@nestjs/swagger` + `@fastify/swagger`)

---

## 📖 Documentación Interactiva (Swagger / OpenAPI)

Una vez iniciado el servidor, la documentación interactiva con especificación OpenAPI y playground para probar endpoints se encuentra disponible en:

- **Swagger UI**: `http://guilliman.localhost:1355/api/v1/docs` (o `http://localhost:3000/api/v1/docs`)
- **JSON OpenAPI**: `http://guilliman.localhost:1355/api/v1/docs-json`

---

## 🏗️ Módulos y Arquitectura Hexagonal

```text
src/
├── auth/               # Autenticación JWT, guards y registro
├── users/              # Gestión de usuarios y perfiles
├── accounts/           # Cuentas bancarias, billeteras y saldos
├── categories/         # Jerarquía de categorías de ingresos y gastos
├── budgets/            # Límites y presupuestos mensuales por categoría
├── goals/              # Metas de ahorro y depósitos/retiros directos
├── loans/              # Préstamos y deudas con amortizaciones e impacto bancario
├── subscriptions/      # Suscripciones, pagos fijos recurrentes y cobros atómicos
├── transactions/       # Registro de transacciones (ingresos, gastos, transferencias)
├── notion/             # Integración con base de datos de contenidos Notion
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
Dentro de esta carpeta (`guilliman/`), ejecutá el Compose local dedicado:
```bash
docker compose up -d
```

### 3. Configurar Variables de Entorno y Sincronizar Prisma
Crea un archivo `.env` en `guilliman/` (ignorado en git):
```env
DATABASE_URL="postgresql://guilliman_user:guilliman_secret@localhost:5434/guilliman_db?schema=public"
PORT=3000
```
Sincronizá el esquema de Prisma con PostgreSQL:
```bash
bunx prisma db push
```

### 4. Crear o Actualizar Usuarios Familiares (CLI)
Dado que Tique es un sistema privado y familiar sin registro público, utiliza el script CLI para aprovisionar usuarios:
```bash
bun run create:user <email> <password> [nombre]

# Ejemplo:
bun run create:user daniel@lascar.dev miClaveSegura123 "Daniel Colmenares"
```

### 5. Ejecutar la API en Desarrollo con Portless
```bash
# Desarrollo con watch mode y portless (HTTP puerto 1355)
bun run start:dev
```

---

## 🧪 Pruebas y Compilación

```bash
# Ejecutar suite de pruebas unitarias (Vitest)
bun run test

# Compilar para producción
bun run build
```

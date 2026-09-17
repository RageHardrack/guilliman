# Changelog - Guilliman API & Bot

Todos los cambios notables en este proyecto serán documentados en este archivo siguiendo [Conventional Commits](https://www.conventionalcommits.org/).

## [v0.2.0] - 2026-09-17

### Características
- **webhooks**: soporte para eventos de release de GitHub y publicación de changelogs en Discord (`feat(webhooks)`).
- **discord**: constructor de embeds de release con notas de cambios y enlace a GitHub (`feat(discord)`).
- **blog**: soporte de i18n con relaciones de idiomas en Notion y slugs traducidos (`feat(blog)`).
- **goals**: adición de nivel de prioridad en metas de ahorro (`feat(goals)`).
- **transactions**: script de migración histórica de tasas de cambio VES (`feat(transactions)`).

### Correcciones
- **webhooks**: configuración limpia de parser de cuerpo en Fastify para webhooks de Shoutrrr/Watchtower (`fix(webhooks)`).
- **server**: eliminación de colisiones de parsers urlencoded en Fastify (`fix(server)`).

---

## [v0.1.0] - 2026-08-28

### Características
- Arquitectura Hexagonal en NestJS y Fastify.
- Modelo de base de datos PostgreSQL 17 con Prisma ORM.
- Notificaciones de despliegue en Discord mediante webhooks de GitHub Actions y Watchtower.
- Documentación OpenAPI / Swagger en `/api/v1/docs`.

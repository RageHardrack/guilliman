import type { User } from '@prisma/client';

/**
 * The identity a single MCP tool call runs as (S5). Every MCP tool reads and
 * writes strictly the data of this user, so the transport — never the tool —
 * decides who is acting: the MCP token owner over HTTP, the env / first-ADMIN
 * user over stdio. `Pick<User, 'id'>` keeps the Prisma row and the verified
 * MCP account (`{ id, email, role }`) both usable without inventing fields.
 */
export type McpActor = Pick<User, 'id'>;

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { FastifyRequest } from 'fastify';

import { McpTokenService } from '../tokens/application/mcp-token.service';

/** The shape the guard reads and writes on the MCP HTTP request. */
export interface McpAuthenticatedRequest {
  headers: FastifyRequest['headers'];
  mcpActor?: { id: string; email: string; role: string };
}

const BEARER = /^Bearer[ \t]+(\S+)[ \t]*$/i;

/**
 * Authenticates the Streamable HTTP MCP route with an MCP access token only
 * (S4). A request without a `Authorization: Bearer <token>` header is refused
 * before `McpTokenService.verify` runs, so no lookup and no tool execute; a
 * session JWT never matches the token shape, so it is refused too (S2, S5).
 */
@Injectable()
export class McpTokenAuthGuard implements CanActivate {
  constructor(private readonly tokens: McpTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<McpAuthenticatedRequest>();

    const match = BEARER.exec(request.headers.authorization ?? '');
    if (!match) {
      throw new UnauthorizedException(
        'MCP access token required in the Authorization header',
      );
    }

    const actor = await this.tokens.verify(match[1]);
    if (!actor) {
      throw new UnauthorizedException('Invalid or revoked MCP token');
    }

    request.mcpActor = actor;
    return true;
  }
}

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { FastifyReply, FastifyRequest } from 'fastify';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { McpServerFactory } from '../mcp-server.factory';
import { McpTokenAuthGuard } from '../guards/mcp-token-auth.guard';
import type { McpVerifiedAccount } from '../tokens/application/mcp-token.service';

/** Fastify request once `McpTokenAuthGuard` has run. */
type McpRequest = FastifyRequest & { mcpActor?: McpVerifiedAccount };

/** A JSON-RPC 2.0 error: the only body a refused non-POST may carry. */
interface JsonRpcErrorBody {
  jsonrpc: '2.0';
  id: null;
  error: { code: number; message: string };
}

/**
 * The whole 405 answer. A stateless server has no session to open with GET and
 * none to close with DELETE, so the MCP spec's answer is 405 with `Allow`,
 * carried here as a JSON-RPC error instead of an HTML error page.
 */
const METHOD_NOT_ALLOWED: JsonRpcErrorBody = {
  jsonrpc: '2.0',
  id: null,
  error: { code: -32000, message: 'Method not allowed.' },
};

/**
 * The MCP Streamable HTTP route (S4): stateless, so a fresh `McpServer` and a
 * fresh transport per request, bound to the user that owns the token (S5) and
 * limited to the read-only tool set (S6). It replaces the SSE controller (S7).
 * Fastify hands its raw Node streams to the transport and steps aside.
 */
@ApiTags('MCP')
@ApiBearerAuth()
@UseGuards(McpTokenAuthGuard)
@Controller('mcp')
export class McpHttpController {
  private readonly logger = new Logger(McpHttpController.name);

  constructor(private readonly serverFactory: McpServerFactory) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'MCP Streamable HTTP (stateless) con token MCP, solo lectura',
  })
  async handlePost(
    @Req() request: McpRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const actor = request.mcpActor;
    if (!actor) {
      // Unreachable behind the guard; refused here rather than run as nobody.
      throw new UnauthorizedException('MCP actor missing from the request');
    }

    const server = this.serverFactory.createServer(actor, 'read-only');
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    // The transport writes the HTTP answer itself: Fastify must not add one.
    reply.hijack();
    const raw = reply.raw;

    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      void transport.close().catch((error: unknown) => this.warn(error));
      void server.close().catch((error: unknown) => this.warn(error));
    };
    raw.once('finish', release);
    raw.once('close', release);

    try {
      await server.connect(transport);
      await transport.handleRequest(request.raw, raw, request.body);
    } catch (error) {
      this.logger.error(
        `MCP request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (!raw.headersSent) {
        raw.writeHead(HttpStatus.INTERNAL_SERVER_ERROR, {
          'content-type': 'application/json',
        });
        raw.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32603, message: 'Internal error' },
          }),
        );
      }
    } finally {
      release();
    }
  }

  @Get()
  @HttpCode(HttpStatus.METHOD_NOT_ALLOWED)
  @Header('Allow', 'POST')
  @ApiOperation({
    summary: 'GET no abre una sesión SSE: el servidor es sin estado',
  })
  handleGet(): JsonRpcErrorBody {
    return METHOD_NOT_ALLOWED;
  }

  @Delete()
  @HttpCode(HttpStatus.METHOD_NOT_ALLOWED)
  @Header('Allow', 'POST')
  @ApiOperation({
    summary: 'DELETE no cierra una sesión: el servidor es sin estado',
  })
  handleDelete(): JsonRpcErrorBody {
    return METHOD_NOT_ALLOWED;
  }

  private warn(error: unknown): void {
    this.logger.warn(
      `MCP cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

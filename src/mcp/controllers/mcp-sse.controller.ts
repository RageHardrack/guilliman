import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Query,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { Role } from '@prisma/client';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { McpServerService } from '../mcp-server.service';

@ApiTags('MCP')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('mcp')
export class McpSseController {
  private readonly logger = new Logger(McpSseController.name);
  private readonly transports = new Map<string, SSEServerTransport>();

  constructor(private readonly mcpServerService: McpServerService) {}

  @Get('sse')
  @ApiOperation({
    summary:
      'Establecer conexión SSE para transporte remoto de Gemini Spark (Admin)',
  })
  async handleSse(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const transport = new SSEServerTransport('/api/v1/mcp/messages', reply.raw);

    this.transports.set(transport.sessionId, transport);

    transport.onclose = () => {
      this.logger.log(`MCP SSE session closed: ${transport.sessionId}`);
      this.transports.delete(transport.sessionId);
    };

    await this.mcpServerService.getServerInstance().connect(transport);
    this.logger.log(`MCP SSE session connected: ${transport.sessionId}`);
  }

  @Post('messages')
  @ApiOperation({
    summary: 'Enviar mensaje JSON-RPC al servidor MCP en sesión activa (Admin)',
  })
  async handleMessages(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) reply: FastifyReply,
    @Query('sessionId') sessionId?: string,
  ) {
    const sid = sessionId || (req.query as any)?.sessionId;
    if (!sid || !this.transports.has(sid)) {
      throw new NotFoundException(
        `Sesión MCP '${sid}' no encontrada o ya cerrada.`,
      );
    }

    const transport = this.transports.get(sid)!;
    await transport.handlePostMessage(req.raw, reply.raw, req.body);
  }
}

import { Injectable, Logger } from '@nestjs/common';

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { McpAuthService } from './mcp-auth.service';
import { McpServerFactory } from './mcp-server.factory';

/**
 * The local stdio MCP server (`bun run mcp:start`, S7). Its behavior is
 * unchanged: one server for the whole process, the acting user resolved by
 * `McpAuthService` (MCP_USER_ID, MCP_USER_EMAIL, then the first active ADMIN)
 * and all seven tools registered. The HTTP route does not use this service: it
 * builds a server per request through `McpServerFactory`.
 */
@Injectable()
export class McpServerService {
  private readonly logger = new Logger(McpServerService.name);

  constructor(
    private readonly authService: McpAuthService,
    private readonly serverFactory: McpServerFactory,
  ) {}

  /**
   * Connects the stdio transport. `transport` exists so tests can link an
   * in-memory pair instead of occupying the process' own stdin and stdout.
   */
  async startStdioServer(transport?: Transport): Promise<void> {
    // Validate the Admin user exists before connecting the transport.
    const admin = await this.authService.getAdminUserContext();
    this.logger.log(
      `Starting Stdio MCP Transport for Admin user: ${admin.email} (${admin.id})`,
    );

    const server = this.serverFactory.createServer(admin, 'stdio');
    await server.connect(transport ?? new StdioServerTransport());
    this.logger.log('Guilliman Tique MCP Server connected to stdio transport.');
  }
}

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { McpServerService } from './mcp/mcp-server.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const mcpService = app.get(McpServerService);
  await mcpService.startStdioServer();
}

bootstrap().catch((err) => {
  // Stdout is reserved for JSON-RPC in MCP stdio transport; log errors to stderr
  console.error('[MCP CLI Error]:', err);
  process.exit(1);
});

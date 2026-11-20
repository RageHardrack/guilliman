import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app.module';
import { configureSwagger } from './swagger';
import { registerBodyParsers } from './body-parsers';
import {
  mcpHttpRouteUrl,
  allowBodilessMethodsOnMcpRoute,
} from './mcp/mcp-bodiless-methods.hook';

/** Every HTTP route of the API lives under this prefix. */
const GLOBAL_PREFIX = 'api/v1';

async function bootstrap() {
  const adapter = new FastifyAdapter();
  registerBodyParsers(adapter);
  // S14: the MCP route keeps its own 405 answer for GET and DELETE, whatever
  // JSON body parser the application installs.
  allowBodilessMethodsOnMcpRoute(adapter, mcpHttpRouteUrl(GLOBAL_PREFIX));

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.setGlobalPrefix(GLOBAL_PREFIX);

  configureSwagger(app, process.env);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();

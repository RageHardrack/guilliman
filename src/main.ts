import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app.module';
import { configureSwagger } from './swagger';
import { registerBodyParsers } from './body-parsers';

async function bootstrap() {
  const adapter = new FastifyAdapter();
  registerBodyParsers(adapter);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');

  configureSwagger(app, process.env);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();

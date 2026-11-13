import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app.module';
import { isSwaggerEnabled, setupSwagger } from './swagger';

async function bootstrap() {
  const adapter = new FastifyAdapter();

  adapter.useBodyParser(
    'application/json',
    false,
    {},
    (_req: any, body: any, done: any) => {
      const text = Buffer.isBuffer(body)
        ? body.toString('utf-8')
        : String(body ?? '');
      if (!text.trim()) {
        done(null, {});
        return;
      }
      try {
        const parsed = JSON.parse(text);
        done(null, parsed);
      } catch {
        done(null, text);
      }
    },
  );

  adapter.useBodyParser(
    'text/plain',
    false,
    {},
    (_req: any, body: any, done: any) => {
      const text = Buffer.isBuffer(body)
        ? body.toString('utf-8')
        : String(body ?? '');
      done(null, text);
    },
  );

  adapter.useBodyParser(
    'text/html',
    false,
    {},
    (_req: any, body: any, done: any) => {
      const text = Buffer.isBuffer(body)
        ? body.toString('utf-8')
        : String(body ?? '');
      done(null, text);
    },
  );

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

  if (isSwaggerEnabled(process.env)) {
    setupSwagger(app);
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();

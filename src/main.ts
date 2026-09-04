import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

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

  const config = new DocumentBuilder()
    .setTitle('Guilliman API')
    .setDescription('Backend API para el ecosistema Lascar y Financiapp')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Autenticación y perfil de usuario')
    .addTag('Accounts', 'Gestión de cuentas y billeteras')
    .addTag('Categories', 'Categorías de ingresos y gastos')
    .addTag('Transactions', 'Registro de movimientos financieros')
    .addTag('Blog', 'Artículos y publicaciones del blog')
    .addTag('Webhooks', 'Webhooks de integración externa (GitHub, etc.)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();

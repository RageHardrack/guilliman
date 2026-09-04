import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();
  const fastifyInstance = fastifyAdapter.getInstance();

  fastifyInstance.removeAllContentTypeParsers();
  fastifyInstance.addContentTypeParser(
    '*',
    { parseAs: 'string' },
    (_req, body, done) => {
      if (!body || typeof body !== 'string' || !body.trim()) {
        done(null, {});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        done(null, parsed);
      } catch {
        done(null, body);
      }
    },
  );

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
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

import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/v1/docs';

type SwaggerEnv = Readonly<Record<string, string | undefined>>;

/**
 * Swagger is opt-in: it is served only when SWAGGER_ENABLED is exactly
 * "true". Any other value, including an unset variable, keeps the UI and the
 * OpenAPI JSON unregistered, so production stays closed by default.
 */
export function isSwaggerEnabled(env: SwaggerEnv): boolean {
  return env.SWAGGER_ENABLED === 'true';
}

/**
 * Registers Swagger only when the flag allows it and logs the decision at
 * startup, so a near-miss value ("TRUE", "1", an empty interpolation) shows
 * up in the container logs instead of failing silently with a 404.
 * Returns whether the routes were registered.
 */
export function configureSwagger(
  app: INestApplication,
  env: SwaggerEnv,
): boolean {
  const logger = new Logger('Swagger');

  if (!isSwaggerEnabled(env)) {
    logger.log(
      `Swagger disabled: set SWAGGER_ENABLED=true to serve /${SWAGGER_PATH}`,
    );
    return false;
  }

  setupSwagger(app);
  logger.log(`Swagger enabled at /${SWAGGER_PATH}`);
  return true;
}

function setupSwagger(app: INestApplication): void {
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
  SwaggerModule.setup(SWAGGER_PATH, app, document);
}

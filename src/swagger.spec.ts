import { Test } from '@nestjs/testing';
import { Controller, Get, Logger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { configureSwagger, isSwaggerEnabled } from './swagger';

describe('isSwaggerEnabled', () => {
  it('is disabled when SWAGGER_ENABLED is unset', () => {
    expect(isSwaggerEnabled({})).toBe(false);
  });

  it('is disabled in production when the flag is unset', () => {
    expect(isSwaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it('is enabled only when SWAGGER_ENABLED is exactly "true"', () => {
    expect(isSwaggerEnabled({ SWAGGER_ENABLED: 'true' })).toBe(true);
  });

  it.each(['false', '1', 'TRUE', 'yes', ''])(
    'is disabled when SWAGGER_ENABLED is %j',
    (value) => {
      expect(isSwaggerEnabled({ SWAGGER_ENABLED: value })).toBe(false);
    },
  );
});

@Controller('ping')
class PingController {
  @Get()
  ping(): { ok: boolean } {
    return { ok: true };
  }
}

describe('configureSwagger', () => {
  let app: NestFastifyApplication | undefined;

  const bootApp = async (
    env: Readonly<Record<string, string | undefined>>,
  ): Promise<{ app: NestFastifyApplication; enabled: boolean }> => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();
    const instance = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    instance.setGlobalPrefix('api/v1');
    const enabled = configureSwagger(instance, env);
    await instance.init();
    await instance.getHttpAdapter().getInstance().ready();
    app = instance;
    return { app: instance, enabled };
  };

  const statusOf = async (
    instance: NestFastifyApplication,
    url: string,
  ): Promise<number> => {
    const response = await instance.inject({ method: 'GET', url });
    return response.statusCode;
  };

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
    app = undefined;
  });

  it('serves neither the UI nor the OpenAPI JSON when the flag is unset', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    const { app: instance, enabled } = await bootApp({
      NODE_ENV: 'production',
    });

    expect(enabled).toBe(false);
    expect(await statusOf(instance, '/api/v1/docs')).toBe(404);
    expect(await statusOf(instance, '/api/v1/docs-json')).toBe(404);
    expect(await statusOf(instance, '/api/v1/ping')).toBe(200);
    expect(log).toHaveBeenCalledWith(
      'Swagger disabled: set SWAGGER_ENABLED=true to serve /api/v1/docs',
    );
  });

  it('serves the UI and the OpenAPI JSON when SWAGGER_ENABLED is "true"', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    const { app: instance, enabled } = await bootApp({
      SWAGGER_ENABLED: 'true',
    });

    expect(enabled).toBe(true);
    expect(await statusOf(instance, '/api/v1/docs')).toBe(200);
    expect(await statusOf(instance, '/api/v1/docs-json')).toBe(200);
    expect(log).toHaveBeenCalledWith('Swagger enabled at /api/v1/docs');
  });

  it('stays closed and says so for a near-miss value such as "TRUE"', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    const { app: instance, enabled } = await bootApp({
      SWAGGER_ENABLED: 'TRUE',
    });

    expect(enabled).toBe(false);
    expect(await statusOf(instance, '/api/v1/docs-json')).toBe(404);
    expect(log).toHaveBeenCalledWith(
      'Swagger disabled: set SWAGGER_ENABLED=true to serve /api/v1/docs',
    );
  });
});

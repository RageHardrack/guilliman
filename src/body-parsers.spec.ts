import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import * as crypto from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';

import { registerBodyParsers } from './body-parsers';
import { GithubSignatureGuard } from './webhooks/guards/github-signature.guard';

const secret = 'body-parser-test-secret';

@Controller('hook')
class HookController {
  @Post()
  @HttpCode(200)
  @UseGuards(GithubSignatureGuard)
  receive(@Body() body: unknown): { received: unknown } {
    return { received: body };
  }

  @Post('echo')
  @HttpCode(200)
  echo(@Body() body: unknown): { received: unknown } {
    return { received: body };
  }
}

const sign = (payload: string): string =>
  `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;

describe('registerBodyParsers', () => {
  let app: NestFastifyApplication | undefined;

  const bootApp = async (): Promise<NestFastifyApplication> => {
    const config: Pick<ConfigService, 'get'> = {
      get: (key: string) =>
        key === 'GITHUB_WEBHOOK_SECRET' ? secret : 'production',
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [HookController],
      providers: [
        GithubSignatureGuard,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    const adapter = new FastifyAdapter();
    registerBodyParsers(adapter);
    const instance = moduleRef.createNestApplication<NestFastifyApplication>(
      adapter,
      { logger: false },
    );
    await instance.init();
    await instance.getHttpAdapter().getInstance().ready();
    app = instance;
    return instance;
  };

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('accepts a signed payload whose bytes differ from its re-serialized JSON', async () => {
    const payload =
      '{"action":"published","n":1.0,"html":"\\u003cb\\u003e","e":1e3}';
    expect(JSON.stringify(JSON.parse(payload))).not.toBe(payload);
    const instance = await bootApp();

    const response = await instance.inject({
      method: 'POST',
      url: '/hook',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': sign(payload),
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      received: { action: 'published', n: 1, html: '<b>', e: 1000 },
    });
  });

  it('rejects the same payload when the signature covers different bytes', async () => {
    const payload = '{"action":"published","n":1.0}';
    const instance = await bootApp();

    const response = await instance.inject({
      method: 'POST',
      url: '/hook',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': sign('{"action":"published","n":2.0}'),
      },
      payload,
    });

    expect(response.statusCode).toBe(401);
  });

  it('parses an empty JSON body as an empty object', async () => {
    const instance = await bootApp();

    const response = await instance.inject({
      method: 'POST',
      url: '/hook/echo',
      headers: { 'content-type': 'application/json' },
      payload: '',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: {} });
  });

  it('keeps an invalid JSON body as text', async () => {
    const instance = await bootApp();

    const response = await instance.inject({
      method: 'POST',
      url: '/hook/echo',
      headers: { 'content-type': 'application/json' },
      payload: 'not json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: 'not json' });
  });

  it.each(['text/plain', 'text/html'])(
    'passes a %s body through as text',
    async (contentType) => {
      const instance = await bootApp();

      const response = await instance.inject({
        method: 'POST',
        url: '/hook/echo',
        headers: { 'content-type': contentType },
        payload: '<p>hola</p>',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ received: '<p>hola</p>' });
    },
  );
});

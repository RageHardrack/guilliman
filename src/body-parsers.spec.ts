import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';

import * as crypto from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';

import { registerBodyParsers } from './body-parsers';
import { GithubSignatureGuard } from './webhooks/guards/github-signature.guard';
import {
  mcpHttpRouteUrl,
  allowBodilessMethodsOnMcpRoute,
} from './mcp/mcp-bodiless-methods.hook';

/** The prefix main.ts serves the API under. */
const GLOBAL_PREFIX = 'api/v1';

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

  // A bodiless method on a route that is not the MCP endpoint: its answer to an
  // empty JSON body must not move when /api/v1/mcp is special-cased.
  @Delete('echo')
  @HttpCode(200)
  remove(@Body() body: unknown): { received: unknown } {
    return { received: body };
  }
}

const sign = (payload: string): string =>
  `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;

describe('registerBodyParsers', () => {
  let app: NestFastifyApplication | undefined;

  const bootApp = async (
    productionParsers = true,
  ): Promise<NestFastifyApplication> => {
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
    if (productionParsers) {
      registerBodyParsers(adapter);
    }
    // The MCP narrow fix is installed exactly as main.ts installs it, so these
    // routes are proven against the wiring the process actually runs.
    allowBodilessMethodsOnMcpRoute(adapter, mcpHttpRouteUrl(GLOBAL_PREFIX));
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

  it('leaves an empty JSON body on a DELETE of another route as an empty object', async () => {
    const instance = await bootApp();

    const response = await instance.inject({
      method: 'DELETE',
      url: '/hook/echo',
      headers: { 'content-type': 'application/json' },
      payload: '',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: {} });
  });

  it('keeps the Fastify 400 of another route when its empty JSON body is refused', async () => {
    // Without the application parser the default one answers an empty JSON body
    // with 400. The MCP fix must not move that: the hook is keyed on the MCP
    // URL, so this route still gets the status it had before.
    const instance = await bootApp(false);

    const response = await instance.inject({
      method: 'DELETE',
      url: '/hook/echo',
      headers: { 'content-type': 'application/json' },
      payload: '',
    });

    expect(response.statusCode).toBe(400);
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

import type { FastifyAdapter } from '@nestjs/platform-fastify';

import type { FastifyRequest } from 'fastify';

/** Path of the Streamable HTTP controller, the one `McpHttpController` mounts. */
export const MCP_HTTP_CONTROLLER_PATH = 'mcp';

/** Absolute route URL, built from the application's global prefix. */
export const mcpHttpRouteUrl = (globalPrefix: string): string =>
  `/${globalPrefix.replace(/^\/+|\/+$/g, '')}/${MCP_HTTP_CONTROLLER_PATH}`;

/** The verbs this route refuses by contract: 405 with `Allow: POST`. */
const BODILESS_METHODS: ReadonlySet<string> = new Set(['GET', 'DELETE']);

/** A JSON media type, with or without parameters and with or without a suffix. */
const JSON_MEDIA_TYPE = /^application\/(?:[\w.+-]+\+)?json(?:[;\s]|$)/i;

/**
 * The request carries no payload to describe: no chunked body and no or zero
 * content length. Same shape Fastify itself uses to decide there is nothing to
 * parse, so a real body is never affected.
 */
const hasNoPayload = (request: FastifyRequest): boolean =>
  request.headers['transfer-encoding'] === undefined &&
  (request.headers['content-length'] === undefined ||
    request.headers['content-length'] === '0');

const isJson = (contentType: string | undefined): boolean =>
  contentType !== undefined && JSON_MEDIA_TYPE.test(contentType);

const routeOf = (url: string): string => url.split('?', 1)[0];

/**
 * Lets the bodiless methods of the MCP route answer 405 themselves (S14).
 *
 * A client that only wants the 405 still declares `Content-Type:
 * application/json` on a `GET` or `DELETE` with no body. Fastify then tries to
 * parse a JSON body that is not there, and its default parser answers 400
 * before the guard or the controller is ever reached. The answer belongs to the
 * route, not to a parser, so here the empty declaration is dropped — for this
 * URL and these methods only, and only while there is no payload. Every other
 * route keeps the status its body parser gives an empty JSON body today.
 */
export function allowBodilessMethodsOnMcpRoute(
  adapter: FastifyAdapter,
  routeUrl: string,
): void {
  adapter.getInstance().addHook('onRequest', (request, _reply, done) => {
    if (
      BODILESS_METHODS.has(request.method) &&
      routeOf(request.url) === routeUrl &&
      hasNoPayload(request) &&
      isJson(request.headers['content-type'])
    ) {
      delete request.headers['content-type'];
    }

    done();
  });
}

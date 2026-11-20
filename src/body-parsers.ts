import { FastifyAdapter } from '@nestjs/platform-fastify';

const toText = (body: Buffer | string | null | undefined): string =>
  Buffer.isBuffer(body) ? body.toString('utf-8') : String(body ?? '');

/**
 * Registers the application's content-type parsers.
 *
 * The JSON parser keeps the exact received bytes on `request.rawBody`, so
 * signature checks (GitHub webhooks) hash what the sender signed instead of a
 * re-serialization of the parsed body.
 */
export function registerBodyParsers(adapter: FastifyAdapter): void {
  adapter.useBodyParser('application/json', true, {}, (_req, body, done) => {
    const text = toText(body);
    if (!text.trim()) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(text));
    } catch {
      done(null, text);
    }
  });

  adapter.useBodyParser('text/plain', false, {}, (_req, body, done) => {
    done(null, toText(body));
  });

  adapter.useBodyParser('text/html', false, {}, (_req, body, done) => {
    done(null, toText(body));
  });
}
